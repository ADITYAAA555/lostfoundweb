import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  computeAttributeSimilarity,
  computeCombinedScore,
  computeLocationTimeSimilarity,
  computeTextSimilarityFallback,
  cosineSimilarityScore,
  evaluateItemPair,
  getMatchTier,
} from './src/utils/matchingEngine';
import { calculateRewardAward } from './src/utils/xpEngine';
import type { CampusUser, ItemReport, RewardTransaction, SmartMatch } from './src/types/campusfind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseDataUri(dataUri?: string): { mimeType: string; data: string } | null {
  if (!dataUri || !dataUri.startsWith('data:')) return null;
  const match = dataUri.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function buildItemEmbeddingText(item: Pick<ItemReport, 'title' | 'category' | 'brand' | 'color' | 'description' | 'location'>): string {
  return `${item.title}. Category: ${item.category}. Brand: ${item.brand || 'Unbranded'}. Color: ${item.color}. Location: ${item.location}. Description: ${item.description}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    const geminiConfigured = Boolean(getGeminiClient());
    res.json({ ok: true, geminiConfigured, timestamp: new Date().toISOString() });
  });

  app.get('/api/ai/status', (_req, res) => {
    const geminiConfigured = Boolean(getGeminiClient());
    res.json({
      geminiConfigured,
      visionModel: 'gemini-4-hydrogen',
      embeddingModel: 'gemini-embedding-2',
      mode: geminiConfigured ? 'gemini-live' : 'deterministic-fallback',
    });
  });

  app.post('/api/ai/analyze-image', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        ok: false,
        code: 'GEMINI_NOT_CONFIGURED',
        error: 'Gemini API key is not configured on the server. Enter details manually or add GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    const { imageDataUrl, mimeType: rawMime } = req.body as { imageDataUrl?: string; mimeType?: string };
    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      res.status(400).json({ ok: false, error: 'Image data is required.' });
      return;
    }

    const parsed = parseDataUri(imageDataUrl);
    if (!parsed) {
      res.status(400).json({ ok: false, error: 'Provide a valid base64 JPEG, PNG, or WebP image.' });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: rawMime || parsed.mimeType,
                data: parsed.data,
              },
            },
            {
              text: 'Analyze this lost-or-found campus item photograph. Extract a concise item title, the closest category (Electronics, Wallets & Cards, ID & Access, Bottles & Drinkware, Books & Notebooks, Bags & Backpacks, Accessories & Watches, Keys, Clothing, Other), visible brand (or Unbranded), primary color, objective public description (without guessing private secrets), one suggested private verification question an owner could answer, and whether this appears to be a valuable item recommended for security desk handover.',
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              brand: { type: Type.STRING },
              color: { type: Type.STRING },
              description: { type: Type.STRING },
              suggestedPrivatePrompt: { type: Type.STRING },
              isValuable: { type: Type.BOOLEAN },
            },
            required: ['title', 'category', 'brand', 'color', 'description', 'isValuable'],
          },
        },
      });

      const parsedJson = JSON.parse((response.text ?? '{}').trim());
      res.json({ ok: true, extracted: parsedJson, model: 'gemini-4-hydrogen' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gemini vision request failed.';
      res.status(502).json({ ok: false, error: message });
    }
  });

  app.post('/api/ai/match-items', async (req, res) => {
    const { sourceItem, candidates } = req.body as {
      sourceItem?: ItemReport;
      candidates?: ItemReport[];
    };

    if (!sourceItem || !Array.isArray(candidates)) {
      res.status(400).json({ ok: false, error: 'sourceItem and candidates array are required.' });
      return;
    }

    const oppositeType = sourceItem.type === 'lost' ? 'found' : 'lost';
    const eligible = candidates.filter(
      (c) =>
        c.type === oppositeType &&
        c.itemId !== sourceItem.itemId &&
        c.status !== 'Returned' &&
        c.status !== 'Closed'
    );

    if (eligible.length === 0) {
      res.json({ ok: true, mode: getGeminiClient() ? 'gemini-live' : 'deterministic-fallback', matches: [] });
      return;
    }

    const ai = getGeminiClient();

    if (!ai) {
      const fallbackMatches = eligible
        .map((c) => {
          const m = sourceItem.type === 'lost' ? evaluateItemPair(sourceItem, c) : evaluateItemPair(c, sourceItem);
          return m;
        })
        .filter((m) => m.combinedScore >= 30)
        .sort((a, b) => b.combinedScore - a.combinedScore);

      res.json({
        ok: true,
        mode: 'deterministic-fallback',
        notice: 'GEMINI_API_KEY not configured; computed using deterministic lexical, attribute, and campus location-time scoring.',
        matches: fallbackMatches,
      });
      return;
    }

    try {
      // Batch embed texts via gemini-embedding-2
      const itemsToEmbed = [sourceItem, ...eligible];
      const textInputs = itemsToEmbed.map(buildItemEmbeddingText);

      const embedResult = await ai.models.embedContent({
        model: 'gemini-embedding-2',
        contents: textInputs,
      });

      const embeddings = embedResult.embeddings ?? [];
      const sourceTextVec = embeddings[0]?.values ?? [];

      // Also embed inline data-URI images if available on source & candidates
      let sourceImgVec: number[] | undefined = sourceItem.imageEmbedding;
      const sourceParsedImg = parseDataUri(sourceItem.imageURL);
      if (!sourceImgVec && sourceParsedImg) {
        const imgEmb = await ai.models.embedContent({
          model: 'gemini-embedding-2',
          contents: [{ inlineData: sourceParsedImg }],
        });
        sourceImgVec = imgEmb.embeddings?.[0]?.values;
      }

      const matches: SmartMatch[] = [];

      for (let idx = 0; idx < eligible.length; idx += 1) {
        const candidate = eligible[idx];
        const candTextVec = embeddings[idx + 1]?.values ?? [];

        const lost = sourceItem.type === 'lost' ? sourceItem : candidate;
        const found = sourceItem.type === 'lost' ? candidate : sourceItem;

        const textScore =
          sourceTextVec.length > 0 && candTextVec.length > 0
            ? cosineSimilarityScore(sourceTextVec, candTextVec)
            : computeTextSimilarityFallback(lost, found);

        let candImgVec: number[] | undefined = candidate.imageEmbedding;
        const candParsedImg = parseDataUri(candidate.imageURL);
        if (!candImgVec && candParsedImg && sourceImgVec?.length) {
          const imgEmb = await ai.models.embedContent({
            model: 'gemini-embedding-2',
            contents: [{ inlineData: candParsedImg }],
          });
          candImgVec = imgEmb.embeddings?.[0]?.values;
        }

        const attrResult = computeAttributeSimilarity(lost, found);
        const locTimeResult = computeLocationTimeSimilarity(lost, found);

        const imageScore =
          sourceImgVec?.length && candImgVec?.length
            ? cosineSimilarityScore(sourceImgVec, candImgVec)
            : lost.imageURL && found.imageURL
              ? Math.round(attrResult.score * 0.55)
              : 0;

        const combinedScore = computeCombinedScore({
          textScore,
          imageScore,
          attributeScore: attrResult.score,
          locationTimeScore: locTimeResult.score,
        });

        const reasons = Array.from(
          new Set([
            ...attrResult.reasons,
            ...locTimeResult.reasons,
            ...(textScore >= 65 ? [`Semantic Gemini embedding similarity (${textScore}%)`] : []),
            ...(sourceImgVec?.length && candImgVec?.length && imageScore >= 65
              ? [`Visual embedding similarity (${imageScore}%)`]
              : []),
          ])
        ).slice(0, 6);

        if (combinedScore >= 30) {
          matches.push({
            matchId: `match_${lost.itemId}_${found.itemId}`,
            lostItemId: lost.itemId,
            foundItemId: found.itemId,
            lostOwnerId: lost.reportedBy,
            foundReporterId: found.reportedBy,
            textScore,
            imageScore,
            attributeScore: attrResult.score,
            locationTimeScore: locTimeResult.score,
            combinedScore,
            tier: getMatchTier(combinedScore),
            reasons: reasons.length > 0 ? reasons : ['Semantic & attribute comparison'],
            aiMode: 'gemini-live',
            status: 'pending',
            createdAt: new Date().toISOString(),
          });
        }
      }

      matches.sort((a, b) => b.combinedScore - a.combinedScore);
      res.json({ ok: true, mode: 'gemini-live', matches });
    } catch (error) {
      // Fallback cleanly but mark mode explicitly as deterministic-fallback with notice
      const fallbackMatches = eligible
        .map((c) => (sourceItem.type === 'lost' ? evaluateItemPair(sourceItem, c) : evaluateItemPair(c, sourceItem)))
        .filter((m) => m.combinedScore >= 30)
        .sort((a, b) => b.combinedScore - a.combinedScore);

      res.json({
        ok: true,
        mode: 'deterministic-fallback',
        notice: error instanceof Error ? `Gemini embedding fallback: ${error.message}` : 'Gemini embedding unavailable.',
        matches: fallbackMatches,
      });
    }
  });

  app.post('/api/rewards/calculate', (req, res) => {
    const { user, eventType, itemId, itemTitle, existingRewards } = req.body as {
      user?: CampusUser;
      eventType?: 'found_report' | 'successful_return';
      itemId?: string;
      itemTitle?: string;
      existingRewards?: RewardTransaction[];
    };

    if (!user || !eventType || !itemId || !itemTitle) {
      res.status(400).json({ ok: false, error: 'Missing required reward evaluation fields.' });
      return;
    }

    const result = calculateRewardAward({
      user,
      eventType,
      itemId,
      itemTitle,
      existingRewards: Array.isArray(existingRewards) ? existingRewards : [],
    });

    res.json({ ok: true, result });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CampusFind server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

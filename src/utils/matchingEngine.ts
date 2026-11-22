import type { ItemReport, MatchTier, SmartMatch } from '../types/campusfind';

export function clampScore(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.max(0, Math.min(100, Math.round(val)));
}

/**
 * Computes normalized 0-100 cosine similarity between two numeric vectors.
 * Cosine similarity in [-1, 1] is mapped smoothly to [0, 100] (clamped at >= 0 for positive semantic spaces).
 */
export function cosineSimilarityScore(vecA?: number[], vecB?: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < vecA.length; i += 1) {
    const a = vecA[i];
    const b = vecB[i];
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }

  if (magA === 0 || magB === 0) return 0;
  const rawCosine = dot / (Math.sqrt(magA) * Math.sqrt(magB));
  return clampScore(rawCosine * 100);
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'near', 'by', 'is', 'was', 'it', 'my', 'i', 'lost', 'found', 'item',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

/**
 * Deterministic semantic-token fallback when vector embeddings are unavailable.
 */
export function computeTextSimilarityFallback(itemA: Pick<ItemReport, 'title' | 'description' | 'category' | 'brand' | 'color'>, itemB: Pick<ItemReport, 'title' | 'description' | 'category' | 'brand' | 'color'>): number {
  const textA = `${itemA.title} ${itemA.category} ${itemA.brand || ''} ${itemA.color} ${itemA.description}`;
  const textB = `${itemB.title} ${itemB.category} ${itemB.brand || ''} ${itemB.color} ${itemB.description}`;

  const tokensA = new Set(tokenize(textA));
  const tokensB = new Set(tokenize(textB));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection += 1;
  }

  // Dice-Sorensen similarity rewards shared domain keywords without over-penalizing description length differences
  const dice = (2 * intersection) / (tokensA.size + tokensB.size);
  return clampScore(dice * 100);
}

const COLOR_SYNONYMS: Record<string, string[]> = {
  black: ['black', 'charcoal', 'dark', 'matte black', 'onyx'],
  blue: ['blue', 'navy', 'cobalt', 'royal', 'teal', 'indigo', 'sky'],
  white: ['white', 'ivory', 'cream', 'pearl', 'off-white'],
  silver: ['silver', 'grey', 'gray', 'metallic', 'stainless', 'aluminum'],
  brown: ['brown', 'tan', 'leather', 'camel', 'chestnut'],
  red: ['red', 'crimson', 'maroon', 'burgundy'],
  green: ['green', 'olive', 'emerald', 'sage'],
};

function normalizeColorFamily(color: string): string {
  const clean = color.trim().toLowerCase();
  for (const [family, variants] of Object.entries(COLOR_SYNONYMS)) {
    if (variants.some((v) => clean.includes(v))) {
      return family;
    }
  }
  return clean;
}

export function computeAttributeSimilarity(
  itemA: Pick<ItemReport, 'category' | 'color' | 'brand'>,
  itemB: Pick<ItemReport, 'category' | 'color' | 'brand'>
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const catA = itemA.category.trim().toLowerCase();
  const catB = itemB.category.trim().toLowerCase();
  if (catA && catB && catA === catB) {
    score += 50;
    reasons.push(`Same category (${itemA.category})`);
  }

  const colA = normalizeColorFamily(itemA.color || '');
  const colB = normalizeColorFamily(itemB.color || '');
  if (colA && colB) {
    if (itemA.color.trim().toLowerCase() === itemB.color.trim().toLowerCase()) {
      score += 30;
      reasons.push(`Exact color match (${itemA.color})`);
    } else if (colA === colB) {
      score += 22;
      reasons.push(`Similar color family (${colA})`);
    }
  }

  const brandA = (itemA.brand || '').trim().toLowerCase();
  const brandB = (itemB.brand || '').trim().toLowerCase();
  if (brandA && brandB && brandA !== 'unbranded' && brandB !== 'unbranded') {
    if (brandA === brandB) {
      score += 20;
      reasons.push(`Matching brand (${itemA.brand})`);
    } else if (brandA.includes(brandB) || brandB.includes(brandA)) {
      score += 14;
      reasons.push(`Related brand (${itemA.brand} / ${itemB.brand})`);
    }
  } else if (!brandA && !brandB) {
    // Neutral when both are unbranded
    score += 10;
  }

  return { score: clampScore(score), reasons };
}

export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function computeLocationTimeSimilarity(
  lost: Pick<ItemReport, 'location' | 'latitude' | 'longitude' | 'eventDate'>,
  found: Pick<ItemReport, 'location' | 'latitude' | 'longitude' | 'eventDate'>
): { score: number; reasons: string[] } {
  const reasons: string[] = [];

  // Location component (0 - 60 points)
  let locationPts = 0;
  const locA = lost.location.trim().toLowerCase();
  const locB = found.location.trim().toLowerCase();
  if (locA === locB) {
    locationPts = 60;
    reasons.push(`Same campus location (${lost.location})`);
  } else if (
    Number.isFinite(lost.latitude) &&
    Number.isFinite(lost.longitude) &&
    Number.isFinite(found.latitude) &&
    Number.isFinite(found.longitude)
  ) {
    const meters = haversineDistanceMeters(lost.latitude, lost.longitude, found.latitude, found.longitude);
    if (meters <= 150) {
      locationPts = 52;
      reasons.push(`Adjacent campus zone (~${Math.round(meters)}m apart)`);
    } else if (meters <= 400) {
      locationPts = 36;
      reasons.push(`Nearby campus area (~${Math.round(meters)}m apart)`);
    } else if (meters <= 800) {
      locationPts = 20;
    } else {
      locationPts = 8;
    }
  }

  // Time component (0 - 40 points)
  let timePts = 20;
  const tLost = Date.parse(lost.eventDate);
  const tFound = Date.parse(found.eventDate);
  if (Number.isFinite(tLost) && Number.isFinite(tFound)) {
    const diffHours = (tFound - tLost) / (1000 * 60 * 60);
    const absHours = Math.abs(diffHours);
    if (diffHours >= -2 && diffHours <= 48) {
      // Found shortly after lost
      timePts = 40;
      reasons.push('Reported within 48 hours of loss');
    } else if (absHours <= 24 * 5) {
      timePts = 28;
      reasons.push('Reported within 5 days');
    } else if (absHours <= 24 * 14) {
      timePts = 15;
    } else {
      timePts = 5;
    }
  }

  return { score: clampScore(locationPts + timePts), reasons };
}

export function getMatchTier(combinedScore: number): MatchTier {
  if (combinedScore >= 80) return 'Strong potential match';
  if (combinedScore >= 60) return 'Possible match';
  return 'Low priority';
}

export function computeCombinedScore(parts: {
  textScore: number;
  imageScore: number;
  attributeScore: number;
  locationTimeScore: number;
}): number {
  const t = clampScore(parts.textScore);
  const img = clampScore(parts.imageScore);
  const attr = clampScore(parts.attributeScore);
  const lt = clampScore(parts.locationTimeScore);

  const weighted = t * 0.35 + img * 0.30 + attr * 0.20 + lt * 0.15;
  return clampScore(weighted);
}

/**
 * Evaluates a pair of (lost, found) items into a complete SmartMatch payload.
 * When real Gemini embeddings are provided on the items, cosine similarity is used.
 * Otherwise, text similarity falls back deterministically to token overlap and image similarity
 * reflects whether visual embeddings were available.
 */
export function evaluateItemPair(
  lost: ItemReport,
  found: ItemReport,
  options?: {
    aiMode?: 'gemini-live' | 'deterministic-fallback';
    extraReasons?: string[];
  }
): SmartMatch {
  const hasTextVecs = Boolean(lost.textEmbedding?.length && found.textEmbedding?.length);
  const hasImgVecs = Boolean(lost.imageEmbedding?.length && found.imageEmbedding?.length);

  const textScore = hasTextVecs
    ? cosineSimilarityScore(lost.textEmbedding, found.textEmbedding)
    : computeTextSimilarityFallback(lost, found);

  const attrResult = computeAttributeSimilarity(lost, found);
  const locTimeResult = computeLocationTimeSimilarity(lost, found);

  // If image embeddings exist on both items, use real cosine similarity; otherwise 0 (and note text/attribute mode)
  const imageScore = hasImgVecs
    ? cosineSimilarityScore(lost.imageEmbedding, found.imageEmbedding)
    : lost.imageURL && found.imageURL && !hasImgVecs
      ? Math.round(attrResult.score * 0.5) // Visual attribute proxy only when embeddings are unavailable
      : 0;

  const combinedScore = computeCombinedScore({
    textScore,
    imageScore,
    attributeScore: attrResult.score,
    locationTimeScore: locTimeResult.score,
  });

  const reasons = [
    ...attrResult.reasons,
    ...locTimeResult.reasons,
    ...(textScore >= 65 ? [`High semantic description similarity (${textScore}%)`] : []),
    ...(hasImgVecs && imageScore >= 65 ? [`Visual embedding similarity (${imageScore}%)`] : []),
    ...(options?.extraReasons ?? []),
  ];

  const uniqueReasons = Array.from(new Set(reasons)).slice(0, 6);
  const aiMode = options?.aiMode ?? (hasTextVecs ? 'gemini-live' : 'deterministic-fallback');

  return {
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
    reasons: uniqueReasons.length > 0 ? uniqueReasons : ['Partial category or keyword overlap'],
    aiMode,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

export function findCandidateMatches(
  source: ItemReport,
  pool: ItemReport[],
  minScore = 35
): SmartMatch[] {
  const oppositeType = source.type === 'lost' ? 'found' : 'lost';
  const activePool = pool.filter(
    (item) =>
      item.type === oppositeType &&
      item.itemId !== source.itemId &&
      item.status !== 'Returned' &&
      item.status !== 'Closed'
  );

  return activePool
    .map((candidate) =>
      source.type === 'lost' ? evaluateItemPair(source, candidate) : evaluateItemPair(candidate, source)
    )
    .filter((m) => m.combinedScore >= minScore)
    .sort((a, b) => b.combinedScore - a.combinedScore);
}

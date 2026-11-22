# CampusFind — AI-Powered Campus Lost & Found Platform

**Tagline:** *"Lost something? Find it here."*

CampusFind is a full-stack, AI-powered digital Lost and Found platform designed for universities, colleges, and schools. It combines multimodal Gemini AI item extraction and semantic embedding matching with strict privacy boundaries, university security custody management, and a Good Samaritan XP reward system.

---

## Folder Structure

```text
├── server.ts                       # Express backend + Gemini Vision & Embedding matching API + Vite middleware
├── firebase-blueprint.json         # Firestore intermediate data model schema
├── firestore.rules                 # Hardened Zero-Trust Firestore security rules
├── eslint.config.js                # ESLint config for @firebase/eslint-plugin-security-rules
├── src/
│   ├── firebase.ts                 # Firebase SDK initialization & structured error handler
│   ├── types/campusfind.ts         # Shared domain TypeScript interfaces
│   ├── utils/
│   │   ├── matchingEngine.ts       # Weighted AI matching formula & cosine similarity
│   │   ├── xpEngine.ts             # Good Samaritan XP, badge unlocking, duplicate prevention
│   │   └── validation.ts           # Input/file validation, status transitions & privacy sanitizer
│   ├── data/
│   │   ├── campusLocations.ts      # Campus buildings, security desks & reward catalog
│   │   └── demoSeed.ts             # Isolated Demo Sandbox seed records & accounts
│   ├── context/AppContext.tsx      # Unified state provider (Demo Sandbox + Live Firebase)
│   ├── components/                 # Navbar, AppShell, ItemCard, ItemDetailModal, ErrorBoundary
│   └── pages/                      # All 19+ Student, Admin, Security & Public screens
```

---

## AI Smart Matching Formula

Every lost/found item pair is evaluated using component scores normalized from `0` to `100`:

```text
FINAL SCORE =
  (Text Similarity × 0.35) +
  (Image Similarity × 0.30) +
  (Attribute Similarity × 0.20) +
  (Location & Time Similarity × 0.15)
```

- **80–100**: Strong potential match
- **60–79**: Possible match
- **Below 60**: Low priority

When `GEMINI_API_KEY` is configured on the server, `/api/ai/analyze-image` uses `gemini-4-hydrogen` for structured photo extraction and `/api/ai/match-items` uses `gemini-embedding-2` for multimodal semantic embeddings. When `GEMINI_API_KEY` is not configured, the engine explicitly labels itself as running in **Deterministic Fallback Mode** so scores are never misrepresented.

---

## Environment Variables (`.env.example`)

- `GEMINI_API_KEY`: Server-side Gemini API key (configured via AI Studio **Settings > Secrets**; never exposed to the browser).
- `APP_URL`: Hosted application URL.

---

## Demo Accounts (Controlled Sandbox Mode)

Demo data is isolated in browser `localStorage` (`isDemo: true`) and never mixes with live Firestore production records. You can reset demo data anytime via the **Reset Demo** button.

- **Student**: `maya.lin@campus.edu` (Maya Lin · Computer Science)
- **Security Staff**: `marcus.cole@campus.edu` (Officer Marcus Cole · Campus Security)
- **Administrator**: `elena.vance@campus.edu` (Dr. Elena Vance · Administration)

---

## Local Development, Tests & Deployment

1. **Install dependencies**: `npm install`
2. **Run pure-logic unit tests**:
   ```bash
   npx --yes tsx --test src/utils/matchingEngine.test.ts src/utils/xpEngine.test.ts src/utils/validation.test.ts
   ```
3. **Lint Firestore security rules**:
   ```bash
   npx eslint firestore.rules
   ```
4. **Run full-stack dev server (port 3000)**:
   ```bash
   npm run dev
   ```
5. **Production build & start**:
   ```bash
   npm run build
   npm start
   ```

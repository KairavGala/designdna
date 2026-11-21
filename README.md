# DesignDNA

**Website Visual Intelligence** — *Deconstruct any website. Discover its visual DNA.*

DesignDNA turns static website screenshots into structured, inspectable design systems. It pairs deterministic in-browser pixel measurement with server-side Gemini visual interpretation to produce normalised semantic design tokens, interactive region and motif exploration, a consolidated Design Anatomy Board, a multi-format Developer Export Suite, and side-by-side Design Comparison.

---

## Supported Capabilities

- **Screenshot Validation & Preview**: Client-side verification of `PNG`, `JPG`, and `WEBP` screenshots (up to 10 MB) including MIME checks, binary magic-byte header validation, and intrinsic pixel decoding.
- **Measured Colour Extraction**: Local HTML5 Canvas pixel sampling and perceptual clustering producing dominant HEX/RGB/HSL palettes, proportional coverage bars, and measurement reliability metrics.
- **AI Visual Interpretation**: Server-side Gemini analysis (`/api/analyze/visual`) producing semantic colour roles, typographic hierarchy estimates, spacing rhythm, component patterns, layout geometry, elevation/effects, annotated regions, motifs, and recurring visual patterns.
- **Normalised Design Tokens**: Deterministic token engine reconciling measured colours with AI-inferred semantic roles while preserving explicit provenance (`Measured`, `AI-Inferred`, `Derived`), confidence levels, and evidence.
- **Overview Dashboard**: Unified workspace metrics, provenance breakdown, live specimen preview built strictly from extracted tokens, and direct section navigation.
- **Interactive Visual Investigation Explorer**: Zoomable/pannable screenshot canvas with toggleable region, motif, and component bounding-box layers, real PNG screenshot crops, and per-region pixel colour sampling.
- **Design Anatomy Board**: Single-page visual dossier uniting visual identity, colour anatomy, typography specimens, cropped patterns/motifs/components, proportional layout wireframe, and surface/effect language.
- **Developer Export Suite**: Client-side preview and download of validated CSS Custom Properties (`.css`), structured JSON tokens (`.json`), Markdown anatomy report (`.md`), dark-theme multi-page PDF dossier (`.pdf`), cropped visual assets (`.zip`), and complete analysis bundle (`.zip`).
- **Side-by-Side Comparison Workspace**: Isolated in-memory Design A / Design B comparison with synced or independent scrolling, 9-dimension visual identity matrix, CIE76 Lab perceptual colour comparison, typography comparison, conservative crop pairing, neutral difference intelligence, and evidence-backed refinement insights.

---

## Architecture

- **Frontend (`client/`)**: React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide React, Zod, `fflate` (ZIP), `jsPDF` (PDF), HTML5 Canvas API.
- **Backend (`server/`)**: Node.js, Express 5, TypeScript, Zod, `@google/genai` (Gemini API isolated strictly server-side).
- **Workspace Layout**: npm workspaces (`client`, `server`) with unified single-port production serving (`server/dist/index.js` serves both `/api/*` and the compiled SPA from `client/dist/`).
- **Privacy & Local-First Model**: Screenshots and analysis results live strictly in browser memory for the active session. DesignDNA does not use databases, `localStorage`, `sessionStorage`, user accounts, or persistent screenshot storage.

```text
.
├── client/                  # React + Vite frontend workspace
│   └── src/
│       ├── components/      # Modular UI, dashboard, investigation, anatomy, export, comparison
│       ├── hooks/           # Upload, Canvas colour extraction, Gemini API, investigation, compare slots
│       ├── pages/           # Application workspace views
│       ├── services/        # Pixel processing, token normalisation, anatomy, exports, comparison
│       ├── types/           # TypeScript domain contracts
│       └── utils/           # Magic-byte & dimension validation
├── server/                  # Express 5 + Gemini API backend workspace
│   └── src/
│       ├── config/          # Zod-validated environment configuration
│       ├── controllers/     # /api/health and /api/analyze/visual handlers
│       ├── middleware/      # Structured error handling and redaction
│       ├── routes/          # API router with JSON 404 fallback
│       ├── schemas/         # Request & response Zod schemas (including base64 magic-byte checks)
│       └── services/        # Server-side @google/genai client and structured interpretation pipeline
├── .env.example             # Environment variable template (placeholders only)
└── package.json             # Root npm workspace scripts
```

---

## Prerequisites

- **Node.js** `v20+` (tested on Node `v22+`)
- **npm** `v10+` (or **Bun** `v1.2+`)
- A **Google Gemini API key** (required only for AI Visual Interpretation; measured colour extraction works completely offline in the browser)

---

## Local Setup & Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` (in the project root or `server/.env`) and set your server-side Gemini API key:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | No | `5000` | Port for the Express backend (and unified production server). |
| `NODE_ENV` | No | `development` | Runtime mode (`development`, `production`, or `test`). |
| `GEMINI_API_KEY` | Yes (for AI analysis) | — | Server-side Google Gemini API key. Never expose to the browser or commit to Git. |
| `GEMINI_MODEL` | No | `gemini-3.1-flash-lite` | Optional Gemini model override used by `/api/analyze/visual`. |
| `API_PORT` | No (dev only) | `5000` | Backend port used by Vite's `/api` dev proxy (`npm run dev`). |

### 3. Run Development Servers

Starts the Express backend (`http://localhost:5000`) and Vite frontend (`http://localhost:3000`, proxying `/api/*` to the backend):

```bash
npm run dev
```

- **App URL**: `http://localhost:3000`
- **Backend Health Check**: `http://localhost:5000/api/health`
- **Proxied Health Check**: `http://localhost:3000/api/health`

### 4. Type Checking & Validation

```bash
npm run type-check
```

---

## Production Build & Deployment

DesignDNA compiles into a single Node.js production server that serves both the `/api/*` endpoints and the compiled frontend bundle (including SPA fallback routing for non-API `GET` requests).

### 1. Build Frontend and Backend

```bash
npm run build
```

This runs:
- `client`: `tsc && vite build` → `client/dist/`
- `server`: `tsc` → `server/dist/`

### 2. Start Unified Production Server

```bash
NODE_ENV=production PORT=3000 GEMINI_API_KEY="your-key-here" npm start
```

- Serves the compiled SPA at `http://localhost:3000/`
- Serves live health telemetry at `http://localhost:3000/api/health`
- Serves AI visual interpretation at `POST /api/analyze/visual`

### 3. Deploying on Vercel (Services)

The repository includes a root `vercel.json` configured for **Vercel Services**:

- `client` (`root: "client"`, `framework: "vite"`) serves the frontend at `/(.*)`.
- `server` (`root: "server"`, `framework: "express"`, `entrypoint: "src/app.ts"`) serves `/api/(.*)` with a configured `maxDuration` of `60` seconds for AI screenshot analysis requests.

Test both services locally together with:

```bash
vercel dev
```

Set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) in your Vercel Project Environment Variables before deploying.

### 4. Standalone Node.js Deployment Checklist

1. Configure `GEMINI_API_KEY` as a private server secret in your hosting platform (e.g., Cloud Run, Render, Fly.io, Railway, or Docker secret manager).
2. Set `NODE_ENV=production` and let your platform inject `PORT` (Express binds to `0.0.0.0:$PORT`).
3. Build with `npm run build` and start with `npm start` (`node server/dist/index.js`).
4. Point your platform's health probe to `GET /api/health` (expects HTTP `200` with `{ "status": "ok" }`).

---

## Screenshot-Only Analysis Limitations

DesignDNA operates strictly on static website screenshots—it does **not** crawl live URLs, read DOM trees, or parse external stylesheets. Users should keep these methodological boundaries in mind:

- **Measured vs. Inferred Data**: Pixel dimensions, dominant HEX/RGB/HSL colours, coverage percentages, CIE76 Lab distances, and cropped element PNGs are measured directly from image pixels. Semantic colour roles, font family classifications, pixel sizes, spacing scales, bounding boxes, and design style classifications are AI visual estimates and are always labelled with provenance and confidence.
- **Hidden States & Interactions**: Hover/focus states, animations, responsive breakpoints outside the captured viewport, web-font license names, and CSS variables not visible in the static screenshot cannot be measured directly.
- **Session-Scoped Memory**: All uploaded screenshots, analyses, and comparison slots reside only in browser memory and reset on full page reload.
- **Export Scope**: Generated exports reflect the current session's measured and inferred findings and never include server credentials or hidden environment data.

# DesignDNA

DesignDNA is an AI-powered visual design system extraction application. It converts website screenshots into structured, reusable design systems (colours, typography, spacing, component styles, layout patterns, and design tokens).

## Architecture

- **Frontend:** React + TypeScript + Vite + Tailwind CSS v4 + Lucide React
- **Backend:** Node.js + Express 5 + TypeScript
- **Package Management:** npm workspaces (`client`, `server`)
- **Image Processing:** Browser Canvas API (deterministic colour extraction & pixel analysis)
- **AI Engine (Upcoming):** Google Gemini Flash via `@google/genai`
- **Validation:** Zod schemas
- **Deployment:** Unified single-port deployment (Express serves compiled frontend and `/api` routes)

## Prerequisites

- Node.js `v20+` or `v24+`
- npm `v10+` or `v11+`

## Getting Started

### 1. Installation

Install all workspace dependencies from the root directory:

```bash
npm install
```

### 2. Environment Setup

Copy `.env.example` to `server/.env`:

```bash
cp .env.example server/.env
```

Note: For Milestone 1 (M1), no Gemini API key is required. The server runs with default development settings (`PORT=5000`).

### 3. Development Mode

Start both the backend (Express on port 5000) and frontend (Vite on port 5173 with proxy) simultaneously:

```bash
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend Health Check: [http://localhost:5000/api/health](http://localhost:5000/api/health)
- Frontend Proxied Health Check: [http://localhost:5173/api/health](http://localhost:5173/api/health)

### 4. Type Checking

Validate TypeScript types across both frontend and backend:

```bash
npm run type-check
```

### 5. Production Build & Serving

Build both client and server:

```bash
npm run build
```

Run the unified production server:

```bash
npm start
```

Access the application at [http://localhost:5000](http://localhost:5000).

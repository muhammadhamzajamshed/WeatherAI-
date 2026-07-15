# WeatherOps

WeatherOps is a React + Node application that integrates the WeatherAI developer platform. It demonstrates secure API consumption through a backend-for-frontend proxy, live weather queries, operational forecast insights, and account usage visibility.

## Architecture

- React + Vite frontend for the operational dashboard.
- Node + Express backend for validation, API-key protection, WeatherAI request forwarding, and response normalization.
- WeatherAI REST API via `https://api.weather-ai.co/v1/weather` and `https://api.weather-ai.co/v1/usage`.
- Presentation-focused API contract so the React UI renders meaningful fields only.

## Local Setup

```bash
npm install
cp .env.example .env
npm run build
npm start
```

Open `http://localhost:8080`.

For frontend development with HMR, run the server and Vite in two terminals:

```bash
npm start
npm run dev
```

Open `http://localhost:5173`.

## Environment Variables

| Name | Required | Description |
| --- | --- | --- |
| `WEATHER_AI_API_KEY` | Production yes | WeatherAI API key, prefixed with `wai_`. |
| `WEATHER_AI_BASE_URL` | No | Defaults to `https://api.weather-ai.co`. |
| `ALLOW_DEMO_MODE` | No | Defaults to `true` locally and `false` in production. |
| `PORT` | No | Defaults to `8080`. |
| `CORS_ORIGIN` | Production recommended | Comma-separated allowed origins, for example `https://your-app.onrender.com`. |
| `REQUEST_TIMEOUT_MS` | No | WeatherAI upstream timeout. Defaults to `10000`. |
| `RATE_LIMIT_WINDOW_MS` | No | API rate-limit window. Defaults to `60000`. |
| `RATE_LIMIT_MAX` | No | Requests per window per IP. Defaults to `60`. |

## Deployment

### Netlify Free

This repository supports Netlify static hosting plus Netlify Functions. The React app is deployed from `dist`, and `/api/*` is routed to serverless functions so the WeatherAI API key remains private.

Netlify settings:

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

Required environment variables:

```bash
NODE_ENV=production
ALLOW_DEMO_MODE=false
WEATHER_AI_API_KEY=wai_your_key_here
WEATHER_AI_BASE_URL=https://api.weather-ai.co
REQUEST_TIMEOUT_MS=10000
```

The `netlify.toml` file already defines the build, functions, API redirects, and SPA fallback.

### Render or Railway

Use one web service with:

```bash
npm install
npm run build
npm start
```

Set `WEATHER_AI_API_KEY` in the platform environment settings. The Express server serves both the API proxy and the built React app.
For production, set `NODE_ENV=production`, `ALLOW_DEMO_MODE=false`, and `CORS_ORIGIN` to your deployed app URL.

### Netlify Split Deployment

This repository is optimized for a single Node service. If deploying the frontend separately, deploy the Express server to Render or Railway and update the frontend fetch base path through a small client config.

## API Flow

1. The browser calls `/api/weather` with latitude, longitude, days, units, and AI-summary preference.
2. Express validates query parameters with Zod.
3. The server calls WeatherAI with `Authorization: Bearer <WEATHER_AI_API_KEY>`.
4. The server normalizes WeatherAI fields into a stable UI contract and derives a decision brief when the API returns no AI summary.
5. The dashboard renders only available weather metrics and shows usage as quota cards rather than raw JSON.

## Location Handling

WeatherAI weather queries are coordinate-based. Preset buttons in the UI send both the selected label, such as `Nairobi`, and the actual coordinates, such as `lat=-1.2921&lon=36.8219`. The backend uses the coordinates for WeatherAI and echoes the label plus coordinates in the normalized response so the dashboard and Network tab make the queried location auditable.

## Quality Notes

- API keys are never sent to the browser.
- Input ranges are validated before calling WeatherAI.
- WeatherAI errors are normalized for the UI.
- The server normalizes WeatherAI responses before they reach the UI.
- API requests have upstream timeouts, rate limiting, and production-safe error responses.
- Unavailable API fields are omitted from the dashboard instead of being shown as placeholder values.

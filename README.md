# Muslim Enlight

React chat frontend and Express/Google GenAI backend, running as separate applications.

## Project structure

```text
frontend/
  package.json              React dependencies and scripts
  vite.config.js            Port 3000 and API proxy configuration
  index.html
  src/
    main.jsx                React entry point
    App.jsx                 Application state and screen composition
    components/
      Sidebar.jsx
      Header.jsx
      Onboarding.jsx
      ChatPanel.jsx
      MessageList.jsx
      Composer.jsx
      ResetDialog.jsx
      Icon.jsx
    constants/options.js
    locales/translations.js
    styles/global.css
index.js                    Express API entry point
src/
  ai_config.js              Model and tool orchestration
  faith_tools.js            Local reference search tools
test/agent.test.js
```

## Run locally

Install dependencies from the project root:

```powershell
npm install
npm --prefix frontend install
```

Set `GOOGLE_AI_API_KEY` in the root `.env`. Use `APP_PORT=5000` for the backend. Optionally set `GOOGLE_AI_MODEL` (defaults to `gemma-4-26b-a4b-it`). Never put the API key in the frontend.

Terminal 1, from the project root:

```powershell
npm run dev
```

Terminal 2, from the project root:

```powershell
npm run client:dev
```

Open **http://127.0.0.1:3000**. You can alternatively run `npm run dev` inside `frontend/`. Vite requires port 3000 and reports a conflict rather than silently choosing another port.

Express runs separately on port 5000 and serves only API endpoints. Vite forwards `/api` requests to it, so development requires no cross-origin browser requests. If you change the backend port, add `API_PROXY_TARGET=http://127.0.0.1:YOUR_PORT` to `frontend/.env` and restart Vite. The root `.env` belongs to the backend.

## Build and verification

```powershell
npm run build
npm test
npm run format:check
```

The React production bundle is written to `frontend/dist/`. `npm run preview` serves that bundle on port 3000 for frontend inspection; production hosting must separately route `/api` to Express. Express does not serve React files.

`npm run format` formats readable source code. Seventeen offline tests exercise tool execution, bounded agent loops, query validation, redacted API failures, preferences/history, and API health. Live AI availability is not verified by mocks; a separate live check succeeded with the configured Gemma model. Clinical/religious suitability still requires review. Browser visual inspection remains unverified.

## Chat behavior

Onboarding asks for language, intention, and Quran/Hadith preference. Mood suggestions populate editable input before sending. Enter sends; Shift+Enter inserts a newline. English, Urdu, and Arabic interfaces include automatic RTL layout and an independent composer direction control. Actual tool results appear as linked reference cards; summaries retain the source language and are labeled as paraphrases.

Guest conversation state lives in the tab only and refresh clears it. Signed-in conversations save on this app?s server and can be reopened from recent reflections. The client or server supplies up to six recent messages truncated to 1500 characters each for model context. Queries and context are sent to Google AI. Optional Google Fonts have local font fallbacks.

## API

- `GET /api/health` returns `{ "status": "ok" }`.
- `POST /api/chat` accepts JSON containing `query`, optional `language` (`en`, `ur`, `ar`), `focus` (`reflection`, `behaviour`, `comfort`), `source` (`both`, `quran`, `hadith`), and `history`.
- Chat output contains `reply` and `toolCalls`.

## Prototype limits

`search_quran` and `search_hadith` search ten local, source-linked editorial summaries covering patience, hardship, anger, hope, remembrance, gratitude, repentance, forgiveness, trust, prayer, and charity. This is not a comprehensive corpus or live web search. Empty matches are explicit. Expand the reviewed reference index or integrate a trusted retrieval API for broader coverage.

The assistant offers wellbeing support without claiming to be a licensed therapist. Prompt safeguards are not a clinical safety evaluation. Optional username/password accounts and SQLite conversation persistence are implemented. Authentication attempts are rate limited per IP in this server process; general chat request rate limiting is not implemented.


## API diagnostics and animated companion

The API preserves safe error codes for provider errors, authentication, quota, model availability, and timeouts. Transient generation failures retry once; errors never include raw provider details or API keys. The browser uses translated error explanations. A successful proxy health check rules out a broken proxy, while chat error codes identify upstream failures. There is no need for permissive CORS headers when using the Vite same-origin proxy.

On 2026-10-24, the locally configured 31B model returned provider errors. The same key successfully used `gemma-4-26b-a4b-it` for the full tool-call cycle, so the local configuration and default now use that model. Override `GOOGLE_AI_MODEL` if needed.

The original emerald glassmorphism palette is retained. A geometry-based Three.js brass bot floats, blinks, and animates while a request is pending. It is lazy loaded on entering chat, falls back when WebGL is unavailable, and releases GPU resources when unmounted. Loading dots, skeleton shimmer, progress highlight, and reply entrance effects respect reduced-motion preferences. The composer has a transparent outer wrapper and a localized soft shadow, eliminating the hard rectangular gradient.


## Reference retrieval

References live in `src/data/faith_references.js`. Topic aliases in `src/faith_tools.js` support English, Roman Urdu, Urdu and Arabic, with Unicode/diacritic normalization. Results rank by topic overlap, support reference-number lookup, and are limited to four per source type. For explicit religious questions, the server retrieves before generation and supplies the results even if the model skips tool selection. Source preferences determine which tools run. This remains a curated local library, not a search of every verse and Hadith; a no-match result does not mean scripture has nothing relevant.

## Change sources during chat

Use the in-chat Quran/Hadith/both selector and focus dropdown to change the next response without repeating onboarding. Topic chips fill an editable prompt. Existing conversation remains visible. Source restrictions apply to backend retrieval tools as well as the model instructions. Controls support English, Urdu, Arabic, keyboard focus, and RTL layouts.


## Optional accounts and recent conversations

Guests can chat without registering. Use the sidebar Sign in / Create account control to register a username and password. New signed-in reflections save automatically after successful replies and appear in Recent reflections. Open an entry to resume it, or use its delete button and confirm deletion. Signing out clears the loaded conversation from the screen and invalidates that browser session.

Signing in does not silently import an existing guest conversation. Choose Save this chat to store it explicitly, or start a new reflection. Until imported, an existing guest chat stays unsaved even after signing in. Failed AI requests are not saved as successful exchanges.

Storage uses Node?s built-in SQLite support (use Node 24 or newer), with the database at `data/app.sqlite` by default. Set `DATABASE_PATH` to choose another persistent location. Keep this directory on persistent disk and excluded from source control; it contains user records, session hashes, and readable conversation content. No external database or account provider is required for local development. `nodemon.json` excludes runtime data so saving chats does not restart the server.

Passwords use salted scrypt hashes. Sessions use random opaque tokens in HttpOnly, SameSite=Strict cookies, expire after seven days, and are hashed in the database. Production cookies require HTTPS when NODE_ENV=production. Saved-conversation APIs enforce ownership, do not cache account data, and reject cross-origin mutations. Concurrent edits use revision checks to avoid overwriting a newer conversation.

This account milestone has no email verification, password recovery, account deletion UI, or database encryption at rest. Account recovery and deployment data protection need a separate implementation before a public launch. No actual user account was created during development; tests use isolated databases. Account and history labels support English, Urdu, and Arabic. Browser visual verification is still pending.

## Local origins and cookies

The API defaults to allowing `http://localhost:3000` and `http://127.0.0.1:3000` during development. The same origin as the API is also accepted. The shared origin policy runs before JSON parsing and authentication, responds to OPTIONS preflight requests, and returns explicit credential-aware CORS headers. Unknown origins are rejected. The former account-router host/port comparison has been removed so it cannot override the configured policy.

Set a comma-separated `CORS_ORIGINS` in the backend `.env` for different frontend origins, with exact schemes, hosts, and ports and no trailing slashes. Production does not enable the local development defaults. Restart the backend after environment changes. Vite's `/api` proxy uses `changeOrigin: true`; the browser should continue using relative `/api` URLs for cookie consistency. Do not alternate between localhost and 127.0.0.1 during a login session: browsers keep separate host cookies. Direct cross-origin fetches need `credentials: 'include'`; the current frontend uses the same-origin Vite proxy instead.

## Select2 and typography

Language, focus, and text-direction dropdowns use `frontend/src/components/Select2.jsx`. The wrapper isolates jQuery/Select2 DOM from React and cleans it up on unmount. Theme rules live in `frontend/src/styles/select2.css`. The language dropdown supports searching; the small focus/direction lists omit search. `npm --prefix frontend test` runs the Select2 lifecycle integration test, which is also included in root `npm test` after installing both packages' dependencies.

Cinzel is loaded with the existing Google Fonts stylesheet for Latin display headings, branding, and mood/topic chips. Body text stays in DM Sans; Urdu/Arabic display text uses Noto Naskh Arabic. Local serif/sans-serif fallbacks work if web fonts cannot load.

## Recent-chat pagination and GitHub

The recent list fetches five conversations per page. Load 5 more appends the next page using a stable cursor; the five-row list viewport scrolls independently of its heading. Long titles are clipped with a full-title tooltip.

The root .gitignore covers backend credentials, dependencies and runtime databases. frontend/.gitignore covers frontend dependencies, Vite output, local environment files and caches. Commit both package-lock.json files and placeholder-only env examples. Actual .env files and data/app.sqlite must remain untracked. Ignore rules do not remove previously committed secrets from Git history; the current working tree has no tracked environment or runtime database files.

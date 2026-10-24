# MuslimEnlight — Query and Tool Agent PRD

Status: Prototype implemented; live API verification pending.
Last updated: 2026-10-24

## Goal

Accept a user's mood or behaviour query and let an AI agent choose a relevant Quran or Hadith search tool before giving empathetic, source-grounded support. The assistant must not claim to be a licensed therapist.

## Current scope

- CommonJS Node.js and Express.
- POST /api/chat accepts JSON containing a query string of 1–4000 characters after rejecting blank input.
- Google GenAI uses GOOGLE_AI_API_KEY and an optional GOOGLE_AI_MODEL; default model is gemma-4-31b-it.
- The model can select search_quran or search_hadith, and the server executes only allowlisted tools with validated arguments.
- Tool outputs return to the model with the original model content preserved.
- Each request has independent history and at most four model rounds, each allowing at most four tool calls.
- JSON output contains reply and toolCalls for development inspection.
- Local search includes Quran 94:5 and Sahih al-Bukhari 6116 with source links and editorial paraphrases, not verbatim scripture.
- Empty search results are explicit. No comprehensive corpus or live web search is included.

## Acceptance criteria

- Valid requests return a non-empty reply or a controlled service failure.
- Invalid JSON, missing/blank/oversized queries return HTTP 400; oversized bodies return HTTP 413.
- Missing API configuration returns HTTP 503; upstream failures return a generic HTTP 502 without provider details or credentials.
- Tool calls are inspected, validated, executed, and returned to the model before the final reply.
- Unknown tools cannot execute arbitrary operations.
- Repeated tool calls terminate at the configured bound.
- Religious references come from tool results; summaries are identified as paraphrases.
- Prompt instructions require empathetic language, no diagnosis or prescription, no invented scripture, and immediate safety prioritization when danger is expressed.

## Verification

Four offline tests cover the model/tool round trip, unknown tools and no-match searches, input validation and loop limits, and HTTP validation/error redaction. They pass. No live model call or clinical safety evaluation has been performed. Prompt instructions alone do not guarantee safe or accurate responses.

## Outside this milestone

Full scripture retrieval, translation and scholarly review, conversation persistence, frontend, clinical treatment, user accounts, production privacy controls, rate limiting, deployment, and model training.

## Next milestone

Replace or expand the small reference index with a reviewed corpus or trusted retrieval API, evaluate source relevance and sensitive scenarios, and add production access/privacy controls before real-user use.

## Change log

- 2026-10-24: Initial fixed-prompt Express/GenAI PRD created.
- 2026-10-24: Replaced fixed-prompt scope with query-based wellbeing support and an implemented tool-calling prototype. Corrected the helper/client setup and documented remaining limitations.

## React chat milestone — 2026-10-24

Implemented a responsive emerald glassmorphism React interface, compiled with Vite and served by Express.

### User flow

1. Welcome and privacy context.
2. Select English, Urdu, or Arabic.
3. Choose feelings, behaviour reflection, or comfort as the intention.
4. Select Quran, Hadith, or both as the preferred reference sources.
5. Enter chat, choose a mood suggestion or type directly, and receive an AI response with retrieved source cards.

### Requirements and acceptance criteria

- Interface labels change with the selected language, including onboarding, chat, loading, retry, and error states.
- Urdu and Arabic set document RTL direction; logical CSS properties mirror layout and directional arrow icons.
- Composer direction can independently be Auto, LTR, or RTL for mixed-language input.
- Language, focus, and source preferences are validated server-side and passed to the model.
- Chat displays actual retrieved reference links and labels summaries as paraphrases. Empty retrieval is explicitly shown.
- Mood suggestions populate editable text before submission; free-form input remains available.
- Empty messages cannot be sent; loading prevents concurrent submissions. Errors support retry without duplicating the user bubble.
- New reflection requires confirmation before clearing messages. The native dialog provides focus containment and Escape cancellation.
- Recent conversation context is sent with subsequent queries, limited to six messages of 1500 characters each by the client; full history remains visible in the current tab only.
- Production assets and the API share the Express origin; Vite development supports a configurable API proxy.

### Validation and limits

Production build and six offline tests pass, covering agent/tool flow, API validation and error handling, preferences/history propagation, and compiled frontend serving. Visual browser inspection was unavailable because the session had no connected browser. Mobile appearance and RTL layout still require visual verification. The reference library remains limited to two entries; source summaries remain in English. Model preferences are instructions, not guarantees of retrieval relevance. No live AI call, deployment, persistence, user accounts, or clinical safety evaluation was added.

## Separate frontend milestone — 2026-10-24

This supersedes the previous shared-origin Express static hosting setup.

- React is now an independent application in `frontend/`, with its own package manifest, lockfile, Vite configuration, and standard `src/` directory.
- Reusable components include Sidebar, Header, Onboarding, ChatPanel, MessageList, Composer, ResetDialog, and Icon.
- Frontend development uses port 3000 with strict port selection. Express defaults to port 5000 and exposes API routes only.
- Vite proxies `/api` to port 5000; `frontend/.env` can override API_PROXY_TARGET. Credentials remain in the backend environment.
- Production output is `frontend/dist/`; a production host must route API calls separately.
- Removed the obsolete `client/` sources and root Vite configuration. Root convenience commands forward frontend operations to its package.
- Verification: frontend page, transformed React entry, and proxied API health returned HTTP 200. Production build and six backend tests pass. No live AI request was sent, and visual browser verification remains pending.

## Reliability and motion refinement — 2026-10-24

- Diagnosed the reported 502: direct and proxied health calls succeeded; direct Google generation returned provider 500/504 errors with the configured 31B model. This was an upstream failure rather than evidence of a CORS failure.
- Switched the local model configuration and code default to gemma-4-26b-a4b-it after a successful same-key tool-call test. A full live helper call returned a reply and retrieved Sahih al-Bukhari 6116.
- Added one retry for transient generation errors and sanitized provider error codes with localized frontend explanations. No raw provider error, key, or prompt is logged.
- Added a lazy-loaded Three.js companion with floating, blinking, and request-state movement, WebGL fallback, and resource cleanup.
- Preserved the original emerald glassmorphism colors after user feedback. Removed the proposed parchment palette.
- Removed the composer's solid rectangular gradient and localized its shadow. Added typing dots, skeleton shimmer, an indeterminate progress highlight, send spinner, and gentle reply entry; reduced-motion preferences are respected.
- Clinical and religious suitability remain outside automated verification. Browser visual inspection is still unavailable in this session.

## Reference relevance improvement — 2026-10-24

- Root cause: two-entry exact-English keyword index contained no patience references and ignored Urdu/Arabic tokens.
- Expanded to ten source-linked editorial summaries, with patience supported by Quran 2:153, Sahih al-Bukhari 1469, and Sahih Muslim 2999.
- Added normalized English/Roman Urdu/Urdu/Arabic topic aliases, reference-number lookup, ranked results, and removal of misleading broad anger matches for generic behaviour queries.
- Explicit religious queries receive server-initiated retrieval before generation, respecting source preferences, even if the model skips tools.
- Added instructions to distinguish limited-library coverage from the existence of relevant scripture.
- Ten offline tests pass, including multilingual sabr retrieval and initial retrieval when the model omits tool calls. The library remains curated and incomplete, with summaries rather than exact quotations.

## In-chat exploration controls — 2026-10-24

- Added an inline Quran/Hadith/both radio selector and conversation-focus dropdown, without navigating away or clearing history.
- Added localized topic suggestions for sabr, gratitude, hope, forgiveness, and tawakkul. Clicking fills editable input rather than automatically sending.
- Selection applies to the next request. Controls are disabled during pending requests. Existing messages and references remain unchanged.
- Controls retain emerald glassmorphism styling, keyboard focus states, responsive layout, and Urdu/Arabic RTL support.
- Backend filters advertised tools by selected source and blocks execution of a disabled source.
- Build and eleven offline tests pass, including source filtering and disabled-source enforcement. Browser visual QA remains unavailable.

## Optional accounts and recent conversations — 2026-10-24

- Guest access remains available with no signup requirement and no server-side conversation persistence.
- Added username/password signup, login, session restoration, and logout. Usernames contain 3–30 ASCII letters, numbers, or underscores; registration passwords contain 10–128 characters.
- Added SQLite users, sessions, and conversations. Passwords use salted scrypt hashes; opaque session tokens are hashed at rest and stored in HttpOnly, SameSite cookies with seven-day expiration.
- New signed-in conversations save successful message pairs automatically. Sidebar lists up to 100 recent conversations, supports opening/resuming and confirmed deletion, and adapts for mobile/RTL.
- Guest conversation import is explicit via Save this chat. Login alone does not save existing guest messages.
- Backend reads history from owned saved conversations and verifies ownership before model calls. Invalidated sessions cannot save; stale revisions cannot overwrite newer data. Account responses are not cached.
- Signing out clears loaded frontend chat state and invalidates the current session.
- Runtime database files are excluded from source control and nodemon watches. Default database is data/app.sqlite; Node 24+ is required.
- Validation: 17 offline tests and production build pass, including signup/login/logout, guest non-persistence, database reopen, ownership isolation, source handling, revision conflicts, guest import, origin rejection, and authentication rate limiting. No real account or live AI request was required by these tests. Browser visual verification remains pending.
- Remaining account capabilities: email verification, password recovery, account deletion UI, and production storage encryption/hosting policies.

## CORS and origin follow-up — 2026-10-24

- Replaced account-only host matching with a shared origin policy before all API parsing and routes.
- Local development permits localhost:3000 and 127.0.0.1:3000; backend CORS_ORIGINS supports explicit custom origins. Production requires explicit origins for cross-origin access.
- Added credential-aware allow-origin headers, OPTIONS handling for JSON requests, Vary headers, and rejection of unsupported methods/headers and unrelated origins.
- Updated Vite proxy to explicitly rewrite the target host. Frontend requests remain relative /api calls for consistent cookies.
- Eighteen tests and the frontend build pass, covering guest/auth persistence and cross-origin preflight/requests. Browser visual verification remains pending.

## Select2 and display typography — 2026-10-24

- Added Select2 to language, conversation focus, and composer direction dropdowns through a reusable React wrapper. The Quran/Hadith selector remains a radio group for immediate source switching.
- Wrapper synchronizes controlled values and disabled states, supports RTL, labels the generated combobox, and removes custom event handlers and plugin DOM on unmount.
- Added an emerald glass Select2 theme and language-option searching. jQuery 3 is scoped to the wrapper rather than exposed globally.
- Added Cinzel for Latin headings, branding, and mood/topic chips while preserving body typography and Noto Naskh Arabic for Urdu/Arabic display text.
- Nineteen tests pass, including a real Select2/React DOM integration test for changes, controlled updates, disabled state, RTL and cleanup. Production build passes. Browser visual QA remains unavailable.

## Recent-chat pagination and GitHub exclusions — 2026-10-24

- Recent conversations load five per page with a stable timestamp/ID cursor, ownership filtering, and no 100-chat truncation.
- Sidebar has a five-row scroll viewport when at least five saved chats exist, a separate heading/count and Load 5 more control, clipped titles with full-title tooltips, and theme-matched scrollbar styles. Fewer saved chats are shown without placeholders.
- Added frontend/.gitignore and updated the root backend .gitignore to exclude credentials, dependencies, generated builds, runtime chat databases and local artifacts. Example environment files and dependency lockfiles remain eligible for version control.
- Git check-ignore confirmed the expected exclusions. No actual environment or runtime database files are currently tracked.
- Twenty tests and the production build pass, including multi-page retrieval and user isolation. Visual browser verification remains pending.

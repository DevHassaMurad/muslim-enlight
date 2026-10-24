const express = require('express');
require('dotenv').config({ quiet: true });
const { showResponse, validateQuery } = require('./src/ai_config');
const { createAccountStore, fail } = require('./src/account_store');
const { accountRoutes, readToken } = require('./src/account_routes');
const { createOriginPolicy } = require('./src/origin_policy');

function createApp(respond = showResponse, { store } = {}) {
    const app = express();
    const getStore = () => (store ||= createAccountStore());
    app.use('/api', createOriginPolicy());
    app.use(express.json({ limit: '256kb' }));
    app.use('/api', accountRoutes(getStore));
    app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
    app.post('/api/chat', async (req, res, next) => {
        try {
            const query = validateQuery(req.body?.query);
            const { language = 'en', focus = 'reflection', source = 'both' } = req.body;
            if (
                !['en', 'ur', 'ar'].includes(language) ||
                !['reflection', 'behaviour', 'comfort'].includes(focus) ||
                !['both', 'quran', 'hadith'].includes(source)
            ) {
                return res.status(400).json({ error: 'Invalid conversation preferences.' });
            }
            if (req.body.save && !req.account)
                fail(401, 'Your session expired. Please sign in to save this chat.');
            const existing = req.body.conversationId
                ? req.account
                    ? getStore().get(req.account.id, req.body.conversationId)
                    : fail(401, 'Please sign in.')
                : null;
            if (existing && existing.messages.length >= 100)
                fail(400, 'This conversation is full. Please start a new reflection.');
            const history = existing
                ? existing.messages
                      .slice(-6)
                      .map((message) => ({ role: message.role, text: message.text.slice(0, 1500) }))
                : req.body.history || [];
            if (
                !Array.isArray(history) ||
                history.length > 10 ||
                history.some(
                    (item) =>
                        !item ||
                        !['user', 'assistant'].includes(item.role) ||
                        typeof item.text !== 'string' ||
                        !item.text.trim() ||
                        item.text.length > 8000
                )
            ) {
                return res.status(400).json({ error: 'Invalid conversation history.' });
            }
            const result = await respond(query, { language, focus, source, history });
            if (req.account && req.body.save) {
                const currentUser = getStore().getUser(readToken(req));
                if (currentUser?.id !== req.account.id)
                    fail(401, 'Your session expired. Please sign in again.');
                const refs = [
                    ...new Map(
                        (result.toolCalls || [])
                            .flatMap((call) => call.result?.results || [])
                            .map((ref) => [ref.url, ref])
                    ).values(),
                ];
                const saved = getStore().save(
                    req.account.id,
                    existing?.id,
                    [
                        ...(existing?.messages || []),
                        { role: 'user', text: query },
                        { role: 'assistant', text: result.reply, refs },
                    ],
                    { language, focus, source },
                    existing?.revision
                );
                result.conversationId = saved.id;
            }
            res.json(result);
        } catch (error) {
            next(error);
        }
    });
    app.use((error, req, res, next) => {
        if (error.accountError)
            return res.status(error.status).json({ error: error.message, code: 'ACCOUNT_ERROR' });
        const providerFailure = error.name === 'ApiError';
        const providerStatus = providerFailure ? Number(error.status) : undefined;
        const status = providerFailure
            ? providerStatus === 429
                ? 429
                : providerStatus === 504
                  ? 504
                  : 502
            : [400, 413, 503].includes(error.status)
              ? error.status
              : 502;
        const code = providerFailure
            ? {
                  400: 'AI_REQUEST_REJECTED',
                  401: 'AI_AUTH_FAILED',
                  403: 'AI_ACCESS_DENIED',
                  404: 'AI_MODEL_UNAVAILABLE',
                  429: 'AI_RATE_LIMITED',
                  500: 'AI_PROVIDER_ERROR',
                  503: 'AI_BUSY',
                  504: 'AI_TIMEOUT',
              }[providerStatus] || 'AI_PROVIDER_ERROR'
            : status === 503
              ? 'AI_NOT_CONFIGURED'
              : 'REQUEST_FAILED';
        if (providerFailure) {
            // Log safe diagnostics only: never log prompts, raw errors, or credentials.
            console.error('[chat] Google AI request failed', { code, providerStatus });
        }
        const message =
            status === 400
                ? 'Provide valid JSON with a non-empty query of at most 4000 characters.'
                : status === 413
                  ? 'Request body is too large.'
                  : status === 503
                    ? 'AI service is not configured.'
                    : 'Unable to generate a response. Please try again.';
        res.status(status).json({ error: message, code });
    });
    return app;
}

if (require.main === module) {
    const port = process.env.APP_PORT || 5000;
    createApp().listen(port, () => console.log(`Server is running on port ${port}`));
}
module.exports = { createApp };

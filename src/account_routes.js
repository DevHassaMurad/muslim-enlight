const express = require('express');
const { SESSION_AGE, fail } = require('./account_store');
const references = require('./data/faith_references');

function readToken(req) {
    return req.headers.cookie
        ?.split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith('enlight_session='))
        ?.slice('enlight_session='.length);
}

function accountRoutes(getStore) {
    const router = express.Router();
    router.use((req, res, next) => {
        res.setHeader('Cache-Control', 'no-store');
        next();
    });
    const attempts = new Map();
    const cookie = (token, age = SESSION_AGE) =>
        `enlight_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(age / 1000)}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
    router.use((req, res, next) => {
        const token = readToken(req);
        req.account = token ? getStore().getUser(token) : null;
        next();
    });
    const requireUser = (req, res, next) =>
        req.account ? next() : res.status(401).json({ error: 'Please sign in.' });
    const limitAuth = (req, res, next) => {
        const now = Date.now();
        for (const [key, record] of attempts) if (record.reset < now) attempts.delete(key);
        const key = req.ip;
        const record = attempts.get(key) || { count: 0, reset: now + 15 * 60 * 1000 };
        record.count++;
        attempts.set(key, record);
        if (record.count > 20)
            return res
                .status(429)
                .json({ error: 'Too many attempts. Please try again in 15 minutes.' });
        next();
    };
    router.get('/auth/me', (req, res) => res.json({ user: req.account }));
    for (const action of ['register', 'login']) {
        router.post(`/auth/${action}`, limitAuth, async (req, res, next) => {
            try {
                const previousToken = readToken(req);
                const result = await getStore()[action](req.body?.username, req.body?.password);
                if (previousToken) getStore().logout(previousToken);
                res.setHeader('Set-Cookie', cookie(result.token));
                res.json({ user: result.user });
            } catch (error) {
                next(error);
            }
        });
    }
    router.post('/auth/logout', (req, res) => {
        const token = readToken(req);
        if (token) getStore().logout(token);
        res.setHeader('Set-Cookie', cookie('', 0));
        res.json({ ok: true });
    });
    router.get('/conversations', requireUser, (req, res) =>
        res.json(getStore().list(req.account.id, req.query.cursor))
    );
    router.get('/conversations/:id', requireUser, (req, res, next) => {
        try {
            res.json(getStore().get(req.account.id, req.params.id));
        } catch (error) {
            next(error);
        }
    });
    router.delete('/conversations/:id', requireUser, (req, res) => {
        getStore().remove(req.account.id, req.params.id);
        res.json({ ok: true });
    });
    // Explicit user action imports an existing guest chat; signing in never imports it silently.
    router.post('/conversations', requireUser, (req, res, next) => {
        try {
            const messages = req.body?.messages;
            if (
                !Array.isArray(messages) ||
                !messages.length ||
                messages.length > 100 ||
                messages.some(
                    (message) =>
                        !['user', 'assistant'].includes(message?.role) ||
                        typeof message.text !== 'string' ||
                        !message.text.trim() ||
                        message.text.length > 8000
                )
            )
                fail(400, 'Invalid conversation.');
            const clean = messages.map((message) => ({
                role: message.role,
                text: message.text,
                ...(message.role === 'assistant'
                    ? {
                          refs: references
                              .filter(
                                  (ref) =>
                                      Array.isArray(message.refs) &&
                                      message.refs.some((item) => item?.url === ref.url)
                              )
                              .map(({ topics, ...ref }) => ref),
                      }
                    : {}),
            }));
            res.json(getStore().save(req.account.id, null, clean, {}));
        } catch (error) {
            next(error);
        }
    });
    router.use((error, req, res, next) => {
        if (error.accountError)
            return res.status(error.status).json({ error: error.message, code: 'ACCOUNT_ERROR' });
        next(error);
    });
    return router;
}

module.exports = { accountRoutes, readToken };

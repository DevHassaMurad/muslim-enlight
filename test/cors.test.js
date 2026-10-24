const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../index');

test('CORS allows local frontend origins, credentials and JSON preflight; rejects other origins', async () => {
    const server = createApp(async () => ({ reply: 'Reply', toolCalls: [] })).listen(
        0,
        '127.0.0.1'
    );
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    try {
        for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000']) {
            const preflight = await fetch(base + '/auth/login', {
                method: 'OPTIONS',
                headers: {
                    Origin: origin,
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'content-type',
                },
            });
            assert.equal(preflight.status, 204);
            assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
            assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
            const chat = await fetch(base + '/chat', {
                method: 'POST',
                headers: { Origin: origin, 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: 'Hello' }),
            });
            assert.equal(chat.status, 200);
            assert.equal(chat.headers.get('access-control-allow-origin'), origin);
        }
        const rejected = await fetch(base + '/auth/logout', {
            method: 'POST',
            headers: { Origin: 'https://unrelated.example' },
        });
        assert.equal(rejected.status, 403);
        assert.equal(rejected.headers.get('access-control-allow-origin'), null);
        const invalid = await fetch(base + '/chat', {
            method: 'OPTIONS',
            headers: { Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'PUT' },
        });
        assert.equal(invalid.status, 403);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});

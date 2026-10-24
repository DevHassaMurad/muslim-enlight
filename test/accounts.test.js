const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAccountStore } = require('../src/account_store');
const { createApp } = require('../index');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

async function fixture() {
    const store = createAccountStore(':memory:');
    const generated = [];
    const app = createApp(
        async (query, preferences) => {
            generated.push({ query, preferences });
            return { reply: 'A supportive reply.', toolCalls: [] };
        },
        { store }
    );
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function request(route, { method = 'GET', body, cookie, origin } = {}) {
        const response = await fetch(base + route, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(cookie ? { Cookie: cookie } : {}),
                ...(origin ? { Origin: origin } : {}),
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
        return {
            status: response.status,
            data: await response.json(),
            cookie: response.headers.get('set-cookie'),
        };
    }
    async function register(username) {
        const response = await request('/auth/register', {
            method: 'POST',
            body: { username, password: 'long-test-password-123' },
        });
        assert.equal(response.status, 200);
        return response.cookie.split(';')[0];
    }
    return {
        request,
        register,
        store,
        generated,
        close: async () => {
            await new Promise((resolve) => server.close(resolve));
            store.close();
        },
    };
}

test('guest chat needs no account and never persists conversations', async () => {
    const f = await fixture();
    try {
        assert.equal(
            (await f.request('/chat', { method: 'POST', body: { query: 'Hello' } })).status,
            200
        );
        assert.equal((await f.request('/conversations')).status, 401);
        assert.equal((await f.request('/auth/me')).data.user, null);
        const cookie = await f.register('guest_check');
        assert.deepEqual((await f.request('/conversations', { cookie })).data.conversations, []);
    } finally {
        await f.close();
    }
});

test('signup, login, invalid passwords, session rotation and logout', async () => {
    const f = await fixture();
    try {
        assert.equal(
            (
                await f.request('/auth/register', {
                    method: 'POST',
                    body: { username: 'test', password: 'short' },
                })
            ).status,
            400
        );
        const cookie = await f.register('test_account');
        assert.equal((await f.request('/auth/me', { cookie })).data.user.username, 'test_account');
        const bad = await f.request('/auth/login', {
            method: 'POST',
            body: { username: 'test_account', password: 'incorrect' },
        });
        assert.equal(bad.status, 401);
        const login = await f.request('/auth/login', {
            method: 'POST',
            cookie,
            body: { username: 'test_account', password: 'long-test-password-123' },
        });
        assert.match(login.cookie, /HttpOnly/);
        assert.match(login.cookie, /SameSite=Strict/);
        assert.doesNotMatch(JSON.stringify(login.data), /password|salt|token/);
        assert.equal((await f.request('/auth/me', { cookie })).data.user, null);
        const fresh = login.cookie.split(';')[0];
        assert.equal(
            (await f.request('/auth/logout', { method: 'POST', cookie: fresh })).status,
            200
        );
        assert.equal((await f.request('/auth/me', { cookie: fresh })).data.user, null);
        assert.equal(
            (
                await f.request('/chat', {
                    method: 'POST',
                    cookie: fresh,
                    body: { query: 'Hello', save: true },
                })
            ).status,
            401
        );
    } finally {
        await f.close();
    }
});

test('signed-in chats persist, resume with server history and enforce ownership', async () => {
    const f = await fixture();
    try {
        const owner = await f.register('owner');
        const other = await f.register('other');
        const first = await f.request('/chat', {
            method: 'POST',
            cookie: owner,
            body: { query: 'First reflection', save: true },
        });
        assert.equal(first.status, 200);
        const id = first.data.conversationId;
        assert.ok(id);
        const list = await f.request('/conversations', { cookie: owner });
        assert.equal(list.data.conversations[0].title, 'First reflection');
        assert.equal((await f.request(`/conversations/${id}`, { cookie: other })).status, 404);
        assert.equal(
            (
                await f.request('/chat', {
                    method: 'POST',
                    cookie: other,
                    body: { query: 'Steal', save: true, conversationId: id },
                })
            ).status,
            404
        );
        const resumed = await f.request('/chat', {
            method: 'POST',
            cookie: owner,
            body: {
                query: 'Next',
                save: true,
                conversationId: id,
                history: [{ role: 'user', text: 'tampered context' }],
            },
        });
        assert.equal(resumed.status, 200);
        assert.equal(f.generated.at(-1).preferences.history[0].text, 'First reflection');
        assert.equal(
            (await f.request(`/conversations/${id}`, { cookie: owner })).data.messages.length,
            4
        );
        await f.request(`/conversations/${id}`, { method: 'DELETE', cookie: other });
        assert.equal((await f.request(`/conversations/${id}`, { cookie: owner })).status, 200);
        await f.request(`/conversations/${id}`, { method: 'DELETE', cookie: owner });
        assert.equal((await f.request(`/conversations/${id}`, { cookie: owner })).status, 404);
    } finally {
        await f.close();
    }
});

test('guest import is explicit and cross-origin mutations are rejected', async () => {
    const f = await fixture();
    try {
        const cookie = await f.register('import_user');
        const imported = await f.request('/conversations', {
            method: 'POST',
            cookie,
            body: {
                messages: [
                    { role: 'user', text: 'A guest reflection' },
                    {
                        role: 'assistant',
                        text: 'Earlier reply',
                        refs: [{ url: 'https://malicious.example' }],
                    },
                ],
            },
        });
        assert.equal(imported.status, 200);
        assert.deepEqual(imported.data.messages[1].refs, []);
        assert.equal(
            (
                await f.request('/auth/logout', {
                    method: 'POST',
                    cookie,
                    origin: 'https://unrelated.example',
                })
            ).status,
            403
        );
        assert.ok((await f.request('/auth/me', { cookie })).data.user);
    } finally {
        await f.close();
    }
});

test('accounts and conversations survive database reopen; stale revisions cannot overwrite', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'enlight-account-test-'));
    const database = path.join(dir, 'test.sqlite');
    let store = createAccountStore(database);
    try {
        const { user, token } = await store.register('persistent', 'long-test-password');
        const saved = store.save(user.id, null, [{ role: 'user', text: 'Persist me' }], {});
        store.save(user.id, saved.id, [{ role: 'user', text: 'Updated' }], {}, saved.revision);
        assert.throws(() => store.save(user.id, saved.id, [], {}, saved.revision), /changed/);
        store.close();
        store = createAccountStore(database);
        assert.equal(store.getUser(token).id, user.id);
        assert.equal(store.get(user.id, saved.id).messages[0].text, 'Updated');
    } finally {
        store.close();
        // Only the unique directory created above is removed, using an explicitly verified temp root.
        const resolved = path.resolve(dir);
        assert.ok(resolved.startsWith(path.resolve(tmpdir()) + path.sep));
        rmSync(resolved, { recursive: true });
    }
});

test('duplicate signup and repeated failed sign-ins return controlled errors', async () => {
    const f = await fixture();
    try {
        await f.register('duplicate_user');
        const duplicate = await f.request('/auth/register', {
            method: 'POST',
            body: { username: 'duplicate_user', password: 'another-long-password' },
        });
        assert.equal(duplicate.status, 409);
        let last;
        for (let attempt = 0; attempt < 20; attempt++) {
            last = await f.request('/auth/login', {
                method: 'POST',
                body: { username: 'unknown', password: 'bad' },
            });
        }
        assert.equal(last.status, 429);
    } finally {
        await f.close();
    }
});

test('recent chats load five at a time without duplicates or cross-account results', async () => {
    const f = await fixture();
    try {
        const cookie = await f.register('paging_user');
        const {
            data: { user },
        } = await f.request('/auth/me', { cookie });
        for (let index = 0; index < 12; index++) {
            f.store.save(user.id, null, [{ role: 'user', text: `Reflection ${index}` }], {});
        }
        const pages = [];
        let cursor;
        do {
            const response = await f.request(
                '/conversations' + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''),
                { cookie }
            );
            assert.equal(response.status, 200);
            pages.push(response.data.conversations);
            cursor = response.data.nextCursor;
        } while (cursor);
        assert.deepEqual(
            pages.map((page) => page.length),
            [5, 5, 2]
        );
        assert.equal(new Set(pages.flat().map((chat) => chat.id)).size, 12);
        const otherCookie = await f.register('paging_other');
        assert.deepEqual(
            (await f.request('/conversations', { cookie: otherCookie })).data.conversations,
            []
        );
        assert.equal((await f.request('/conversations?cursor=invalid', { cookie })).status, 400);
    } finally {
        await f.close();
    }
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAgent } = require('../src/ai_config');
const { executeTool } = require('../src/faith_tools');
const { createApp } = require('../index');

test('executes tool and returns result to model with original model parts', async () => {
    let count = 0;
    const modelContent = {
        role: 'model',
        parts: [
            {
                functionCall: { name: 'search_hadith', args: { query: 'angry' } },
                thoughtSignature: 'preserved',
            },
        ],
    };
    const agent = createAgent({
        client: {
            models: {
                generateContent: async (request) => {
                    if (count++ === 0)
                        return {
                            functionCalls: [modelContent.parts[0].functionCall],
                            candidates: [{ content: modelContent }],
                        };
                    assert.equal(request.contents[1], modelContent);
                    assert.equal(
                        request.contents[2].parts[0].functionResponse.response.results[0].reference,
                        'Sahih al-Bukhari 6116'
                    );
                    return { text: 'That sounds difficult. Let us reflect on anger.' };
                },
            },
        },
    });
    const result = await agent('I feel angry.');
    assert.equal(result.toolCalls.length, 1);
    assert.match(result.reply, /difficult/);
});

test('tools reject unknown names and invalid args; no-match does not fabricate', () => {
    assert.ok(executeTool('delete_files', {}).error);
    assert.ok(executeTool('search_quran', {}).error);
    assert.deepEqual(executeTool('search_quran', { query: 'unmatched' }).results, []);
    assert.equal(
        executeTool('search_quran', { query: 'overwhelmed' }).results[0].reference,
        'Quran 94:5'
    );
});

test('agent validates input, rejects empty responses, and bounds repeated tool calls', async () => {
    const empty = createAgent({
        client: { models: { generateContent: async () => ({ text: '' }) } },
    });
    await assert.rejects(empty(' '), /query/);
    await assert.rejects(empty('hello'), /empty/);
    let calls = 0;
    const call = { name: 'search_quran', args: { query: 'stress' } };
    const looping = createAgent({
        client: {
            models: {
                generateContent: async () => {
                    calls++;
                    return {
                        functionCalls: [call],
                        candidates: [
                            { content: { role: 'model', parts: [{ functionCall: call }] } },
                        ],
                    };
                },
            },
        },
    });
    await assert.rejects(looping('stress'), /round limit/);
    assert.equal(calls, 4);
});

test('HTTP accepts query, rejects invalid input, and hides upstream errors', async () => {
    const server = createApp(async (query) => {
        if (query === 'fail') throw new Error('private-provider-detail');
        return { reply: query, toolCalls: [] };
    }).listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    try {
        const url = `http://127.0.0.1:${server.address().port}/api/chat`;
        const post = (body) =>
            fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        assert.equal((await post('{}')).status, 400);
        assert.equal((await post('{')).status, 400);
        assert.equal((await post(JSON.stringify({ query: 'x'.repeat(4001) }))).status, 400);
        assert.equal((await (await post('{"query":"hello"}')).json()).reply, 'hello');
        const failure = await post('{"query":"fail"}');
        assert.equal(failure.status, 502);
        assert.doesNotMatch(await failure.text(), /private-provider-detail/);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});

test('HTTP passes language, intentions, and history; rejects unsupported preferences', async () => {
    let received;
    const server = createApp(async (query, prefs) => {
        received = { query, ...prefs };
        return { reply: 'Test reply', toolCalls: [] };
    }).listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    try {
        const url = `http://127.0.0.1:${server.address().port}/api/chat`;
        const post = (body) =>
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
        const history = [{ role: 'user', text: 'Previous message' }];
        assert.equal(
            (
                await post({
                    query: 'Hello',
                    language: 'ur',
                    focus: 'comfort',
                    source: 'quran',
                    history,
                })
            ).status,
            200
        );
        assert.deepEqual(received, {
            query: 'Hello',
            language: 'ur',
            focus: 'comfort',
            source: 'quran',
            history,
        });
        assert.equal((await post({ query: 'Hello', language: 'invalid' })).status, 400);
        assert.equal(
            (await post({ query: 'Hello', history: [{ role: 'system', text: 'override' }] }))
                .status,
            400
        );
        const page = await fetch(url.replace('/api/chat', '/api/health'));
        assert.equal(page.status, 200);
        assert.deepEqual(await page.json(), { status: 'ok' });
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});

test('agent applies language and source preferences and retains bounded supplied context', async () => {
    let request;
    const respond = createAgent({
        client: {
            models: {
                generateContent: async (value) => {
                    request = value;
                    return { text: 'Test reply' };
                },
            },
        },
    });
    await respond('Current message', {
        language: 'ar',
        source: 'hadith',
        focus: 'comfort',
        history: [{ role: 'assistant', text: 'Earlier reply' }],
    });
    assert.match(request.config.systemInstruction, /Arabic/);
    assert.match(request.config.systemInstruction, /hadith/);
    assert.match(request.contents[0].parts[0].text, /Earlier reply/);
    assert.match(request.contents[0].parts[0].text, /Current message/);
});

test('agent retries one transient provider failure before returning a reply', async () => {
    let attempts = 0;
    const respond = createAgent({
        client: {
            models: {
                generateContent: async () => {
                    attempts++;
                    if (attempts === 1) {
                        const error = new Error('Provider failed');
                        error.status = 500;
                        throw error;
                    }
                    return { text: 'Recovered reply' };
                },
            },
        },
    });
    assert.equal((await respond('Hello')).reply, 'Recovered reply');
    assert.equal(attempts, 2);
});

test('provider failures expose safe codes without raw provider details', async () => {
    const server = createApp(async () => {
        const error = new Error('private upstream error and credential');
        error.name = 'ApiError';
        error.status = 500;
        throw error;
    }).listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    try {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: 'Hello' }),
        });
        assert.equal(response.status, 502);
        const body = await response.json();
        assert.equal(body.code, 'AI_PROVIDER_ERROR');
        assert.doesNotMatch(JSON.stringify(body), /private upstream|credential/);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});

test('sabr retrieves patience references in English, Roman Urdu, Urdu and Arabic', () => {
    for (const query of [
        'Tell me about sabr',
        'sabar',
        'patience',
        'صبر کے بارے میں بتائیں',
        'الصَّبْر',
        'بالصبر',
    ]) {
        const verses = executeTool('search_quran', { query }).results;
        const hadiths = executeTool('search_hadith', { query }).results;
        assert.ok(
            verses.some((item) => item.reference === 'Quran 2:153'),
            query
        );
        assert.ok(
            hadiths.some((item) => item.reference === 'Sahih al-Bukhari 1469'),
            query
        );
    }
    assert.equal(
        executeTool('search_quran', { query: 'Quran 2:153' }).results[0].reference,
        'Quran 2:153'
    );
    assert.deepEqual(executeTool('search_hadith', { query: 'astronomy' }).results, []);
    assert.deepEqual(executeTool('search_hadith', { query: 'behaviour' }).results, []);
});

test('explicit faith queries retrieve before generation even when model skips tools', async () => {
    let request;
    const respond = createAgent({
        client: {
            models: {
                generateContent: async (value) => {
                    request = value;
                    return { text: 'Patience is discussed in Quran 2:153.' };
                },
            },
        },
    });
    const result = await respond('Tell me about sabr', { source: 'both' });
    assert.equal(result.toolCalls.length, 2);
    assert.match(request.contents[0].parts[0].text, /Quran 2:153/);
    assert.match(request.contents[0].parts[0].text, /Sahih al-Bukhari 1469/);
    const quranOnly = await respond('Tell me about sabr', { source: 'quran' });
    assert.deepEqual(
        quranOnly.toolCalls.map((call) => call.name),
        ['search_quran']
    );
});

test('source selection limits advertised tools and blocks a disabled source', async () => {
    let count = 0;
    const call = { name: 'search_hadith', args: { query: 'patience' } };
    const respond = createAgent({
        client: {
            models: {
                generateContent: async (request) => {
                    assert.deepEqual(
                        request.config.tools[0].functionDeclarations.map((tool) => tool.name),
                        ['search_quran']
                    );
                    if (count++ === 0)
                        return {
                            functionCalls: [call],
                            candidates: [
                                { content: { role: 'model', parts: [{ functionCall: call }] } },
                            ],
                        };
                    assert.match(
                        request.contents[2].parts[0].functionResponse.response.error,
                        /not enabled/
                    );
                    return { text: 'Quran reflection.' };
                },
            },
        },
    });
    const result = await respond('Tell me about sabr', { source: 'quran' });
    assert.ok(result.toolCalls[0].result.results.every((entry) => entry.type === 'quran'));
    assert.ok(result.toolCalls[1].result.error);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire, Module } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { transform } from 'esbuild';

// Exercise the real plugin with React lifecycle updates; no API or browser network calls.
test('Select2 syncs React values, events, disabled state, RTL and unmount cleanup', async () => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
        url: 'http://localhost:3000',
    });
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    globalThis.MutationObserver = dom.window.MutationObserver;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const require = createRequire(import.meta.url);
    const React = require('react');
    const { createRoot } = require('react-dom/client');
    const $ = require('jquery');
    const filename = fileURLToPath(new URL('../src/components/Select2.jsx', import.meta.url));
    const source = await readFile(filename, 'utf8');
    const compiled = await transform(source, { loader: 'jsx', format: 'cjs', jsx: 'transform' });
    const wrapper = new Module(filename);
    wrapper.filename = filename;
    wrapper.paths = Module._nodeModulePaths(path.dirname(filename));
    wrapper._compile(compiled.code, filename);
    const Select2 = wrapper.exports.default;
    const root = createRoot(document.getElementById('root'));
    const changes = [];
    const props = {
        value: 'en',
        onChange: (value) => changes.push(value),
        label: 'Language',
        options: [
            { value: 'en', label: 'English' },
            { value: 'ur', label: 'Urdu' },
        ],
    };
    try {
        await React.act(async () => root.render(React.createElement(Select2, props)));
        const select = document.querySelector('select');
        assert.ok(select.classList.contains('select2-hidden-accessible'));
        assert.equal(
            document.querySelector('[role="combobox"]').getAttribute('aria-label'),
            'Language'
        );
        await React.act(async () => $(select).val('ur').trigger('change'));
        assert.deepEqual(changes, ['ur']);
        await React.act(async () =>
            root.render(
                React.createElement(Select2, { ...props, value: 'ur', disabled: true, dir: 'rtl' })
            )
        );
        assert.equal(document.querySelector('select').disabled, true);
        assert.match(document.querySelector('.select2-selection__rendered').textContent, /Urdu/);
        assert.equal(document.querySelector('.select2-container').getAttribute('dir'), 'rtl');
        assert.deepEqual(changes, ['ur'], 'controlled updates must not notify the parent again');
        await React.act(async () => root.unmount());
        assert.equal(document.querySelectorAll('.select2-container').length, 0);
    } finally {
        dom.window.close();
        delete globalThis.window;
        delete globalThis.document;
        delete globalThis.MutationObserver;
        delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    }
});

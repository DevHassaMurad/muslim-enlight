import React, { useEffect, useRef, useState } from 'react';
import { copy } from './locales/translations';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Onboarding from './components/Onboarding';
import ChatPanel from './components/ChatPanel';
import ResetDialog from './components/ResetDialog';
import AuthDialog from './components/AuthDialog';
import useAccount from './hooks/useAccount';
import { accountRequest } from './services/accountApi';
import { accountCopy } from './locales/accountCopy';

export default function App() {
    const account = useAccount();
    const [authOpen, setAuthOpen] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [accountBusy, setAccountBusy] = useState(false);
    const [language, setLanguage] = useState('en');
    const [step, setStep] = useState(0);
    const [focus, setFocus] = useState('reflection');
    const [source, setSource] = useState('both');
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const [failedQuery, setFailedQuery] = useState('');
    const [resetOpen, setResetOpen] = useState(false);
    const [direction, setDirection] = useState('auto');
    const end = useRef(null);
    const textarea = useRef(null);
    const resetDialog = useRef(null);
    const lock = useRef(false);
    const abort = useRef(null);
    const t = copy[language];
    const accountLabels = accountCopy[language];
    const rtl = language !== 'en';
    const inChat = step === 4;
    useEffect(() => {
        document.documentElement.lang = language;
        document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    }, [language, rtl]);
    useEffect(() => {
        end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, pending]);
    useEffect(() => () => abort.current?.abort(), []);
    useEffect(() => {
        if (resetOpen) resetDialog.current?.showModal();
        else resetDialog.current?.close();
    }, [resetOpen]);

    async function send(query = input, retry = false) {
        query = query.trim();
        if (!query || query.length > 4000 || lock.current || accountBusy || !account.ready) return;
        lock.current = true;
        setPending(true);
        setError('');
        setFailedQuery('');
        if (!retry) setMessages((prev) => [...prev, { role: 'user', text: query }]);
        setInput('');
        abort.current = new AbortController();
        const timeout = setTimeout(() => abort.current.abort(), 135000);
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: abort.current.signal,
                body: JSON.stringify({
                    query,
                    language,
                    focus,
                    source,
                    conversationId,
                    save: Boolean(account.user && (conversationId || messages.length === 0)),
                    history: (retry ? messages.slice(0, -1) : messages)
                        .slice(-6)
                        .map((m) => ({ role: m.role, text: m.text.slice(0, 1500) })),
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                if (data.code === 'ACCOUNT_ERROR') account.setAccountError(data.error);
                const requestError = new Error('Request failed');
                requestError.code = data.code;
                throw requestError;
            }
            if (typeof data.reply !== 'string' || !data.reply.trim())
                throw new Error('Empty response');
            const refs = [
                ...new Map(
                    (data.toolCalls || [])
                        .flatMap((call) => call.result?.results || [])
                        .filter((ref) =>
                            /^https:\/\/(quran\.com|sunnah\.com)\//.test(ref.url || '')
                        )
                        .map((ref) => [ref.url, ref])
                ).values(),
            ];
            setMessages((prev) => [...prev, { role: 'assistant', text: data.reply, refs }]);
            if (data.conversationId) {
                setConversationId(data.conversationId);
                await account.refreshChats();
            }
        } catch (err) {
            setError(err.code || (err.name === 'AbortError' ? 'AI_TIMEOUT' : 'request'));
            setFailedQuery(query);
        } finally {
            clearTimeout(timeout);
            lock.current = false;
            setPending(false);
            textarea.current?.focus();
        }
    }
    function reset() {
        setConversationId(null);
        setMessages([]);
        setInput('');
        setError('');
        setFailedQuery('');
        setResetOpen(false);
    }

    async function openConversation(id) {
        if (lock.current || accountBusy) return;
        setAccountBusy(true);
        try {
            const saved = await accountRequest(`/conversations/${id}`);
            setConversationId(saved.id);
            setMessages(saved.messages);
            setInput('');
            setError('');
            setFailedQuery('');
            if (saved.preferences.language) setLanguage(saved.preferences.language);
            if (saved.preferences.focus) setFocus(saved.preferences.focus);
            if (saved.preferences.source) setSource(saved.preferences.source);
            setStep(4);
            account.setAccountError('');
        } catch (error) {
            account.setAccountError(error.message);
        } finally {
            setAccountBusy(false);
        }
    }

    async function saveGuestConversation() {
        if (lock.current || accountBusy || !messages.length) return;
        setAccountBusy(true);
        try {
            const saved = await accountRequest('/conversations', {
                method: 'POST',
                body: JSON.stringify({ messages }),
            });
            setConversationId(saved.id);
            await account.refreshChats();
        } catch (error) {
            account.setAccountError(error.message);
        } finally {
            setAccountBusy(false);
        }
    }

    async function signOut() {
        if (lock.current || accountBusy) return;
        setAccountBusy(true);
        try {
            await account.logout();
            reset();
        } catch (error) {
            account.setAccountError(error.message);
        } finally {
            setAccountBusy(false);
        }
    }

    async function deleteConversation(id) {
        if (lock.current || accountBusy || !window.confirm(accountLabels.deleteConfirm)) return;
        setAccountBusy(true);
        try {
            await accountRequest(`/conversations/${id}`, { method: 'DELETE' });
            if (id === conversationId) reset();
            await account.refreshChats();
        } catch (error) {
            account.setAccountError(error.message);
        } finally {
            setAccountBusy(false);
        }
    }
    return (
        <div className="app-shell">
            <div className="ambient ambient-one" />
            <div className="ambient ambient-two" />
            <div className="texture" />
            <Sidebar
                t={t}
                pending={pending || accountBusy || !account.ready}
                inChat={inChat}
                messages={messages}
                setResetOpen={setResetOpen}
                reset={reset}
                account={account}
                labels={accountLabels}
                conversationId={conversationId}
                onSignIn={() => setAuthOpen(true)}
                onSignOut={signOut}
                onOpen={openConversation}
                onDelete={deleteConversation}
            />
            <main>
                <Header t={t} language={language} setLanguage={setLanguage} />
                {account.accountError && (
                    <div className="account-alert error" role="alert">
                        {account.accountError}
                        <button onClick={account.refreshChats}>{accountLabels.retry}</button>
                    </div>
                )}
                {accountBusy && (
                    <p className="account-status" role="status">
                        {accountLabels.loading}
                    </p>
                )}
                {account.user && messages.length > 0 && !conversationId && inChat && (
                    <div className="guest-save-banner glass">
                        <p>{accountLabels.unsaved}</p>
                        <button
                            className="back"
                            disabled={pending || accountBusy}
                            onClick={saveGuestConversation}
                        >
                            {accountLabels.saveGuest}
                        </button>
                    </div>
                )}
                {!inChat ? (
                    <Onboarding
                        t={t}
                        step={step}
                        setStep={setStep}
                        language={language}
                        setLanguage={setLanguage}
                        focus={focus}
                        setFocus={setFocus}
                        source={source}
                        setSource={setSource}
                    />
                ) : (
                    <ChatPanel
                        language={language}
                        t={t}
                        messages={messages}
                        pending={pending || accountBusy || !account.ready}
                        input={input}
                        setInput={setInput}
                        textarea={textarea}
                        direction={direction}
                        setDirection={setDirection}
                        send={send}
                        error={error}
                        failedQuery={failedQuery}
                        end={end}
                        focus={focus}
                        source={source}
                        setSource={setSource}
                        setFocus={setFocus}
                        saved={Boolean(account.user && conversationId)}
                        savedNote={accountLabels.savedNote}
                    />
                )}
                <footer>
                    <span>✧</span> {t.small}
                </footer>
            </main>
            <ResetDialog
                t={t}
                resetDialog={resetDialog}
                setResetOpen={setResetOpen}
                reset={reset}
            />
            <AuthDialog
                open={authOpen}
                onClose={() => setAuthOpen(false)}
                authenticate={account.authenticate}
                labels={accountLabels}
            />
        </div>
    );
}

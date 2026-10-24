import Composer from './Composer';
import ChatPreferences from './ChatPreferences';
import { apiErrors } from '../locales/apiErrors';
import MessageList from './MessageList';
import React, { lazy, Suspense } from 'react';
import Icon from './Icon';

const BotCompanion = lazy(() => import('./BotCompanion'));
const moodIcons = ['ripple', 'calm', 'bolt', 'cloud', 'sun'];

export default function ChatPanel({
    t,
    messages,
    pending,
    input,
    setInput,
    textarea,
    direction,
    setDirection,
    send,
    error,
    failedQuery,
    end,
    focus,
    source,
    setFocus,
    setSource,
    language,
    saved,
    savedNote,
}) {
    return (
        <div className="chat-layout">
            <section className="conversation" aria-label={t.home}>
                <div className={`chat-welcome ${messages.length ? 'compact' : ''}`}>
                    <Suspense fallback={<div className="bot-companion" aria-hidden="true" />}>
                        <BotCompanion thinking={pending} />
                    </Suspense>
                    <p className="greeting">{t.greeting}</p>
                    <h1>{t.chatTitle}</h1>
                    <p>{t.chatDesc}</p>
                </div>
                <ChatPreferences
                    t={t}
                    language={language}
                    source={source}
                    setSource={setSource}
                    focus={focus}
                    setFocus={setFocus}
                    pending={pending}
                    onTopic={(prompt) => {
                        setInput(prompt);
                        textarea.current?.focus();
                    }}
                />
                <div className="moods">
                    <p className="overline">{t.moodTitle}</p>
                    <div className="mood-list">
                        {t.moods.map((mood, i) => (
                            <button
                                key={i}
                                disabled={pending}
                                onClick={() => {
                                    setInput(t.prompts[i]);
                                    textarea.current?.focus();
                                }}
                            >
                                <span className="mood-icon" aria-hidden="true">
                                    <Icon name={moodIcons[i]} width="16" height="16" />
                                </span>
                                {mood}
                            </button>
                        ))}
                    </div>
                </div>
                <MessageList t={t} messages={messages} pending={pending} end={end} />
                {error && (
                    <div className="error" role="alert">
                        {apiErrors[language]?.[error] || t.error}
                        {error !== 'request' && (
                            <small className="error-code" dir="ltr">
                                {error}
                            </small>
                        )}
                        <button disabled={pending} onClick={() => send(failedQuery, true)}>
                            {t.retry}
                        </button>
                    </div>
                )}
                <Composer
                    language={language}
                    t={t}
                    input={input}
                    setInput={setInput}
                    textarea={textarea}
                    direction={direction}
                    setDirection={setDirection}
                    send={send}
                    pending={pending}
                />
            </section>
            <aside className="context-panel">
                <div className="intention glass">
                    <span className="context-icon">
                        <Icon name="leaf" />
                    </span>
                    <p className="overline">{t.prefs}</p>
                    <h2>{t[focus]}</h2>
                    <div className="source-pill">
                        <Icon name="book" width="14" height="14" />
                        {t[source]}
                    </div>
                </div>
                <div className="context-note">
                    <span className="tiny-star">✧</span>
                    <p>{saved ? savedNote : t.privacyBody}</p>
                </div>
            </aside>
        </div>
    );
}

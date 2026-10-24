import React from 'react';
import Icon from './Icon';

export default function MessageList({ t, messages, pending, end }) {
    return (
        <div className="message-list" aria-live="polite" aria-busy={pending}>
            {messages.map((message, i) => (
                <article key={i} className={`message ${message.role}`}>
                    <div className="message-heading">
                        <span className="avatar">
                            {message.role === 'assistant' ? (
                                <Icon name="spark" width="16" height="16" />
                            ) : (
                                <Icon name="heart" width="16" height="16" />
                            )}
                        </span>
                        {message.role === 'user' ? t.you : t.assistant}
                    </div>
                    <div className="message-text" dir="auto">
                        {message.text}
                    </div>
                    {message.role === 'assistant' && (
                        <div className="references">
                            {message.refs.length ? (
                                <>
                                    <p className="reference-label">
                                        <Icon name="book" width="15" height="15" />
                                        {t.sourceLabel}
                                    </p>
                                    {message.refs.map((ref) => (
                                        <a
                                            key={ref.url}
                                            href={ref.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="reference-card"
                                        >
                                            <div>
                                                <span className="reference-type">
                                                    {ref.type === 'quran' ? t.quran : t.hadith}
                                                </span>
                                                <strong dir="auto">{ref.reference}</strong>
                                                <p dir="auto">{ref.summary}</p>
                                                <small>{t.paraphrase}</small>
                                            </div>
                                            <span className="reference-link">
                                                {t.original}
                                                <Icon name="external" width="14" height="14" />
                                            </span>
                                        </a>
                                    ))}
                                </>
                            ) : (
                                <p className="no-references">{t.noRefs}</p>
                            )}
                        </div>
                    )}
                </article>
            ))}
            {pending && (
                <div className="loading-reflection" role="status">
                    <div className="thinking">
                        <span />
                        <span />
                        <span />
                        {t.thinking}
                    </div>
                    <div className="skeleton-line" aria-hidden="true" />
                    <div className="skeleton-line" aria-hidden="true" />
                    <div className="skeleton-line" aria-hidden="true" />
                </div>
            )}
            <div ref={end} />
        </div>
    );
}

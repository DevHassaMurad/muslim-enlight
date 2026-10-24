import React from 'react';
import Icon from './Icon';

export default function Sidebar({
    t,
    pending,
    inChat,
    messages,
    setResetOpen,
    reset,
    account,
    labels,
    conversationId,
    onSignIn,
    onSignOut,
    onOpen,
    onDelete,
}) {
    return (
        <aside className="sidebar glass">
            <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
                <span className="brand-icon">
                    <Icon name="moon" width="26" height="26" />
                </span>
                <span>
                    {t.brand}
                    <small>{t.small}</small>
                </span>
            </a>
            <button
                className="new-chat"
                disabled={pending || !inChat}
                onClick={() => (messages.length ? setResetOpen(true) : reset())}
            >
                <Icon name="plus" />
                {t.newChat}
            </button>
            <p className="overline nav-caption">{t.sanctuary}</p>
            <div className="nav-item">
                <Icon name="leaf" />
                {t.home}
                <span className="active-dot" />
            </div>
            <section className="account-section">
                {account.user ? (
                    <>
                        <div className="account-identity">
                            <span dir="auto">{account.user.username}</span>
                            <button disabled={pending} onClick={onSignOut}>
                                {labels.signOut}
                            </button>
                        </div>
                        <p className="account-caption">{labels.saved}</p>
                    </>
                ) : (
                    <>
                        <p className="account-caption">{labels.guestNote}</p>
                        <button className="account-signin" disabled={pending} onClick={onSignIn}>
                            {labels.signIn} / {labels.signUp}
                        </button>
                    </>
                )}
            </section>
            {account.user && (
                <section className="recent-section" aria-label={labels.recent}>
                    <div className="recent-heading">
                        <p className="overline">{labels.recent}</p>
                        <span className="recent-count">
                            {account.recent.length}
                            {account.nextCursor ? '+' : ''}
                        </span>
                    </div>
                    {account.recent.length === 0 && (
                        <div className="recent-empty">
                            <span className="recent-empty-icon">
                                <Icon name="book" width="19" height="19" />
                            </span>
                            <p>{labels.empty}</p>
                        </div>
                    )}
                    {account.recent.length > 0 && (
                        <div
                            className="recent-list"
                            tabIndex={0}
                            role="region"
                            aria-label={labels.recent}
                        >
                            {account.recent.map((chat) => (
                                <div
                                    key={chat.id}
                                    className={`recent-chat ${conversationId === chat.id ? 'is-active' : ''}`}
                                >
                                    <button
                                        className="recent-open"
                                        disabled={pending}
                                        aria-current={
                                            conversationId === chat.id ? 'page' : undefined
                                        }
                                        onClick={() => onOpen(chat.id)}
                                    >
                                        <span
                                            className="recent-title"
                                            dir="auto"
                                            title={chat.title}
                                        >
                                            {chat.title}
                                        </span>
                                        <time dateTime={new Date(chat.updated).toISOString()}>
                                            {new Date(chat.updated).toLocaleDateString()}
                                        </time>
                                    </button>
                                    <button
                                        className="recent-delete"
                                        disabled={pending}
                                        aria-label={`${labels.delete}: ${chat.title}`}
                                        onClick={() => onDelete(chat.id)}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {account.nextCursor && (
                        <button
                            type="button"
                            className="recent-load-more"
                            disabled={pending || account.loadingMore}
                            onClick={account.loadMore}
                        >
                            {account.loadingMore ? labels.busy : labels.loadMore}
                            <Icon name="plus" width="13" height="13" />
                        </button>
                    )}
                </section>
            )}
            {!account.user && (
                <div className="sidebar-art" aria-hidden="true">
                    <div className="arch">
                        <div className="arch-inner">
                            <span>☾</span>
                            <i />
                            <i />
                            <i />
                        </div>
                    </div>
                    <div className="art-caption">بِسْمِ اللَّهِ</div>
                </div>
            )}
            <div className="side-bottom">
                <div className="reminder">
                    <Icon name="heart" />
                    <p>
                        <strong>{t.privacy}</strong>
                        {t.disclaimer}
                    </p>
                </div>
                <span className="prototype">{t.resultsNote}</span>
            </div>
        </aside>
    );
}

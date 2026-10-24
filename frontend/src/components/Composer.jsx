import React from 'react';
import Icon from './Icon';
import Select2 from './Select2';

export default function Composer({
    t,
    input,
    setInput,
    textarea,
    direction,
    setDirection,
    send,
    pending,
    language,
}) {
    return (
        <div className="composer-wrap">
            <form
                className={`composer glass ${pending ? 'is-pending' : ''}`}
                aria-busy={pending}
                onSubmit={(e) => {
                    e.preventDefault();
                    send();
                }}
            >
                {pending && <div className="request-progress" aria-hidden="true" />}
                <label htmlFor="message" className="sr-only">
                    {t.placeholder}
                </label>
                <textarea
                    id="message"
                    ref={textarea}
                    value={input}
                    maxLength={4000}
                    dir={direction}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t.placeholder}
                    rows="2"
                    disabled={pending}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            send();
                        }
                    }}
                />
                <div className="composer-bottom">
                    <label className="direction-control">
                        <span className="sr-only">{t.direction}</span>
                        <Select2
                            label={t.direction}
                            value={direction}
                            onChange={setDirection}
                            disabled={pending}
                            dir={language === 'en' ? 'ltr' : 'rtl'}
                            options={[
                                { value: 'auto', label: t.auto },
                                { value: 'ltr', label: t.ltr },
                                { value: 'rtl', label: t.rtl },
                            ]}
                        />
                    </label>
                    <span className="char-count">{input.length}/4000</span>
                    <button
                        className="send"
                        type="submit"
                        disabled={pending || !input.trim()}
                        aria-label={t.send}
                    >
                        {pending ? (
                            <span className="send-spinner" aria-hidden="true" />
                        ) : (
                            <Icon name="send" />
                        )}
                    </button>
                </div>
            </form>
            <p className="composer-note">{t.note}</p>
        </div>
    );
}

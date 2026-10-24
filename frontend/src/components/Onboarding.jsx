import React from 'react';
import Icon from './Icon';
import { languages } from '../constants/options';

export default function Onboarding({
    t,
    step,
    setStep,
    language,
    setLanguage,
    focus,
    setFocus,
    source,
    setSource,
}) {
    const option = (key, icon) => (
        <button
            type="button"
            key={key}
            className={`option ${(step === 2 ? focus : source) === key ? 'chosen' : ''}`}
            onClick={() => (step === 2 ? setFocus(key) : setSource(key))}
            aria-pressed={(step === 2 ? focus : source) === key}
        >
            <span className="option-icon">
                <Icon name={icon} />
            </span>
            <span>{t[key]}</span>
            <span className="radio">
                {(step === 2 ? focus : source) === key && (
                    <Icon name="check" width="13" height="13" />
                )}
            </span>
        </button>
    );

    return (
        <section className={`onboarding ${step === 0 ? 'welcome-screen' : ''}`}>
            <div className="welcome-ornament" aria-hidden="true">
                <span />
                <Icon name="spark" width="12" height="12" />
                <span />
            </div>
            <div className="intro-decoration">
                <Icon
                    name={
                        step === 0 ? 'leaf' : step === 1 ? 'globe' : step === 2 ? 'heart' : 'book'
                    }
                    width="32"
                    height="32"
                />
            </div>
            <p className="overline gold">{t.small}</p>
            <h1>
                {step === 0
                    ? t.welcome
                    : step === 1
                      ? t.langTitle
                      : step === 2
                        ? t.focusTitle
                        : t.sourceTitle}
            </h1>
            <p className="intro-copy">
                {step === 0
                    ? t.intro
                    : step === 1
                      ? t.langDesc
                      : step === 2
                        ? t.focusDesc
                        : t.sourceDesc}
            </p>
            <div className="onboard-card glass">
                {step === 0 ? (
                    <>
                        <div className="welcome-line">
                            <span className="welcome-feature-icon">
                                <Icon name="heart" />
                            </span>
                            <span>{t.reflection}</span>
                            <span className="feature-index" aria-hidden="true">
                                01
                            </span>
                        </div>
                        <div className="welcome-line">
                            <span className="welcome-feature-icon">
                                <Icon name="book" />
                            </span>
                            <span>{t.both}</span>
                            <span className="feature-index" aria-hidden="true">
                                02
                            </span>
                        </div>
                        <div className="welcome-line">
                            <span className="welcome-feature-icon">
                                <Icon name="globe" />
                            </span>
                            <span>English · اردو · العربية</span>
                        </div>
                        <p className="privacy-copy">
                            <Icon name="leaf" width="14" height="14" />
                            <span>{t.privacyBody}</span>
                        </p>
                    </>
                ) : step === 1 ? (
                    languages.map(([code, label, badge]) => (
                        <button
                            key={code}
                            className={`option ${language === code ? 'chosen' : ''}`}
                            onClick={() => setLanguage(code)}
                            aria-pressed={language === code}
                        >
                            <span className="lang-badge">{badge}</span>
                            <span lang={code}>{label}</span>
                            <span className="radio">
                                {language === code && <Icon name="check" width="13" height="13" />}
                            </span>
                        </button>
                    ))
                ) : step === 2 ? (
                    [
                        option('reflection', 'heart'),
                        option('behaviour', 'leaf'),
                        option('comfort', 'spark'),
                    ]
                ) : (
                    [option('both', 'spark'), option('quran', 'book'), option('hadith', 'leaf')]
                )}
                <div className="onboard-actions">
                    {step > 0 && (
                        <button className="back" onClick={() => setStep(step - 1)}>
                            {t.back}
                        </button>
                    )}
                    <button className="primary" onClick={() => setStep(step + 1)}>
                        {step === 0 ? t.begin : step === 3 ? t.enter : t.next}
                        <Icon name="arrow" className="directional" />
                    </button>
                </div>
            </div>
            <div className="step-dots" aria-label={`${t.step} ${step + 1} ${t.of} 4`}>
                {[0, 1, 2, 3].map((n) => (
                    <span key={n} className={step >= n ? 'filled' : ''} />
                ))}
            </div>
            <p className="step-caption">
                {t.step} {step + 1} {t.of} 4
            </p>
        </section>
    );
}

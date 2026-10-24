import React from 'react';
import Icon from './Icon';
import Select2 from './Select2';
import { chatControls } from '../locales/chatControls';

export default function ChatPreferences({
    t,
    language,
    source,
    setSource,
    focus,
    setFocus,
    pending,
    onTopic,
}) {
    const labels = chatControls[language] || chatControls.en;

    return (
        <section className="chat-preferences glass" aria-label={t.prefs}>
            <div className="preference-row">
                <fieldset className="source-options" disabled={pending}>
                    <legend>{labels.sources}</legend>
                    <div className="source-segments">
                        {['both', 'quran', 'hadith'].map((value) => (
                            <label
                                key={value}
                                className={`source-segment ${source === value ? 'is-selected' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="chat-source"
                                    value={value}
                                    checked={source === value}
                                    onChange={() => setSource(value)}
                                />
                                <Icon
                                    name={value === 'both' ? 'spark' : 'book'}
                                    width="14"
                                    height="14"
                                />
                                <span>{t[value]}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
                <label className="focus-control">
                    <span>{labels.focus}</span>
                    <Select2
                        label={labels.focus}
                        value={focus}
                        onChange={setFocus}
                        disabled={pending}
                        dir={language === 'en' ? 'ltr' : 'rtl'}
                        options={['reflection', 'behaviour', 'comfort'].map((value) => ({
                            value,
                            label: t[value],
                        }))}
                    />
                </label>
            </div>
            <p className="preference-hint">{labels.hint}</p>
            <div className="topic-suggestions">
                <span>{labels.topics}</span>
                <div>
                    {labels.topicLabels.map((topic, index) => (
                        <button
                            type="button"
                            key={topic}
                            disabled={pending}
                            onClick={() => onTopic(labels.topicPrompts[index])}
                        >
                            {topic}
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}

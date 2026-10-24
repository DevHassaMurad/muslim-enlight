import React from 'react';
import Icon from './Icon';
import Select2 from './Select2';
import { languages } from '../constants/options';

export default function Header({ t, language, setLanguage }) {
    return (
        <header>
            <span className="breadcrumb">
                <span className="live-dot" />
                {t.tagline}
            </span>
            <label className="language-control">
                <Icon name="globe" />
                <span className="sr-only">{t.settings}</span>
                <Select2
                    label={t.settings}
                    value={language}
                    onChange={setLanguage}
                    dir={language === 'en' ? 'ltr' : 'rtl'}
                    options={languages.map(([value, label]) => ({ value, label }))}
                    searchable
                />
            </label>
        </header>
    );
}

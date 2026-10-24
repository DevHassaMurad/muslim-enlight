import React, { useEffect, useRef } from 'react';
import $ from 'jquery';
import attachSelect2 from 'select2';

/** React owns the host; Select2 owns the select and generated DOM inside it. */
export default function Select2({
    value,
    onChange,
    options,
    label,
    disabled = false,
    dir = 'ltr',
    searchable = false,
}) {
    const host = useRef(null);
    const control = useRef(null);
    const changeHandler = useRef(onChange);
    const currentValue = useRef(value);
    changeHandler.current = onChange;
    currentValue.current = value;
    const optionsKey = JSON.stringify(options);

    useEffect(() => {
        if (!$.fn.select2) attachSelect2(window, $);
        const select = document.createElement('select');
        select.setAttribute('aria-label', label);
        for (const option of JSON.parse(optionsKey)) {
            select.add(new window.Option(option.label, option.value));
        }
        host.current.appendChild(select);
        const element = $(select);
        control.current = element;
        element.val(currentValue.current).select2({
            width: '100%',
            dir,
            theme: 'enlight',
            minimumResultsForSearch: searchable ? 0 : Infinity,
            dropdownParent: $(host.current.closest('dialog') || document.body),
        });
        element.on('change.enlightSelect', () => changeHandler.current(element.val()));
        element.data('select2').$selection.attr('aria-label', label);
        element.on('select2:open.enlightSelect', () => {
            const search = element.data('select2').$dropdown.find('.select2-search__field');
            search.attr('aria-label', label);
            if (searchable) search.trigger('focus');
        });
        return () => {
            element.off('.enlightSelect');
            element.select2('destroy');
            select.remove();
            control.current = null;
        };
    }, [optionsKey, label, dir, searchable]);

    useEffect(() => {
        control.current?.prop('disabled', disabled).val(value).trigger('change.select2');
    }, [value, disabled, optionsKey, label, dir, searchable]);

    return <span ref={host} className="enlight-select-host" />;
}

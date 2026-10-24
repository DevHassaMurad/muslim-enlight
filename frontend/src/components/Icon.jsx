import React from 'react';

export default function Icon({ name = 'spark', ...props }) {
    const paths = {
        calm: (
            <>
                <path d="M3 8c3-5 6 5 9 0s6 5 9 0M3 15c3-5 6 5 9 0s6 5 9 0" />
            </>
        ),
        bolt: <path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z" />,
        cloud: <path d="M6 18a4 4 0 0 1-1-7.9A6 6 0 0 1 17 9a4.5 4.5 0 0 1 .5 9Z" />,
        sun: (
            <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
            </>
        ),
        ripple: (
            <>
                <circle cx="12" cy="12" r="3" />
                <path d="M7 4a9 9 0 0 1 10 0M20 7a9 9 0 0 1 0 10M17 20a9 9 0 0 1-10 0M4 17A9 9 0 0 1 4 7" />
            </>
        ),
        spark: (
            <>
                <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />
            </>
        ),
        arrow: (
            <>
                <path d="M5 12h14m-6-6 6 6-6 6" />
            </>
        ),
        plus: <path d="M12 5v14M5 12h14" />,
        leaf: (
            <>
                <path d="M20 4C9 2 3 7 5 14s15 8 15-10Z" />
                <path d="m5 20 10-11" />
            </>
        ),
        book: (
            <>
                <path d="M12 6C9 3 5 3 2 4v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-3-1-7-1-10 2Zm0 0v14" />
            </>
        ),
        heart: (
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
        ),
        globe: (
            <>
                <circle cx="12" cy="12" r="9" />
                <ellipse cx="12" cy="12" rx="4" ry="9" />
                <path d="M3 12h18" />
            </>
        ),
        send: (
            <>
                <path d="m3 11 18-8-8 18-3-8-7-2Z" />
                <path d="m10 13 11-10" />
            </>
        ),
        external: (
            <>
                <path d="M14 3h7v7m0-7L10 14" />
                <path d="M10 3H4v17h17v-6" />
            </>
        ),
        check: <path d="m5 12 4 4L19 6" />,
        moon: <path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z" />,
    };
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            {paths[name]}
        </svg>
    );
}

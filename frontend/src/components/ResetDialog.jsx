import React from 'react';
import Icon from './Icon';

export default function ResetDialog({ t, resetDialog, setResetOpen, reset }) {
    return (
        <dialog
            ref={resetDialog}
            className="reset-dialog glass"
            aria-labelledby="reset-title"
            onCancel={() => setResetOpen(false)}
            onClose={() => setResetOpen(false)}
        >
            <h2 id="reset-title">{t.reset}</h2>
            <button className="primary" onClick={reset}>
                {t.confirm}
            </button>
            <button className="back" autoFocus onClick={() => setResetOpen(false)}>
                {t.cancel}
            </button>
        </dialog>
    );
}

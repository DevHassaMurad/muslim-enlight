import React, { useEffect, useRef, useState } from 'react';

export default function AuthDialog({ open, onClose, authenticate, labels }) {
    const dialog = useRef(null);
    const [mode, setMode] = useState('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) dialog.current?.showModal();
        else {
            dialog.current?.close();
            setPassword('');
            setError('');
        }
    }, [open]);

    async function submit(event) {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setError('');
        try {
            await authenticate(mode, { username, password });
            setPassword('');
            onClose();
        } catch (error) {
            setError(error.message);
        } finally {
            setBusy(false);
        }
    }
    return (
        <dialog
            ref={dialog}
            className="auth-dialog glass"
            aria-labelledby="auth-title"
            onCancel={(event) => {
                if (busy) event.preventDefault();
                else onClose();
            }}
        >
            <div className="auth-tabs">
                {['login', 'register'].map((value) => (
                    <button
                        type="button"
                        key={value}
                        aria-pressed={mode === value}
                        disabled={busy}
                        onClick={() => {
                            setMode(value);
                            setError('');
                        }}
                    >
                        {value === 'login' ? labels.signIn : labels.signUp}
                    </button>
                ))}
            </div>
            <h2 id="auth-title">{mode === 'login' ? labels.loginTitle : labels.registerTitle}</h2>
            <p>{labels.accountNote}</p>
            <form onSubmit={submit}>
                <label>
                    {labels.username}
                    <input
                        autoFocus
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        autoComplete="username"
                        required
                        minLength={3}
                        maxLength={30}
                        pattern="[a-zA-Z0-9_]+"
                        disabled={busy}
                        dir="ltr"
                    />
                    <small>{labels.usernameHint}</small>
                </label>
                <label>
                    {labels.password}
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                        required
                        minLength={mode === 'register' ? 10 : 1}
                        maxLength={128}
                        disabled={busy}
                        dir="ltr"
                    />
                    {mode === 'register' && <small>{labels.passwordHint}</small>}
                </label>
                {error && (
                    <div className="error" role="alert">
                        {error}
                    </div>
                )}
                <button type="submit" className="primary" disabled={busy}>
                    {busy ? labels.busy : mode === 'login' ? labels.signIn : labels.signUp}
                </button>
            </form>
            <button type="button" className="back" disabled={busy} onClick={onClose}>
                {labels.close}
            </button>
        </dialog>
    );
}

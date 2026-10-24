import { useEffect, useRef, useState } from 'react';
import { accountRequest } from '../services/accountApi';

export default function useAccount() {
    const [user, setUser] = useState(null);
    const [recent, setRecent] = useState([]);
    const [ready, setReady] = useState(false);
    const [accountError, setAccountError] = useState('');
    const [nextCursor, setNextCursor] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const paging = useRef(false);
    const generation = useRef(0);

    async function refreshChats() {
        const version = ++generation.current;
        try {
            const data = await accountRequest('/conversations');
            if (version !== generation.current) return;
            setRecent(data.conversations);
            setNextCursor(data.nextCursor);
            setAccountError('');
        } catch (error) {
            setAccountError(error.message);
        }
    }
    async function loadMore() {
        if (!nextCursor || paging.current) return;
        paging.current = true;
        setLoadingMore(true);
        const version = generation.current;
        try {
            const data = await accountRequest(
                `/conversations?cursor=${encodeURIComponent(nextCursor)}`
            );
            if (version !== generation.current) return;
            setRecent((previous) => [
                ...new Map(
                    [...previous, ...data.conversations].map((chat) => [chat.id, chat])
                ).values(),
            ]);
            setNextCursor(data.nextCursor);
            setAccountError('');
        } catch (error) {
            if (version === generation.current) setAccountError(error.message);
        } finally {
            paging.current = false;
            setLoadingMore(false);
        }
    }
    useEffect(() => {
        let mounted = true;
        async function restore() {
            try {
                const { user: restored } = await accountRequest('/auth/me');
                if (!mounted) return;
                setUser(restored);
                if (restored) {
                    const data = await accountRequest('/conversations');
                    if (mounted) {
                        setRecent(data.conversations);
                        setNextCursor(data.nextCursor);
                    }
                }
            } catch (error) {
                if (mounted) setAccountError(error.message);
            } finally {
                if (mounted) setReady(true);
            }
        }
        restore();
        return () => {
            mounted = false;
        };
    }, []);
    async function authenticate(mode, credentials) {
        const { user: loggedIn } = await accountRequest(`/auth/${mode}`, {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
        setUser(loggedIn);
        await refreshChats();
    }
    async function logout() {
        await accountRequest('/auth/logout', { method: 'POST' });
        setUser(null);
        generation.current++;
        setNextCursor(null);
        setRecent([]);
        setAccountError('');
    }
    return {
        user,
        recent,
        ready,
        accountError,
        setAccountError,
        refreshChats,
        authenticate,
        logout,
        nextCursor,
        loadingMore,
        loadMore,
    };
}

import { ApiError } from '@shared/http';
import { createStore, useStore } from '@shared/store';
import * as api from './api';
import type { AdminUser, Permission } from './types';

/**
 * Who is signed in. `unknown` lasts until the first GET /me answers; any 401 later
 * flips the store to `guest`, and the shell then redirects to the sign-in screen,
 * remembering where the user was.
 */
export type SessionStatus = 'unknown' | 'authenticated' | 'guest' | 'error';

export interface SessionState {
    status: SessionStatus;
    user: AdminUser | null;
    /** Shown on the sign-in screen (expired session, account without staff access…). */
    notice: string | null;
    /** Network or server failure while checking the session. */
    error: string | null;
}

export const sessionStore = createStore<SessionState>({ status: 'unknown', user: null, notice: null, error: null });

api.setUnauthenticatedHandler(() => {
    if (sessionStore.getState().status === 'authenticated') {
        sessionStore.setState({ status: 'guest', user: null, notice: 'Votre session a expiré. Reconnectez-vous pour continuer.' });
    }
});

let pending: Promise<void> | null = null;

/** Resolves the current session once; concurrent callers share the request. */
export function loadSession(): Promise<void> {
    pending ??= api.auth
        .me()
        .then(
            (user) => sessionStore.setState({ status: 'authenticated', user, notice: null, error: null }),
            (error: unknown) => {
                if (error instanceof ApiError && error.status === 403) {
                    sessionStore.setState({
                        status: 'guest',
                        user: null,
                        notice: 'Ce compte n’a pas accès à l’administration. Connectez-vous avec un compte de l’équipe.',
                        error: null,
                    });
                } else if (error instanceof ApiError && error.status === 401) {
                    sessionStore.setState({ status: 'guest', user: null, error: null });
                } else {
                    sessionStore.setState({
                        status: 'error',
                        user: null,
                        error: error instanceof ApiError ? error.message : 'Impossible de joindre le serveur.',
                    });
                }
            },
        )
        .finally(() => {
            pending = null;
        });

    return pending;
}

export function retrySession(): Promise<void> {
    sessionStore.setState({ status: 'unknown', error: null });

    return loadSession();
}

export async function signIn(email: string, password: string, remember: boolean): Promise<AdminUser> {
    const user = await api.auth.login(email, password, remember);
    sessionStore.setState({ status: 'authenticated', user, notice: null, error: null });

    return user;
}

export async function signOut(): Promise<void> {
    try {
        await api.auth.logout();
    } finally {
        sessionStore.setState({ status: 'guest', user: null, notice: 'Vous êtes déconnecté.', error: null });
    }
}

export function hasPermission(user: AdminUser | null, permission: Permission): boolean {
    return user !== null && user.permissions.includes(permission);
}

export function useSession(): SessionState {
    return useStore(sessionStore, (state) => state);
}

export function useUser(): AdminUser | null {
    return useStore(sessionStore, (state) => state.user);
}

export function useCan(permission: Permission): boolean {
    return useStore(sessionStore, (state) => hasPermission(state.user, permission));
}

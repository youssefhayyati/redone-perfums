import type { Customer } from '@shared/types';
import { createStore, useStore } from '@shared/store';
import { api, type RegisterPayload } from '../api';
import { invalidateQueries } from '../hooks/useQuery';
import { cartActions } from './cart';

/** The signed-in customer (Sanctum cookie session). Staff accounts never appear here. */
interface SessionState {
    user: Customer | null;
    status: 'unknown' | 'guest' | 'authenticated';
}

export const sessionStore = createStore<SessionState>({ user: null, status: 'unknown' });

/** Cached account data must never outlive the session it was read with. */
function forgetAccountData(): void {
    invalidateQueries('account-');
}

function signedIn(user: Customer): Customer {
    sessionStore.setState({ user, status: 'authenticated' });

    return user;
}

export const sessionActions = {
    async load(): Promise<void> {
        try {
            const { user } = await api.me();
            sessionStore.setState({ user, status: user ? 'authenticated' : 'guest' });
        } catch {
            sessionStore.setState({ user: null, status: 'guest' });
        }
    },

    async login(email: string, password: string, remember: boolean): Promise<Customer> {
        const { user } = await api.login(email, password, remember);
        forgetAccountData();
        // The server attaches the guest bag to the account.
        void cartActions.load();

        return signedIn(user);
    },

    async register(payload: RegisterPayload): Promise<Customer> {
        const { user } = await api.register(payload);
        forgetAccountData();
        void cartActions.load();

        return signedIn(user);
    },

    async logout(): Promise<void> {
        await api.logout();
        forgetAccountData();
        sessionStore.setState({ user: null, status: 'guest' });
    },

    update(user: Customer): void {
        signedIn(user);
    },
};

export function useSession<T>(selector: (state: SessionState) => T): T {
    return useStore(sessionStore, selector);
}

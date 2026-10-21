import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Spinner } from '../../components/ui/Spinner';
import { useSession } from '../../stores/session';

/** Renders children for a signed-in customer; sends guests to the sign-in page. */
export function RequireAuth({ children }: { children: ReactNode }) {
    const status = useSession((state) => state.status);
    const location = useLocation();

    if (status === 'unknown') {
        return (
            <div className="flex justify-center py-40 text-muted" role="status" aria-label="Chargement">
                <Spinner className="size-6" />
            </div>
        );
    }

    if (status === 'guest') {
        return <Navigate to={`/compte/connexion?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
    }

    return children;
}

import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { ApiError } from '@shared/http';
import { Button } from '../../components/ui/Button';
import { Checkbox, FormAlert, TextField } from '../../components/ui/Field';
import { useHead } from '../../hooks/useHead';
import { sessionActions, useSession } from '../../stores/session';
import { AuthLayout, fieldError, safeRedirect } from './AuthLayout';

export default function LoginPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const redirect = safeRedirect(params.get('redirect'));
    const status = useSession((state) => state.status);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(true);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<ApiError | null>(null);
    useHead({ title: 'Connexion', noindex: true });

    if (status === 'authenticated' && !pending) {
        return <Navigate to={redirect} replace />;
    }

    async function submit(event: FormEvent) {
        event.preventDefault();
        setPending(true);
        setError(null);
        try {
            await sessionActions.login(email, password, remember);
            navigate(redirect, { replace: true });
        } catch (failure) {
            setError(failure instanceof ApiError ? failure : new ApiError(0, 'La connexion a échoué.'));
            setPending(false);
        }
    }

    const emailError = fieldError(error?.errors, 'email');

    return (
        <AuthLayout
            eyebrow="Mon compte"
            title="Bon retour parmi nous"
            footer={
                <>
                    Pas encore de compte ?{' '}
                    <Link to={`/compte/inscription${params.get('redirect') ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="text-ink underline underline-offset-4">
                        Créer un compte
                    </Link>
                </>
            }
        >
            <form onSubmit={submit} noValidate className="flex flex-col gap-6">
                {error && !error.isValidation && <FormAlert message={error.message} />}
                <TextField label="E-mail" type="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} error={emailError} required />
                <TextField
                    label="Mot de passe"
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    error={fieldError(error?.errors, 'password')}
                    required
                />
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                    <Checkbox label="Rester connecté" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="whitespace-nowrap" />
                    <Link to="/compte/mot-de-passe-oublie" className="link-draw text-sm whitespace-nowrap text-muted hover:text-ink">
                        Mot de passe oublié ?
                    </Link>
                </div>
                <Button type="submit" size="lg" loading={pending}>
                    Se connecter
                </Button>
            </form>
        </AuthLayout>
    );
}

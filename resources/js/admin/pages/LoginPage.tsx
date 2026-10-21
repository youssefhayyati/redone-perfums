import { useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { Eye, EyeOff, LogIn, RotateCcw } from 'lucide-react';
import { ApiError } from '@shared/http';
import { Button } from '../components/ui/Button';
import { Checkbox, Field, TextInput } from '../components/ui/form';
import { InlineAlert } from '../components/ui/feedback';
import { Splash } from '../components/layout/Splash';
import { ThemeToggle } from '../components/layout/Topbar';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { errorText, toFieldErrors, type FieldErrors } from '../lib/errors';
import { safeRedirect } from '../navigation';
import { retrySession, signIn, useSession } from '../session';

export default function LoginPage() {
    useDocumentTitle('Connexion');
    const session = useSession();
    const [params] = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [busy, setBusy] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [failure, setFailure] = useState<string | null>(null);

    if (session.status === 'unknown') {
        return <Splash />;
    }

    if (session.status === 'authenticated') {
        return <Navigate to={safeRedirect(params.get('redirect'))} replace />;
    }

    async function submit(event: FormEvent) {
        event.preventDefault();
        const nextErrors: FieldErrors = {};
        if (email.trim() === '') {
            nextErrors.email = 'Saisissez votre adresse e-mail.';
        }
        if (password === '') {
            nextErrors.password = 'Saisissez votre mot de passe.';
        }
        setErrors(nextErrors);
        setFailure(null);
        if (Object.keys(nextErrors).length > 0) {
            return;
        }

        setBusy(true);
        try {
            await signIn(email.trim(), password, remember);
            // The session store flips to `authenticated`; the redirect above takes over.
        } catch (error) {
            setBusy(false);
            if (error instanceof ApiError && error.isValidation) {
                setErrors(toFieldErrors(error));
                setPassword('');
            } else {
                setFailure(errorText(error));
            }
        }
    }

    return (
        <div className="relative flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-12">
            <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
                <ThemeToggle />
            </div>
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <p className="text-base font-semibold uppercase tracking-wordmark text-ink">Redone</p>
                    <p className="mt-2 text-2xs uppercase tracking-label text-muted">Maison de parfum · Administration</p>
                </div>
                <div className="rounded-xl border border-line bg-raised p-6 shadow-[0_24px_60px_-30px_rgb(var(--rp-shadow)/0.55)] sm:p-8">
                    <h1 className="text-lg font-semibold text-ink">Connexion</h1>
                    <p className="mt-1 text-sm text-muted">Accès réservé à l’équipe de la boutique.</p>

                    <div className="mt-6 flex flex-col gap-4">
                        {session.notice && <InlineAlert tone="info">{session.notice}</InlineAlert>}
                        {session.status === 'error' && (
                            <InlineAlert tone="danger" title="Serveur injoignable">
                                <p>{session.error}</p>
                                <button type="button" onClick={() => void retrySession()} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink underline underline-offset-4">
                                    <RotateCcw className="size-3.5" aria-hidden />
                                    Réessayer
                                </button>
                            </InlineAlert>
                        )}
                        {failure && (
                            <InlineAlert tone="danger" live>
                                {failure}
                            </InlineAlert>
                        )}
                    </div>

                    <form onSubmit={(event) => void submit(event)} noValidate className="mt-4 flex flex-col gap-4">
                        <Field label="Adresse e-mail" error={errors.email}>
                            {(control) => (
                                <TextInput
                                    {...control}
                                    type="email"
                                    autoComplete="username"
                                    inputMode="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    autoFocus
                                />
                            )}
                        </Field>
                        <Field label="Mot de passe" error={errors.password}>
                            {(control) => (
                                <div className="relative">
                                    <TextInput
                                        {...control}
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        className="pr-11"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((value) => !value)}
                                        aria-pressed={showPassword}
                                        aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                        className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-ink/[0.06] hover:text-ink"
                                    >
                                        {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                                    </button>
                                </div>
                            )}
                        </Field>
                        <Checkbox label="Rester connecté sur cet appareil" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                        <Button type="submit" variant="primary" block loading={busy} icon={LogIn} className="mt-2 h-10">
                            Se connecter
                        </Button>
                    </form>
                </div>
                <p className="mt-6 text-center text-xs text-muted">
                    Mot de passe oublié ? Contactez un administrateur de la boutique.
                </p>
            </div>
        </div>
    );
}

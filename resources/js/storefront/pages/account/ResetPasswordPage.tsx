import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ApiError } from '@shared/http';
import { api } from '../../api';
import { Button, ButtonLink } from '../../components/ui/Button';
import { FormAlert, TextField } from '../../components/ui/Field';
import { useHead } from '../../hooks/useHead';
import { AuthLayout, fieldError } from './AuthLayout';
import { t } from '../../i18n';

export default function ResetPasswordPage() {
    const [params] = useSearchParams();
    const token = params.get('token') ?? '';
    const [email, setEmail] = useState(params.get('email') ?? '');
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [pending, setPending] = useState(false);
    const [done, setDone] = useState<string | null>(null);
    const [error, setError] = useState<ApiError | null>(null);
    useHead({ title: t('Nouveau mot de passe'), noindex: true });

    async function submit(event: FormEvent) {
        event.preventDefault();
        setPending(true);
        setError(null);
        try {
            setDone((await api.resetPassword({ token, email, password, password_confirmation: confirmation })).message);
        } catch (failure) {
            setError(failure instanceof ApiError ? failure : new ApiError(0, t('Le mot de passe n’a pas pu être modifié.')));
        } finally {
            setPending(false);
        }
    }

    if (!token) {
        return (
            <AuthLayout eyebrow={t('Mon compte')} title={t('Lien incomplet')} intro={t('Ce lien de réinitialisation est incomplet. Demandez-en un nouveau.')}>
                <ButtonLink to="/compte/mot-de-passe-oublie">{t('Recevoir un nouveau lien')}</ButtonLink>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout eyebrow={t('Mon compte')} title={t('Choisir un nouveau mot de passe')}>
            {done ? (
                <div className="flex flex-col gap-6">
                    <FormAlert tone="success" message={done} />
                    <ButtonLink to="/compte/connexion">{t('Se connecter')}</ButtonLink>
                </div>
            ) : (
                <form onSubmit={submit} noValidate className="flex flex-col gap-6">
                    {error && (!error.isValidation || (!error.field('password') && error.field('email'))) && (
                        <FormAlert message={error.field('email') ?? error.message} />
                    )}
                    <TextField label={t('E-mail')} type="email" dir="ltr" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                    <TextField
                        label={t('Nouveau mot de passe')}
                        type="password"
                        name="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        hint={t('Au moins 10 caractères, avec des lettres et des chiffres.')}
                        error={fieldError(error?.errors, 'password')}
                        required
                    />
                    <TextField
                        label={t('Confirmation')}
                        type="password"
                        name="password_confirmation"
                        autoComplete="new-password"
                        value={confirmation}
                        onChange={(event) => setConfirmation(event.target.value)}
                        required
                    />
                    <Button type="submit" size="lg" loading={pending}>
                        {t('Enregistrer')}
                    </Button>
                    <Link to="/compte/mot-de-passe-oublie" className="text-center text-sm text-muted underline underline-offset-4">
                        {t('Demander un nouveau lien')}
                    </Link>
                </form>
            )}
        </AuthLayout>
    );
}

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ApiError } from '@shared/http';
import { api } from '../../api';
import { Button } from '../../components/ui/Button';
import { FormAlert, TextField } from '../../components/ui/Field';
import { useHead } from '../../hooks/useHead';
import { AuthLayout, fieldError } from './AuthLayout';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [pending, setPending] = useState(false);
    const [sent, setSent] = useState<string | null>(null);
    const [error, setError] = useState<ApiError | null>(null);
    useHead({ title: 'Mot de passe oublié', noindex: true });

    async function submit(event: FormEvent) {
        event.preventDefault();
        setPending(true);
        setError(null);
        try {
            setSent((await api.forgotPassword(email)).message);
        } catch (failure) {
            setError(failure instanceof ApiError ? failure : new ApiError(0, 'La demande n’a pas pu être envoyée.'));
        } finally {
            setPending(false);
        }
    }

    return (
        <AuthLayout
            eyebrow="Mon compte"
            title="Mot de passe oublié"
            intro="Indiquez l’adresse de votre compte : nous vous enverrons un lien pour choisir un nouveau mot de passe."
            footer={
                <Link to="/compte/connexion" className="text-ink underline underline-offset-4">
                    Retour à la connexion
                </Link>
            }
        >
            {sent ? (
                <FormAlert tone="success" message={sent} />
            ) : (
                <form onSubmit={submit} noValidate className="flex flex-col gap-6">
                    {error && !error.isValidation && <FormAlert message={error.message} />}
                    <TextField label="E-mail" type="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} error={fieldError(error?.errors, 'email')} required />
                    <Button type="submit" size="lg" loading={pending}>
                        Recevoir le lien
                    </Button>
                </form>
            )}
        </AuthLayout>
    );
}

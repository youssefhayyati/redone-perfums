import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { ApiError } from '@shared/http';
import { Button } from '../../components/ui/Button';
import { FormAlert, TextField } from '../../components/ui/Field';
import { useHead } from '../../hooks/useHead';
import { sessionActions, useSession } from '../../stores/session';
import { toast } from '../../stores/ui';
import { AuthLayout, fieldError, safeRedirect } from './AuthLayout';

export default function RegisterPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const redirect = safeRedirect(params.get('redirect'));
    const status = useSession((state) => state.status);
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', password_confirmation: '' });
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<ApiError | null>(null);
    useHead({ title: 'Créer un compte', noindex: true });

    if (status === 'authenticated' && !pending) {
        return <Navigate to={redirect} replace />;
    }

    const update = (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [field]: event.target.value }));

    async function submit(event: FormEvent) {
        event.preventDefault();
        setPending(true);
        setError(null);
        try {
            const user = await sessionActions.register({ ...form, phone: form.phone.trim() || null });
            toast.success(`Bienvenue, ${user.name.split(' ')[0]}.`);
            navigate(redirect, { replace: true });
        } catch (failure) {
            setError(failure instanceof ApiError ? failure : new ApiError(0, 'L’inscription a échoué.'));
            setPending(false);
        }
    }

    return (
        <AuthLayout
            eyebrow="Mon compte"
            title="Créer votre compte"
            intro="Suivez vos commandes et commandez plus vite la prochaine fois."
            footer={
                <>
                    Déjà inscrit(e) ?{' '}
                    <Link to="/compte/connexion" className="text-ink underline underline-offset-4">
                        Se connecter
                    </Link>
                </>
            }
        >
            <form onSubmit={submit} noValidate className="flex flex-col gap-6">
                {error && !error.isValidation && <FormAlert message={error.message} />}
                <TextField label="Nom complet" name="name" autoComplete="name" value={form.name} onChange={update('name')} error={fieldError(error?.errors, 'name')} required />
                <TextField label="E-mail" type="email" name="email" autoComplete="email" value={form.email} onChange={update('email')} error={fieldError(error?.errors, 'email')} required />
                <TextField
                    label="Téléphone"
                    type="tel"
                    name="phone"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={update('phone')}
                    optional
                    hint="Pour préremplir vos prochaines commandes."
                    error={fieldError(error?.errors, 'phone')}
                />
                <TextField
                    label="Mot de passe"
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={update('password')}
                    hint="Au moins 10 caractères, avec des lettres et des chiffres."
                    error={fieldError(error?.errors, 'password')}
                    required
                />
                <TextField
                    label="Confirmation du mot de passe"
                    type="password"
                    name="password_confirmation"
                    autoComplete="new-password"
                    value={form.password_confirmation}
                    onChange={update('password_confirmation')}
                    required
                />
                <Button type="submit" size="lg" loading={pending}>
                    Créer mon compte
                </Button>
            </form>
        </AuthLayout>
    );
}

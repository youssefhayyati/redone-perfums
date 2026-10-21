import { useState, type FormEvent } from 'react';
import { ApiError } from '@shared/http';
import { api } from '../../api';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Field';

export function NewsletterForm({ source = 'footer' }: { source?: string }) {
    const [email, setEmail] = useState('');
    const [consent, setConsent] = useState(false);
    const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
    const [message, setMessage] = useState<string | null>(null);
    const [errors, setErrors] = useState<{ email?: string; consent?: string }>({});

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (!consent) {
            setErrors({ consent: 'Merci d’accepter de recevoir nos e-mails.' });

            return;
        }

        setStatus('sending');
        setErrors({});
        try {
            const response = await api.subscribe(email, source);
            setMessage(response.message);
            setStatus('done');
        } catch (error) {
            setStatus('idle');
            if (error instanceof ApiError) {
                setErrors({ email: error.field('email') ?? (error.isValidation ? undefined : error.message), consent: error.field('consent') });
            }
        }
    }

    if (status === 'done') {
        return (
            <p role="status" className="font-display text-2xl text-ink">
                {message}
            </p>
        );
    }

    return (
        <form onSubmit={submit} noValidate className="flex w-full flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row">
                <label htmlFor="newsletter-email" className="sr-only">
                    Adresse e-mail
                </label>
                <input
                    id="newsletter-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="Votre adresse e-mail"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? 'newsletter-email-error' : undefined}
                    className="field-control flex-1"
                />
                <Button type="submit" loading={status === 'sending'} className="sm:w-auto">
                    S’inscrire
                </Button>
            </div>
            {errors.email && (
                <p id="newsletter-email-error" role="alert" className="text-xs text-danger">
                    {errors.email}
                </p>
            )}
            <Checkbox label="J’accepte de recevoir les nouvelles de la maison. Désinscription en un clic à tout moment." checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            {errors.consent && (
                <p role="alert" className="text-xs text-danger">
                    {errors.consent}
                </p>
            )}
        </form>
    );
}

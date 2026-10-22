import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { ApiError } from '@shared/http';
import { cn } from '@shared/format';
import { api } from '../../api';
import { ButtonLabel } from '../ui/Button';
import { Checkbox } from '../ui/Field';
import { Spinner } from '../ui/Spinner';
import { t } from '../../i18n';

export function NewsletterForm({ source = 'footer' }: { source?: string }) {
    const [email, setEmail] = useState('');
    const [consent, setConsent] = useState(false);
    const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
    const [message, setMessage] = useState<string | null>(null);
    const [errors, setErrors] = useState<{ email?: string; consent?: string }>({});

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (!consent) {
            setErrors({ consent: t('Merci d’accepter de recevoir nos e-mails.') });

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
        <form onSubmit={submit} noValidate className="flex w-full flex-col gap-5">
            {/* Editorial underline field; the line under it draws in accent while focused. */}
            <div
                className={cn(
                    'relative flex items-center gap-4 border-b pb-3 transition-colors duration-300',
                    'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:origin-left after:scale-x-0 after:transition-transform after:duration-700 after:ease-luxe focus-within:after:scale-x-100',
                    errors.email ? 'border-danger after:bg-danger' : 'border-line-strong after:bg-accent',
                )}
            >
                <label htmlFor="newsletter-email" className="sr-only">
                    {t('Adresse e-mail')}
                </label>
                <input
                    id="newsletter-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder={t('Votre adresse e-mail')}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? 'newsletter-email-error' : undefined}
                    className="min-w-0 flex-1 bg-transparent py-2 font-display text-2xl text-ink outline-none placeholder:text-faint placeholder:italic sm:text-[1.75rem]"
                />
                <button
                    type="submit"
                    disabled={status === 'sending'}
                    aria-busy={status === 'sending' || undefined}
                    aria-label={t('S’inscrire')}
                    title={t('S’inscrire')}
                    className="btn flex size-12 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink [--btn-fill:var(--color-accent)] hover:border-accent hover:text-on-accent focus-visible:border-accent focus-visible:text-on-accent disabled:opacity-60"
                >
                    {status === 'sending' ? (
                        <Spinner className="size-4" />
                    ) : (
                        <ButtonLabel>
                            <ArrowRight className="size-4 rtl:-scale-x-100" strokeWidth={1.5} />
                        </ButtonLabel>
                    )}
                </button>
            </div>
            {errors.email && (
                <p id="newsletter-email-error" role="alert" className="text-xs text-danger">
                    {errors.email}
                </p>
            )}
            <Checkbox label={t('J’accepte de recevoir les nouvelles de la maison. Désinscription en un clic à tout moment.')} checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            {errors.consent && (
                <p role="alert" className="text-xs text-danger">
                    {errors.consent}
                </p>
            )}
        </form>
    );
}

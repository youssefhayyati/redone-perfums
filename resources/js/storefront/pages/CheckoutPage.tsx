import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Lock, TriangleAlert } from 'lucide-react';
import { ApiError } from '@shared/http';
import { formatMoney } from '@shared/money';
import { formatMoroccanPhone, isValidMoroccanPhone } from '@shared/phone';
import { cn } from '@shared/format';
import { cartItems, track } from '../analytics';
import { api } from '../api';
import { clearDraft, forgetIdempotencyKey, idempotencyKey, loadDraft, rememberOrderToken, saveDraft, type CheckoutForm } from '../checkout';
import { CitySelect } from '../components/cart/CitySelect';
import { FreeShippingHint, Totals } from '../components/cart/Totals';
import { Button, ButtonLink } from '../components/ui/Button';
import { Field, FormAlert, TextAreaField, TextField } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/States';
import { useConfig } from '../config';
import { useHead } from '../hooks/useHead';
import { invalidateQueries } from '../hooks/useQuery';
import { cartActions, useCart } from '../stores/cart';
import { useSession } from '../stores/session';
import { t, tn, tNodes } from '../i18n';

type Errors = Partial<Record<keyof CheckoutForm | 'city_id', string>>;

const FIELDS: Array<keyof Errors> = ['customer_name', 'phone', 'email', 'city_id', 'address', 'delivery_notes', 'payment_method'];

/** Mirrors App\Http\Requests\Storefront\CheckoutRequest for instant feedback. */
function validate(form: CheckoutForm, cityId: number | null, emailRequired: boolean): Errors {
    const errors: Errors = {};

    if (form.customer_name.trim().length < 2) {
        errors.customer_name = t('Indiquez votre nom complet.');
    }
    if (!isValidMoroccanPhone(form.phone)) {
        errors.phone = t('Saisissez un numéro marocain valide (ex. 06 12 34 56 78).');
    }
    if (form.email.trim() === '' ? emailRequired : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        errors.email = form.email.trim() === '' ? t('Indiquez votre adresse e-mail.') : t('Cette adresse e-mail n’est pas valide.');
    }
    if (cityId === null) {
        errors.city_id = t('Choisissez votre ville de livraison.');
    }
    if (form.address.trim().length < 8) {
        errors.address = t('Précisez votre adresse (rue, numéro, quartier).');
    }
    if (!form.payment_method) {
        errors.payment_method = t('Choisissez un mode de paiement.');
    }

    return errors;
}

export default function CheckoutPage() {
    const config = useConfig();
    const navigate = useNavigate();
    const cart = useCart((state) => state.cart);
    const loading = useCart((state) => state.loading);
    const cityId = useCart((state) => state.cityId);
    const user = useSession((state) => state.user);
    const formRef = useRef<HTMLFormElement>(null);
    useHead({ title: t('Commande'), noindex: true });

    const [form, setForm] = useState<CheckoutForm>(() => ({
        customer_name: '',
        phone: '',
        email: '',
        address: '',
        delivery_notes: '',
        payment_method: config.payment_methods[0]?.code ?? '',
        ...loadDraft(),
    }));
    const [errors, setErrors] = useState<Errors>({});
    const [alert, setAlert] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Signed-in customers start with their details; typed values always win.
    useEffect(() => {
        if (user) {
            setForm((current) => ({
                ...current,
                customer_name: current.customer_name || user.name,
                email: current.email || user.email,
                phone: current.phone || user.phone || '',
            }));
        }
    }, [user]);

    useEffect(() => saveDraft(form), [form]);

    const checkoutTracked = useRef(false);
    useEffect(() => {
        if (cart && cart.lines.length > 0 && !checkoutTracked.current) {
            checkoutTracked.current = true;
            track({ type: 'begin_checkout', value: cart.total ?? cart.merchandise_total, items: cartItems(cart) });
        }
    }, [cart]);

    const set = (field: keyof CheckoutForm) => (value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    function focusFirstError(fieldErrors: Errors) {
        const first = FIELDS.find((field) => fieldErrors[field]);
        if (first) {
            formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
        }
    }

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (!cart?.token) {
            return;
        }

        const clientErrors = validate(form, cityId, config.checkout.email_required);
        if (Object.keys(clientErrors).length > 0) {
            setErrors(clientErrors);
            focusFirstError(clientErrors);

            return;
        }

        setSubmitting(true);
        setErrors({});
        setAlert([]);

        try {
            const { order, access_token: token } = await api.checkout(
                {
                    customer_name: form.customer_name.trim(),
                    phone: form.phone,
                    email: form.email.trim() || null,
                    city_id: cityId!,
                    address: form.address.trim(),
                    delivery_notes: form.delivery_notes.trim() || null,
                    payment_method: form.payment_method,
                },
                idempotencyKey(cart.token),
            );

            forgetIdempotencyKey(cart.token);
            clearDraft();
            rememberOrderToken(order.reference, token);
            invalidateQueries('account-orders');
            cartActions.clear();
            navigate(`/commande/confirmation/${order.reference}?token=${encodeURIComponent(token)}`, { replace: true });
        } catch (error) {
            if (error instanceof ApiError && error.isValidation) {
                const fieldErrors: Errors = {};
                FIELDS.forEach((field) => {
                    const message = error.field(field);
                    if (message) {
                        fieldErrors[field] = message;
                    }
                });
                const general = ['cart', 'coupon', 'idempotency_key'].flatMap((key) => error.errors[key] ?? []);
                setErrors(fieldErrors);
                setAlert(general.length > 0 ? general : Object.keys(fieldErrors).length === 0 ? [error.message] : []);
                focusFirstError(fieldErrors);

                if (error.errors.cart || error.errors.coupon) {
                    void cartActions.load();
                }
            } else {
                setAlert([error instanceof ApiError ? error.message : t('La commande n’a pas pu être envoyée. Réessayez.')]);
            }
        } finally {
            setSubmitting(false);
        }
    }

    if (loading && !cart) {
        return (
            <div className="flex justify-center py-40 text-muted" role="status" aria-label={t('Chargement')}>
                <Spinner className="size-6" />
            </div>
        );
    }

    if (!cart || cart.lines.length === 0) {
        return (
            <div className="container-page pt-12">
                <EmptyState title={t('Votre panier est vide')} action={<ButtonLink to="/boutique">{t('Découvrir la boutique')}</ButtonLink>}>
                    <p>{t('Ajoutez un parfum ou un coffret pour passer commande.')}</p>
                </EmptyState>
            </div>
        );
    }

    const termsPage = config.pages.find((page) => page.slug === 'conditions-generales-de-vente');
    const blocked = !cart.is_checkout_ready;

    return (
        <div className="container-page pt-12 sm:pt-16">
            <PageHeader label={t('Commande')} title={t('Finaliser votre commande')} />

            <form ref={formRef} onSubmit={submit} noValidate className="grid grid-cols-1 gap-12 pt-10 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-16">
                <div className="flex flex-col gap-12">
                    {alert.length > 0 && <FormAlert message={alert.join(' ')} />}
                    {blocked && (
                        <p role="alert" className="flex items-start gap-3 border-s-2 border-warning bg-warning/8 px-4 py-3 text-sm">
                            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={1.5} />
                            <span>
                                {t('Votre panier contient des articles à revoir.')}{' '}
                                <Link to="/panier" className="underline underline-offset-4">
                                    {t('Retourner au panier')}
                                </Link>
                            </span>
                        </p>
                    )}

                    <fieldset className="flex flex-col gap-6">
                        <legend className="mb-6 font-display text-2xl">{t('Vos coordonnées')}</legend>
                        <TextField
                            label={t('Nom complet')}
                            name="customer_name"
                            autoComplete="name"
                            value={form.customer_name}
                            onChange={(event) => set('customer_name')(event.target.value)}
                            error={errors.customer_name}
                            required
                        />
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <TextField
                                label={t('Téléphone')}
                                name="phone"
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                value={form.phone}
                                onChange={(event) => set('phone')(event.target.value)}
                                onBlur={() => isValidMoroccanPhone(form.phone) && set('phone')(formatMoroccanPhone(form.phone))}
                                hint={t('Le livreur vous appelle à ce numéro.')}
                                dir="ltr"
                                error={errors.phone}
                                placeholder="06 12 34 56 78"
                                required
                            />
                            <TextField
                                label={t('E-mail')}
                                name="email"
                                type="email"
                                autoComplete="email"
                                value={form.email}
                                onChange={(event) => set('email')(event.target.value)}
                                optional={!config.checkout.email_required}
                                hint={t('Pour recevoir le récapitulatif de votre commande.')}
                                dir="ltr"
                                error={errors.email}
                            />
                        </div>
                    </fieldset>

                    <fieldset className="flex flex-col gap-6">
                        <legend className="mb-6 font-display text-2xl">{t('Livraison')}</legend>
                        <Field label={t('Ville')} error={errors.city_id ?? cart.delivery?.error ?? undefined} hint={cart.delivery?.estimate ? t('Délai indicatif : {estimate}', { estimate: cart.delivery.estimate }) : undefined}>
                            {(a11y) => (
                                <CitySelect
                                    id={a11y.id}
                                    name="city_id"
                                    value={cityId}
                                    invalid={Boolean(a11y['aria-invalid'])}
                                    describedBy={a11y['aria-describedby']}
                                    onChange={(id) => {
                                        setErrors((current) => ({ ...current, city_id: undefined }));
                                        void cartActions.setCity(id);
                                    }}
                                />
                            )}
                        </Field>
                        <TextAreaField
                            label={t('Adresse')}
                            name="address"
                            autoComplete="street-address"
                            rows={3}
                            value={form.address}
                            onChange={(event) => set('address')(event.target.value)}
                            placeholder={t('Rue, numéro, immeuble, quartier')}
                            error={errors.address}
                            required
                        />
                        <TextAreaField
                            label={t('Instructions de livraison')}
                            name="delivery_notes"
                            rows={2}
                            value={form.delivery_notes}
                            onChange={(event) => set('delivery_notes')(event.target.value)}
                            placeholder={t('Étage, code d’accès, horaires préférés…')}
                            optional
                            error={errors.delivery_notes}
                        />
                    </fieldset>

                    <fieldset className="flex flex-col gap-4">
                        <legend className="mb-6 font-display text-2xl">{t('Paiement')}</legend>
                        {config.payment_methods.length === 0 ? (
                            <p className="text-sm text-danger">{t('Aucun mode de paiement n’est disponible pour le moment.')}</p>
                        ) : (
                            config.payment_methods.map((method) => (
                                <label
                                    key={method.code}
                                    className={cn(
                                        'flex cursor-pointer items-start gap-4 rounded-2xl border p-5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent',
                                        form.payment_method === method.code ? 'border-accent bg-accent/5' : 'border-line-strong hover:border-ink/60',
                                    )}
                                >
                                    <input type="radio" name="payment_method" value={method.code} checked={form.payment_method === method.code} onChange={() => set('payment_method')(method.code)} className="radio-control mt-0.5" />
                                    <span className="flex flex-col gap-1">
                                        <span className="text-ink">{method.label}</span>
                                        <span className="text-sm text-muted">{method.description}</span>
                                    </span>
                                </label>
                            ))
                        )}
                        {errors.payment_method && (
                            <p role="alert" className="text-xs text-danger">
                                {errors.payment_method}
                            </p>
                        )}
                    </fieldset>
                </div>

                <aside aria-label={t('Récapitulatif de la commande')}>
                    <div className="flex flex-col gap-6 rounded-card border border-line bg-raised p-6 sm:p-8 lg:sticky lg:top-24">
                        <h2 className="font-display text-2xl">{t('Votre commande')}</h2>
                        <ul className="flex flex-col gap-3 border-b border-line pb-6 text-sm">
                            {cart.lines.map((line) => (
                                <li key={line.id} className="flex justify-between gap-4">
                                    <span className="min-w-0">
                                        <span className="text-ink">{line.type === 'product' ? line.product?.name : line.pack?.name}</span>
                                        <span className="text-muted">
                                            {' '}
                                            {line.type === 'product' ? line.variant?.label : tn(line.selections.length, 'flacon')}
                                            {line.quantity > 1 ? ` × ${line.quantity}` : ''}
                                        </span>
                                    </span>
                                    <span className="shrink-0 tabular-nums">{formatMoney(line.line_total)}</span>
                                </li>
                            ))}
                        </ul>
                        <FreeShippingHint cart={cart} />
                        <Totals cart={cart} />
                        <Button type="submit" size="lg" loading={submitting} disabled={blocked || config.payment_methods.length === 0}>
                            <Lock className="size-3.5" strokeWidth={1.5} />
                            {t('Valider la commande')}
                        </Button>
                        <p className="text-center text-xs leading-relaxed text-muted">
                            {termsPage ? (
                                tNodes('En validant, vous acceptez nos {terms}.', {
                                    terms: (
                                        <Link to={`/pages/${termsPage.slug}`} className="underline underline-offset-4">
                                            {t('conditions générales de vente')}
                                        </Link>
                                    ),
                                })
                            ) : (
                                t('Vous réglez à la réception de votre commande.')
                            )}
                        </p>
                    </div>
                </aside>
            </form>
        </div>
    );
}

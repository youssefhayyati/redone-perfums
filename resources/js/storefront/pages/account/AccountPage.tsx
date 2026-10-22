import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowRight } from 'lucide-react';
import type { Customer } from '@shared/types';
import { ApiError } from '@shared/http';
import { formatMoney } from '@shared/money';
import { cn, formatDate } from '@shared/format';
import { api } from '../../api';
import { OrderStatusBadge } from '../../components/order/OrderSummary';
import { Pagination } from '../../components/shop/Pagination';
import { Button, ButtonLink } from '../../components/ui/Button';
import { FormAlert, TextField } from '../../components/ui/Field';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { useHead } from '../../hooks/useHead';
import { useQuery } from '../../hooks/useQuery';
import { sessionActions, useSession } from '../../stores/session';
import { toast } from '../../stores/ui';
import { fieldError } from './AuthLayout';
import { RequireAuth } from './RequireAuth';
import { t, tn } from '../../i18n';

const TABS = [
    { key: 'commandes', label: t('Mes commandes') },
    { key: 'profil', label: t('Mes informations') },
    { key: 'securite', label: t('Mot de passe') },
] as const;

type Tab = (typeof TABS)[number]['key'];

function Orders() {
    const [params, setParams] = useSearchParams();
    const page = Math.max(1, Number(params.get('page')) || 1);
    const { data, error, refetch } = useQuery(`account-orders:${page}`, (signal) => api.accountOrders(page, { signal }), { keepPrevious: true, staleTime: 15_000 });

    if (error && !data) {
        return <ErrorState message={error.message} onRetry={refetch} />;
    }

    if (!data) {
        return <div className="skeleton h-48 w-full" role="status" aria-label={t('Chargement des commandes')} />;
    }

    if (data.data.length === 0) {
        return (
            <EmptyState title={t('Aucune commande pour le moment')} action={<ButtonLink to="/boutique">{t('Découvrir la boutique')}</ButtonLink>}>
                <p>{t('Vos commandes apparaîtront ici dès votre premier achat.')}</p>
            </EmptyState>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <ul className="divide-y divide-line border-y border-line">
                {data.data.map((order) => (
                    <li key={order.reference}>
                        <Link to={`/compte/commandes/${order.reference}`} className="group grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-6 sm:grid-cols-[1.2fr_1fr_auto_auto]">
                            <span className="flex flex-col gap-1">
                                <span className="text-ink tabular-nums">{order.reference}</span>
                                <span className="text-xs text-muted">{formatDate(order.placed_at)}</span>
                            </span>
                            <span className="hidden text-sm text-muted sm:block">{tn(order.items_count, 'article')}</span>
                            <OrderStatusBadge status={order.status} label={order.status_label} />
                            <span className="flex items-center gap-3 text-sm tabular-nums">
                                {formatMoney(order.total)}
                                <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" strokeWidth={1.25} />
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
            <Pagination current={data.meta.current_page} last={data.meta.last_page} onChange={(next) => setParams({ onglet: 'commandes', page: String(next) })} />
        </div>
    );
}

function Profile({ user }: { user: Customer }) {
    const [name, setName] = useState(user.name);
    const [phone, setPhone] = useState(user.phone ?? '');
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<ApiError | null>(null);

    async function submit(event: FormEvent) {
        event.preventDefault();
        setPending(true);
        setError(null);
        try {
            const { user: updated } = await api.updateProfile({ name, phone: phone.trim() || null });
            sessionActions.update(updated);
            setPhone(updated.phone ?? '');
            toast.success(t('Vos informations ont été enregistrées.'));
        } catch (failure) {
            setError(failure instanceof ApiError ? failure : new ApiError(0, t('L’enregistrement a échoué.')));
        } finally {
            setPending(false);
        }
    }

    return (
        <form onSubmit={submit} noValidate className="flex max-w-lg flex-col gap-6">
            {error && !error.isValidation && <FormAlert message={error.message} />}
            <TextField label={t('Nom complet')} name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} error={fieldError(error?.errors, 'name')} required />
            <TextField label={t('E-mail')} type="email" dir="ltr" value={user.email} disabled hint={t('Pour changer d’adresse e-mail, contactez-nous.')} />
            <TextField label={t('Téléphone')} type="tel" dir="ltr" name="phone" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} optional error={fieldError(error?.errors, 'phone')} />
            <Button type="submit" loading={pending} className="self-start">
                {t('Enregistrer')}
            </Button>
        </form>
    );
}

function Security() {
    const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' });
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<ApiError | null>(null);

    async function submit(event: FormEvent) {
        event.preventDefault();
        setPending(true);
        setError(null);
        try {
            const { message } = await api.updatePassword(form);
            setForm({ current_password: '', password: '', password_confirmation: '' });
            toast.success(message);
        } catch (failure) {
            setError(failure instanceof ApiError ? failure : new ApiError(0, t('Le mot de passe n’a pas pu être modifié.')));
        } finally {
            setPending(false);
        }
    }

    return (
        <form onSubmit={submit} noValidate className="flex max-w-lg flex-col gap-6">
            {error && !error.isValidation && <FormAlert message={error.message} />}
            <TextField
                label={t('Mot de passe actuel')}
                type="password"
                autoComplete="current-password"
                value={form.current_password}
                onChange={(event) => setForm({ ...form, current_password: event.target.value })}
                error={fieldError(error?.errors, 'current_password')}
                required
            />
            <TextField
                label={t('Nouveau mot de passe')}
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                hint={t('Au moins 10 caractères, avec des lettres et des chiffres.')}
                error={fieldError(error?.errors, 'password')}
                required
            />
            <TextField label={t('Confirmation')} type="password" autoComplete="new-password" value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} required />
            <Button type="submit" loading={pending} className="self-start">
                {t('Modifier le mot de passe')}
            </Button>
        </form>
    );
}

function Account() {
    const user = useSession((state) => state.user)!;
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const tab: Tab = TABS.some((item) => item.key === params.get('onglet')) ? (params.get('onglet') as Tab) : 'commandes';
    const [leaving, setLeaving] = useState(false);

    async function logout() {
        setLeaving(true);
        try {
            await sessionActions.logout();
            navigate('/', { replace: true });
        } catch {
            setLeaving(false);
            toast.error(t('La déconnexion a échoué. Réessayez.'));
        }
    }

    return (
        <div className="container-page pt-12 sm:pt-16">
            <PageHeader
                label={t('Mon compte')}
                title={t('Bonjour, {name}', { name: user.name.split(' ')[0] })}
                aside={
                    <Button variant="quiet" size="sm" onClick={logout} loading={leaving} className="self-start lg:self-auto">
                        {t('Se déconnecter')}
                    </Button>
                }
            />

            <div className="grid grid-cols-1 gap-10 pt-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
                <nav aria-label={t('Rubriques du compte')}>
                    <ul className="no-scrollbar flex gap-6 overflow-x-auto border-b border-line lg:flex-col lg:gap-1 lg:border-b-0">
                        {TABS.map((item) => (
                            <li key={item.key}>
                                <button
                                    type="button"
                                    onClick={() => setParams({ onglet: item.key })}
                                    aria-current={tab === item.key ? 'page' : undefined}
                                    className={cn(
                                        'whitespace-nowrap border-b py-3 text-sm transition-colors lg:w-full lg:border-b-0 lg:border-s lg:py-2.5 lg:ps-4 lg:text-start',
                                        tab === item.key ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink',
                                    )}
                                >
                                    {item.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
                <section aria-label={TABS.find((item) => item.key === tab)?.label}>
                    {tab === 'commandes' && <Orders />}
                    {tab === 'profil' && <Profile user={user} />}
                    {tab === 'securite' && <Security />}
                </section>
            </div>
        </div>
    );
}

export default function AccountPage() {
    useHead({ title: t('Mon compte'), noindex: true });

    return (
        <RequireAuth>
            <Account />
        </RequireAuth>
    );
}

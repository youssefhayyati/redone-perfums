import { Link } from 'react-router';
import type { Pack } from '@shared/types';
import { formatMoney } from '@shared/money';
import { api } from '../api';
import { ButtonLabel, buttonClasses } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState } from '../components/ui/States';
import { useHead } from '../hooks/useHead';
import { useQuery } from '../hooks/useQuery';
import { RevealGroup, RevealItem } from '../motion/Reveal';
import { t, tn } from '../i18n';

function PackCard({ pack }: { pack: Pack }) {
    const fromPrice = pack.type === 'custom' && pack.pricing.type !== 'fixed';

    return (
        <article className="group flex flex-col gap-6">
            <Link to={`/coffrets/${pack.slug}`} tabIndex={-1} aria-hidden="true" className="relative block aspect-[4/5] overflow-hidden rounded-card bg-raised">
                {pack.image && <img src={pack.image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-[1200ms] ease-luxe group-hover:scale-[1.04]" />}
                <span className="absolute start-4 top-4 bg-canvas/85 px-2.5 py-1 text-2xs tracking-[0.18em] text-ink uppercase backdrop-blur-sm">
                    {pack.type === 'custom' ? t('À composer') : t('Composé par la maison')}
                </span>
            </Link>
            <div className="flex flex-col gap-3">
                <p className="eyebrow">
                    {tn(pack.bottle_count, 'flacon')}
                    {pack.allowed_sizes?.length ? ` · ${pack.allowed_sizes.join(' / ')} ml` : ''}
                </p>
                <h2 className="font-display text-3xl leading-tight">
                    <Link to={`/coffrets/${pack.slug}`} className="transition-colors hover:text-accent">
                        {pack.name}
                    </Link>
                </h2>
                {pack.tagline && <p className="text-muted">{pack.tagline}</p>}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <p className="text-sm">
                        {pack.starting_price !== null ? (
                            <>
                                {fromPrice && <span className="text-muted">{t('À partir de')} </span>}
                                <span className="tabular-nums">{formatMoney(pack.starting_price)}</span>
                            </>
                        ) : (
                            <span className="text-muted">{t('Momentanément indisponible')}</span>
                        )}
                        <span className="ms-3 text-xs text-accent">{pack.pricing.label}</span>
                    </p>
                    <Link to={`/coffrets/${pack.slug}`} className={buttonClasses('secondary', 'sm')}>
                        <ButtonLabel>{pack.type === 'custom' ? t('Composer') : t('Découvrir')}</ButtonLabel>
                    </Link>
                </div>
            </div>
        </article>
    );
}

export default function PacksPage() {
    const { data, error, refetch } = useQuery('packs', (signal) => api.packs({ signal }));
    useHead({ title: t('Coffrets'), description: t('Composez votre coffret de parfums ou choisissez un coffret composé par la maison.') });

    return (
        <div className="container-page pt-12 sm:pt-16">
            <PageHeader label={t('Coffrets')} title={t('Composez, offrez, explorez.')} meta={data ? tn(data.data.length, 'coffret') : null}>
                <p className="max-w-xl text-muted">{t('Réunissez plusieurs parfums dans un écrin à un prix plus doux que l’achat séparé. Le prix exact est calculé dès que votre sélection est complète.')}</p>
            </PageHeader>
            <div className="pt-12">
                {error && !data ? (
                    <ErrorState message={error.message} onRetry={refetch} />
                ) : !data ? (
                    <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label={t('Chargement')}>
                        {[0, 1, 2].map((index) => (
                            <div key={index} className="skeleton aspect-[4/5]" />
                        ))}
                    </div>
                ) : data.data.length === 0 ? (
                    <EmptyState title={t('Aucun coffret pour le moment')} />
                ) : (
                    <RevealGroup as="ul" className="grid grid-cols-1 gap-x-8 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
                        {data.data.map((pack) => (
                            <RevealItem as="li" key={pack.id}>
                                <PackCard pack={pack} />
                            </RevealItem>
                        ))}
                    </RevealGroup>
                )}
            </div>
        </div>
    );
}

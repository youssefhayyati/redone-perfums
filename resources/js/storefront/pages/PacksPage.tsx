import { Link } from 'react-router';
import type { Pack } from '@shared/types';
import { formatMoney } from '@shared/money';
import { plural } from '@shared/format';
import { api } from '../api';
import { buttonClasses } from '../components/ui/Button';
import { EmptyState, ErrorState } from '../components/ui/States';
import { useHead } from '../hooks/useHead';
import { useQuery } from '../hooks/useQuery';
import { RevealGroup, RevealItem } from '../motion/Reveal';

function PackCard({ pack }: { pack: Pack }) {
    const fromPrice = pack.type === 'custom' && pack.pricing.type !== 'fixed';

    return (
        <article className="group flex flex-col gap-6">
            <Link to={`/coffrets/${pack.slug}`} tabIndex={-1} aria-hidden="true" className="relative block aspect-[4/5] overflow-hidden bg-raised">
                {pack.image && <img src={pack.image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-[1200ms] ease-luxe group-hover:scale-[1.04]" />}
                <span className="absolute top-4 left-4 bg-canvas/85 px-2.5 py-1 text-2xs tracking-[0.18em] text-ink uppercase backdrop-blur-sm">
                    {pack.type === 'custom' ? 'À composer' : 'Composé par la maison'}
                </span>
            </Link>
            <div className="flex flex-col gap-3">
                <p className="eyebrow">
                    {plural(pack.bottle_count, 'flacon')}
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
                                {fromPrice && <span className="text-muted">À partir de </span>}
                                <span className="tabular-nums">{formatMoney(pack.starting_price)}</span>
                            </>
                        ) : (
                            <span className="text-muted">Momentanément indisponible</span>
                        )}
                        <span className="ml-3 text-xs text-accent">{pack.pricing.label}</span>
                    </p>
                    <Link to={`/coffrets/${pack.slug}`} className={buttonClasses('secondary', 'sm')}>
                        {pack.type === 'custom' ? 'Composer' : 'Découvrir'}
                    </Link>
                </div>
            </div>
        </article>
    );
}

export default function PacksPage() {
    const { data, error, refetch } = useQuery('packs', (signal) => api.packs({ signal }));
    useHead({ title: 'Coffrets', description: 'Composez votre coffret de parfums ou choisissez un coffret composé par la maison.' });

    return (
        <div className="container-page pt-12 sm:pt-16">
            <header className="flex flex-col gap-4 border-b border-line pb-10">
                <p className="eyebrow">Coffrets</p>
                <h1 className="font-display text-display-lg text-balance">Composez, offrez, explorez.</h1>
                <p className="max-w-xl text-muted">Réunissez plusieurs parfums dans un écrin à un prix plus doux que l’achat séparé. Le prix exact est calculé dès que votre sélection est complète.</p>
            </header>
            <div className="pt-12">
                {error && !data ? (
                    <ErrorState message={error.message} onRetry={refetch} />
                ) : !data ? (
                    <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Chargement">
                        {[0, 1, 2].map((index) => (
                            <div key={index} className="skeleton aspect-[4/5]" />
                        ))}
                    </div>
                ) : data.data.length === 0 ? (
                    <EmptyState title="Aucun coffret pour le moment" />
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

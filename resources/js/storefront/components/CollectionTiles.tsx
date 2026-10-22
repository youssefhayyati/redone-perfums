import { Link } from 'react-router';
import type { Collection } from '@shared/types';
import { cn } from '@shared/format';
import { MediaSettle, RevealGroup, RevealItem } from '../motion/Reveal';
import { tn } from '../i18n';

export function CollectionTiles({ collections, className }: { collections: Collection[]; className?: string }) {
    return (
        <RevealGroup as="ul" className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5', className)} step={0.12}>
            {collections.map((collection) => (
                <RevealItem as="li" key={collection.id} variant="unveil">
                    <Link to={`/collections/${collection.slug}`} data-tilt className="group relative block aspect-[3/4] overflow-hidden rounded-card bg-raised">
                        {collection.image ? (
                            <MediaSettle className="absolute inset-0">
                                <img
                                    src={collection.image}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                    className="size-full object-cover transition-transform duration-[1200ms] ease-luxe group-hover:scale-[1.06]"
                                />
                            </MediaSettle>
                        ) : (
                            <span aria-hidden="true" className="absolute inset-0" style={{ background: `radial-gradient(70% 60% at 50% 60%, ${collection.accent_color ?? 'var(--color-accent)'}55, transparent 70%)` }} />
                        )}
                        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                        <span className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-6 text-[#f4ede2]">
                            {collection.products_count !== undefined && (
                                <span className="text-2xs tracking-[0.2em] text-[#f4ede2]/70 uppercase">{tn(collection.products_count, 'parfum')}</span>
                            )}
                            <span className="font-display text-3xl leading-none">{collection.name}</span>
                            {collection.tagline && <span className="text-sm text-[#f4ede2]/75">{collection.tagline}</span>}
                        </span>
                    </Link>
                </RevealItem>
            ))}
        </RevealGroup>
    );
}

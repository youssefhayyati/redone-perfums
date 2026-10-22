import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import type { Collection } from '@shared/types';
import { cn, plural } from '@shared/format';
import { RevealGroup, RevealItem } from '../../motion/Reveal';
import { ChapterHeader } from './ChapterHeader';

function CollectionVisual({ collection, className }: { collection: Collection; className?: string }) {
    if (collection.image) {
        return <img src={collection.image} alt="" loading="lazy" decoding="async" className={cn('object-cover', className)} />;
    }

    return <span className={className} style={{ background: `radial-gradient(70% 60% at 50% 60%, ${collection.accent_color ?? 'var(--color-accent)'}55, transparent 70%)` }} />;
}

/**
 * Collections as an editorial index. On large screens, hovering or focusing a row brings
 * its visual into the preview frame; smaller screens show a thumbnail in each row.
 */
export function CollectionIndex({ index, collections }: { index: string; collections: Collection[] }) {
    const [active, setActive] = useState(0);
    const current = collections[active] ?? collections[0];

    return (
        <section className="container-page flex flex-col gap-14 py-24 sm:gap-20 sm:py-32" aria-labelledby="collections-title">
            <ChapterHeader index={index} label="Les collections" title="Des univers à explorer" id="collections-title" meta={plural(collections.length, 'univers', 'univers')} />

            <div className="grid grid-cols-1 items-center lg:grid-cols-12">
                <RevealGroup as="ul" className="border-t border-line lg:col-span-7" step={0.08}>
                    {collections.map((collection, position) => (
                        <RevealItem as="li" key={collection.id} className="border-b border-line">
                            <Link
                                to={`/collections/${collection.slug}`}
                                onMouseEnter={() => setActive(position)}
                                onFocus={() => setActive(position)}
                                className="group grid grid-cols-[1.75rem_1fr_auto] items-center gap-4 py-6 sm:grid-cols-[2.5rem_1fr_auto] sm:gap-6 sm:py-8"
                            >
                                <span className="self-start pt-3 text-2xs tracking-label text-faint tabular-nums">{String(position + 1).padStart(2, '0')}</span>
                                <span className="flex min-w-0 flex-col gap-2">
                                    <span
                                        className={cn(
                                            'font-display text-display-md transition-[color,translate] duration-500 ease-luxe group-hover:translate-x-2 group-hover:text-accent',
                                            position === active && 'lg:translate-x-2 lg:text-accent',
                                        )}
                                    >
                                        {collection.name}
                                    </span>
                                    {collection.tagline && <span className="text-sm text-muted">{collection.tagline}</span>}
                                </span>
                                <span className="flex items-center gap-5">
                                    {collection.products_count !== undefined && (
                                        <span className="hidden text-2xs tracking-label text-muted uppercase sm:inline">{plural(collection.products_count, 'parfum')}</span>
                                    )}
                                    <span className="relative aspect-[3/4] w-14 overflow-hidden rounded-xl bg-raised lg:hidden">
                                        <CollectionVisual collection={collection} className="absolute inset-0 size-full" />
                                    </span>
                                    <span
                                        aria-hidden="true"
                                        className="hidden size-11 items-center justify-center rounded-full border border-line transition-colors duration-500 ease-luxe group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent lg:flex"
                                    >
                                        <ArrowUpRight className="size-4 transition-transform duration-500 ease-luxe group-hover:rotate-45" strokeWidth={1.5} />
                                    </span>
                                </span>
                            </Link>
                        </RevealItem>
                    ))}
                </RevealGroup>

                <div aria-hidden="true" className="relative hidden aspect-[4/5] overflow-hidden rounded-card bg-raised lg:col-span-4 lg:col-start-9 lg:block">
                    {collections.map((collection, position) => (
                        <CollectionVisual
                            key={collection.id}
                            collection={collection}
                            className={cn(
                                'absolute inset-0 size-full transition-[opacity,scale] duration-[900ms] ease-luxe',
                                position === active ? 'scale-100 opacity-100' : 'scale-[1.06] opacity-0',
                            )}
                        />
                    ))}
                    <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    {current && (
                        <span className="absolute inset-x-0 bottom-0 flex items-baseline justify-between gap-4 p-6 text-2xs tracking-label text-[#f4ede2]/80 uppercase">
                            <span>{current.name}</span>
                            <span className="tabular-nums">
                                {String(active + 1).padStart(2, '0')} / {String(collections.length).padStart(2, '0')}
                            </span>
                        </span>
                    )}
                </div>
            </div>
        </section>
    );
}

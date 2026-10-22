import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@shared/format';
import type { HomePayload, LabStep } from '@shared/types';
import { EASE_LUXE } from '../../motion/easing';
import { MediaSettle, Reveal, RevealGroup, RevealItem, RevealWords } from '../../motion/Reveal';
import { ChapterHeader } from './ChapterHeader';
import { t, tn } from '../../i18n';

const pad = (value: number) => String(value).padStart(2, '0');

/** A photo of the lab, with its credit when the store did not take it. */
function Credit({ credit, className }: { credit: string | null; className?: string }) {
    if (!credit) {
        return null;
    }

    return (
        <p dir="ltr" className={cn('absolute end-4 bottom-3 line-clamp-2 max-w-[80%] text-end text-[0.625rem] leading-snug text-white/80', className)}>
            {credit}
        </p>
    );
}

/** The step whose text crosses the middle of the screen. */
function useActiveStep(count: number) {
    const [active, setActive] = useState(0);
    const items = useRef<Array<HTMLLIElement | null>>([]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActive(Number((entry.target as HTMLElement).dataset.step));
                    }
                }
            },
            { rootMargin: '-45% 0px -45% 0px' },
        );
        items.current.forEach((item) => item && observer.observe(item));

        return () => observer.disconnect();
    }, [count]);

    return { active, items };
}

/**
 * "Le laboratoire": the making of a perfume, step by step. On large screens the photo
 * stays in view while the steps scroll past and cross-fades to the step being read; on
 * phones each step opens its own photo. Steps and photos are edited in the admin.
 */
export function Lab({ index, lab }: { index: string; lab: NonNullable<HomePayload['lab']> }) {
    const steps = lab.steps;
    const { active, items } = useActiveStep(steps.length);
    const current: LabStep | undefined = steps[active];

    return (
        <section className="grain border-y border-line bg-raised" aria-labelledby="lab-title">
            <div className="container-page flex flex-col gap-14 py-24 sm:gap-20 sm:py-32">
                <div className="flex flex-col gap-8">
                    <ChapterHeader index={index} label={t('Le laboratoire')} title={lab.title || t('De la fleur au flacon')} id="lab-title" meta={tn(steps.length, 'étape')} />
                    {lab.intro && (
                        <Reveal delay={0.1}>
                            <p className="max-w-xl text-lg leading-relaxed text-muted">{lab.intro}</p>
                        </Reveal>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
                    {/* Large screens: the photo of the step being read. Not transformed: it is sticky. */}
                    <div className="hidden lg:col-span-6 lg:block">
                        <div className="sticky top-28 flex flex-col gap-4">
                            {/* Never taller than the screen, so its caption and credit stay in view. */}
                            <div className="relative aspect-[4/5] max-h-[calc(100dvh-10rem)] overflow-hidden rounded-card bg-sunken">
                                {steps.map((step, position) =>
                                    step.image ? (
                                        <motion.img
                                            key={step.id}
                                            src={step.image}
                                            alt={position === active ? step.title : ''}
                                            loading="lazy"
                                            decoding="async"
                                            className="absolute inset-0 size-full object-cover"
                                            initial={false}
                                            animate={{ opacity: position === active ? 1 : 0, scale: position === active ? 1 : 1.06 }}
                                            transition={{ duration: 1, ease: EASE_LUXE }}
                                        />
                                    ) : null,
                                )}
                                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent" />
                                <p dir="ltr" className="absolute start-5 top-5 rounded-full bg-black/40 px-3 py-1.5 text-2xs font-medium tracking-[0.2em] text-white tabular-nums backdrop-blur-sm">
                                    {pad(active + 1)} / {pad(steps.length)}
                                </p>
                                <p className="absolute start-5 bottom-5 font-display text-2xl text-white">{current?.title}</p>
                                {/* Beside the step's name, which sits at the other corner. */}
                                <Credit credit={current?.credit ?? null} className="max-w-[45%]" />
                            </div>
                            <div className="flex gap-1.5" aria-hidden="true">
                                {steps.map((step, position) => (
                                    <span key={step.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-line">
                                        <span className={cn('block h-full origin-left bg-accent transition-transform duration-700 ease-luxe rtl:origin-right', position <= active ? 'scale-x-100' : 'scale-x-0')} />
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <ol className="flex flex-col lg:col-span-6">
                        {steps.map((step, position) => (
                            <li
                                key={step.id}
                                ref={(item) => {
                                    items.current[position] = item;
                                }}
                                data-step={position}
                                className={cn(
                                    'flex flex-col gap-5 border-t border-line py-10 first:border-t-0 first:pt-0 lg:min-h-[65vh] lg:justify-center lg:first:pt-10',
                                    'transition-opacity duration-700 ease-luxe',
                                    position === active ? 'lg:opacity-100' : 'lg:opacity-35',
                                )}
                            >
                                {step.image && (
                                    <RevealGroup className="lg:hidden">
                                        <RevealItem variant="unveil" className="relative aspect-[4/5] overflow-hidden rounded-card bg-sunken">
                                            <MediaSettle className="absolute inset-0">
                                                <img src={step.image} alt={step.title} loading="lazy" decoding="async" className="size-full object-cover" />
                                            </MediaSettle>
                                            {step.credit && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/55 to-transparent" />}
                                            <Credit credit={step.credit} />
                                        </RevealItem>
                                    </RevealGroup>
                                )}
                                <p className="text-2xs font-medium tracking-[0.2em] text-accent uppercase tabular-nums">{t('Étape {n}', { n: pad(position + 1) })}</p>
                                <RevealWords as="h3" text={step.title} className="font-display text-display-md font-normal" />
                                {step.detail && <p className="self-start rounded-full border border-line-strong px-3.5 py-1.5 text-xs text-muted">{step.detail}</p>}
                                <Reveal delay={0.1}>
                                    <p className="max-w-md leading-relaxed text-muted">{step.body}</p>
                                </Reveal>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </section>
    );
}

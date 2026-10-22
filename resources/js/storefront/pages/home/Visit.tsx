import type { ReactNode } from 'react';
import { ArrowUpRight, MessageCircle, Phone } from 'lucide-react';
import { getLocale } from '@shared/locale';
import { directionsUrl, mapEmbedUrl } from '@shared/maps';
import { formatMoroccanPhone } from '@shared/phone';
import type { StoreLocation, StorefrontConfig } from '@shared/types';
import { ButtonLabel, buttonClasses } from '../../components/ui/Button';
import { Reveal, RevealGroup, RevealItem } from '../../motion/Reveal';
import { ChapterHeader } from './ChapterHeader';
import { t } from '../../i18n';

interface VisitProps {
    index: string;
    location: StoreLocation;
    contact: StorefrontConfig['contact'];
}

/** The shop on the map (Settings → Boutique physique), with its address, hours and ways to come or call. */
export function Visit({ index, location, contact }: VisitProps) {
    const whatsappDigits = contact.whatsapp?.replace(/\D/g, '');
    const details: Array<{ label: string; value: ReactNode }> = [];
    if (contact.address) {
        details.push({ label: t('Adresse'), value: <span className="whitespace-pre-line">{contact.address}</span> });
    }
    if (location.hours) {
        details.push({ label: t('Horaires'), value: location.hours });
    }
    if (contact.phone) {
        details.push({
            label: t('Téléphone'),
            value: (
                <a href={`tel:${contact.phone.replace(/\s/g, '')}`} dir="ltr" className="link-draw">
                    {formatMoroccanPhone(contact.phone)}
                </a>
            ),
        });
    }

    return (
        <section className="container-page pt-24 sm:pt-32" aria-labelledby="visit-title">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
                <div className="flex flex-col gap-10 lg:col-span-5">
                    <ChapterHeader index={index} label={t('Nous trouver')} title={location.title || t('Venez sentir nos parfums')} id="visit-title" />
                    {details.length > 0 && (
                        <Reveal delay={0.1}>
                            <dl className="flex flex-col divide-y divide-line border-y border-line">
                                {details.map((detail) => (
                                    <div key={detail.label} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4 py-4 text-sm">
                                        <dt className="eyebrow pt-0.5">{detail.label}</dt>
                                        <dd className="text-ink">{detail.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </Reveal>
                    )}
                    <Reveal delay={0.2} className="flex flex-wrap gap-3">
                        <a href={directionsUrl(location)} target="_blank" rel="noopener noreferrer" className={buttonClasses('primary')}>
                            <ButtonLabel>
                                {t('Itinéraire')}
                                <ArrowUpRight className="size-4 rtl:-scale-x-100" strokeWidth={1.5} />
                            </ButtonLabel>
                            <span className="sr-only">{t('(nouvel onglet)')}</span>
                        </a>
                        {contact.phone && (
                            <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className={buttonClasses('secondary')}>
                                <ButtonLabel>
                                    <Phone className="size-4" strokeWidth={1.5} />
                                    {t('Appeler')}
                                </ButtonLabel>
                            </a>
                        )}
                        {whatsappDigits && (
                            <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noopener noreferrer" className={buttonClasses('secondary')}>
                                <ButtonLabel>
                                    <MessageCircle className="size-4" strokeWidth={1.5} />
                                    WhatsApp
                                </ButtonLabel>
                                <span className="sr-only">{t('(nouvel onglet)')}</span>
                            </a>
                        )}
                    </Reveal>
                </div>

                <RevealGroup className="lg:col-span-7">
                    <RevealItem variant="unveil" className="relative aspect-[4/3] overflow-hidden rounded-card border border-line bg-raised lg:aspect-auto lg:h-full lg:min-h-[30rem]">
                        <iframe
                            src={mapEmbedUrl(location, location.zoom, getLocale())}
                            title={t('Plan d’accès à la boutique')}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            className="map-frame absolute inset-0 size-full border-0"
                        />
                    </RevealItem>
                </RevealGroup>
            </div>
        </section>
    );
}

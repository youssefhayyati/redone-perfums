import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Mail, MapPin, Phone } from 'lucide-react';
import { directionsUrl } from '@shared/maps';
import { askConsent } from '../../analytics';
import { formatMoroccanPhone } from '@shared/phone';
import { useConfig } from '../../config';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';
import { NewsletterForm } from './NewsletterForm';
import { SocialIcon } from './SocialIcon';
import { t } from '../../i18n';

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-5">
            <h2 className="eyebrow">{title}</h2>
            <ul className="flex flex-col gap-3 text-sm">{children}</ul>
        </div>
    );
}

const linkClass = 'text-muted transition-colors hover:text-ink';

export function Footer() {
    const config = useConfig();
    const { contact, location, social } = config;
    const whatsappDigits = contact.whatsapp?.replace(/\D/g, '');
    const hasContact = contact.email || contact.phone || whatsappDigits || contact.address;
    const networks = (['instagram', 'tiktok', 'facebook'] as const).filter((network) => social[network]);

    return (
        <footer className="mt-24 border-t border-line bg-raised sm:mt-32">
            <div className="container-page grid grid-cols-1 gap-12 border-b border-line py-16 lg:grid-cols-2 lg:gap-24 lg:py-20">
                <div className="flex flex-col gap-4">
                    <p className="eyebrow">{t('La lettre de la maison')}</p>
                    <p className="max-w-md font-display text-display-sm text-balance">{t('Nouvelles compositions, coffrets et éditions rares, en avant-première.')}</p>
                </div>
                <NewsletterForm />
            </div>

            <div className="container-page grid grid-cols-2 gap-10 py-16 md:grid-cols-4">
                <FooterColumn title={t('La boutique')}>
                    <li><Link to="/boutique" className={linkClass}>{t('Tous les parfums')}</Link></li>
                    {config.collections.slice(0, 4).map((collection) => (
                        <li key={collection.slug}>
                            <Link to={`/collections/${collection.slug}`} className={linkClass}>{collection.name}</Link>
                        </li>
                    ))}
                    {config.has_packs && <li><Link to="/coffrets" className={linkClass}>{t('Coffrets')}</Link></li>}
                    <li><Link to="/decouvrir" className={linkClass}>{t('Guide olfactif')}</Link></li>
                </FooterColumn>

                <FooterColumn title={t('Informations')}>
                    {config.pages.map((page) => (
                        <li key={page.slug}>
                            <Link to={`/pages/${page.slug}`} className={linkClass}>{page.title}</Link>
                        </li>
                    ))}
                    <li><Link to="/compte" className={linkClass}>{t('Mon compte')}</Link></li>
                    <li><Link to="/panier" className={linkClass}>{t('Panier')}</Link></li>
                </FooterColumn>

                {hasContact && (
                    <FooterColumn title={t('Nous écrire')}>
                        {contact.email && (
                            <li><a href={`mailto:${contact.email}`} className={`${linkClass} inline-flex items-center gap-2`}><Mail className="size-3.5" strokeWidth={1.5} />{contact.email}</a></li>
                        )}
                        {contact.phone && (
                            <li><a href={`tel:${contact.phone.replace(/\s/g, '')}`} className={`${linkClass} inline-flex items-center gap-2`}><Phone className="size-3.5" strokeWidth={1.5} /><span dir="ltr">{formatMoroccanPhone(contact.phone)}</span></a></li>
                        )}
                        {whatsappDigits && (
                            <li><a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-2`}><WhatsAppIcon className="size-3.5" strokeWidth={1.5} />WhatsApp</a></li>
                        )}
                        {contact.address &&
                            (location ? (
                                <li>
                                    <a href={directionsUrl(location)} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex gap-2`}>
                                        <MapPin className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} />
                                        <span className="whitespace-pre-line">{contact.address}</span>
                                        <span className="sr-only">{t('(itinéraire dans Google Maps, nouvel onglet)')}</span>
                                    </a>
                                </li>
                            ) : (
                                <li className="inline-flex gap-2 text-muted"><MapPin className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} /><span className="whitespace-pre-line">{contact.address}</span></li>
                            ))}
                        {contact.hours && <li className="text-faint">{contact.hours}</li>}
                    </FooterColumn>
                )}

                {networks.length > 0 && (
                    <FooterColumn title={t('Suivre la maison')}>
                        {networks.map((network) => (
                            <li key={network}>
                                <a href={social[network]} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-2 capitalize`}>
                                    <SocialIcon network={network} className="size-4" />
                                    {network === 'tiktok' ? 'TikTok' : network}
                                </a>
                            </li>
                        ))}
                    </FooterColumn>
                )}
            </div>

            <div className="container-page flex flex-col gap-3 border-t border-line py-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
                <p>© {new Date().getFullYear()} {config.store.name}. {t('Tous droits réservés.')}</p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    {(config.analytics.ga4 || config.analytics.meta_pixel) && (
                        <button type="button" onClick={askConsent} className="transition-colors hover:text-ink">
                            {t('Cookies')}
                        </button>
                    )}
                    {config.payment_methods.length > 0 && <p>{config.payment_methods.map((method) => method.label).join(' · ')}</p>}
                </div>
            </div>
        </footer>
    );
}

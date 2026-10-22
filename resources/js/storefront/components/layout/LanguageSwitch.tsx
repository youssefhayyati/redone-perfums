import { useLocation } from 'react-router';
import { cn } from '@shared/format';
import { getLocale, type Locale } from '@shared/locale';
import { localizedPath, t } from '../../i18n';

/** Each language as it names itself, with the short label shown in the switch. */
const LANGUAGES: ReadonlyArray<{ locale: Locale; short: string; name: string }> = [
    { locale: 'fr', short: 'FR', name: 'Français' },
    { locale: 'ar', short: 'AR', name: 'العربية' },
    { locale: 'en', short: 'EN', name: 'English' },
];

/**
 * The same page in each language. A full page load on purpose: the server renders the
 * shell in that language (lang, direction, fonts, metadata) and content is refetched.
 */
export function LanguageSwitch({ className }: { className?: string }) {
    const { pathname, search } = useLocation();
    const current = getLocale();

    return (
        <nav aria-label={t('Langue')} className={cn('inline-flex h-9 items-center rounded-full border border-line p-0.5 text-xs', className)}>
            <ul className="flex h-full items-center">
                {LANGUAGES.map(({ locale, short, name }) => (
                    <li key={locale} className="h-full">
                        {locale === current ? (
                            <span aria-current="true" lang={locale} title={name} className="inline-flex h-full items-center rounded-full bg-ink/6 px-2.5 text-ink">
                                <span aria-hidden="true">{short}</span>
                                <span className="sr-only">{name}</span>
                            </span>
                        ) : (
                            <a
                                href={localizedPath(pathname, locale) + search}
                                hrefLang={locale}
                                lang={locale}
                                title={name}
                                className="inline-flex h-full items-center rounded-full px-2.5 text-muted transition-colors duration-300 hover:text-ink"
                            >
                                <span aria-hidden="true">{short}</span>
                                <span className="sr-only">{name}</span>
                            </a>
                        )}
                    </li>
                ))}
            </ul>
        </nav>
    );
}

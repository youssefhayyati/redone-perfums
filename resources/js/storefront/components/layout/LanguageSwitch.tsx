import { useLocation } from 'react-router';
import { cn } from '@shared/format';
import { getLocale } from '@shared/locale';
import { localizedPath } from '../../i18n';

/**
 * The same page in the other language. A full page load on purpose: the server renders
 * the shell in that language (lang, direction, fonts, metadata) and content is refetched.
 */
export function LanguageSwitch({ className }: { className?: string }) {
    const { pathname, search } = useLocation();
    const target = getLocale() === 'ar' ? 'fr' : 'ar';

    return (
        <a
            href={localizedPath(pathname, target) + search}
            hrefLang={target}
            lang={target}
            className={cn('inline-flex h-9 items-center rounded-full border border-line px-3.5 text-xs text-ink transition-colors duration-300 hover:border-ink', className)}
        >
            {target === 'ar' ? 'العربية' : 'Français'}
        </a>
    );
}

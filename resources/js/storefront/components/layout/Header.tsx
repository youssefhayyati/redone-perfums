import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { motion } from 'framer-motion';
import { Menu, Search, ShoppingBag, User } from 'lucide-react';
import { cn } from '@shared/format';
import { useConfig } from '../../config';
import { useCart } from '../../stores/cart';
import { ui } from '../../stores/ui';
import { IconButton } from '../ui/Button';
import { LanguageSwitch } from './LanguageSwitch';
import { primaryNav } from './nav';
import { ThemeToggle } from './ThemeToggle';
import { Wordmark } from './Wordmark';
import { t, tn } from '../../i18n';

export function Header() {
    const config = useConfig();
    const count = useCart((state) => state.cart?.items_count ?? 0);
    // A new visitor has no cart until the first article: "loaded" is the end of the first fetch.
    const cartLoaded = useCart((state) => !state.loading);
    const bump = useCartBump(count, cartLoaded);
    const { pathname } = useLocation();
    const [scrolled, setScrolled] = useState(false);
    const overHero = pathname === '/' && !scrolled;

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header
            className={cn(
                'sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-500 ease-luxe',
                overHero ? 'border-b border-transparent bg-transparent' : 'border-b border-line bg-canvas/85 backdrop-blur-md',
            )}
        >
            <div className="container-page grid h-16 grid-cols-[1fr_auto_1fr] items-center sm:h-[4.5rem]">
                <nav aria-label={t('Navigation principale')} className="flex items-center">
                    <IconButton label={t('Ouvrir le menu')} className="-ms-3 lg:hidden" onClick={() => ui.open('menu')}>
                        <Menu className="size-5" strokeWidth={1.25} />
                    </IconButton>
                    <ul className="hidden items-center gap-8 lg:flex">
                        {primaryNav(config).map((item) => (
                            <li key={item.to}>
                                <NavLink
                                    to={item.to}
                                    className={({ isActive }) =>
                                        cn('link-draw text-2xs font-medium tracking-[0.2em] uppercase transition-colors', isActive ? 'text-ink [background-size:100%_1px]' : 'text-muted hover:text-ink')
                                    }
                                >
                                    {item.label}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                <Wordmark />

                <div className="-me-3 flex items-center justify-end">
                    <IconButton label={t('Rechercher un parfum')} onClick={() => ui.open('search')}>
                        <Search className="size-[1.15rem]" strokeWidth={1.25} />
                    </IconButton>
                    <span className="hidden sm:contents">
                        <LanguageSwitch className="me-1" />
                        <ThemeToggle />
                    </span>
                    <NavLink to="/compte" aria-label={t('Mon compte')} title={t('Mon compte')} className="hidden size-11 items-center justify-center text-ink transition-colors hover:text-accent sm:inline-flex">
                        <User className="size-[1.15rem]" strokeWidth={1.25} />
                    </NavLink>
                    <IconButton label={count > 0 ? t('Ouvrir le panier, {items}', { items: tn(count, 'article') }) : t('Ouvrir le panier')} onClick={() => ui.open('cart')}>
                        <motion.span
                            key={bump}
                            className="inline-flex"
                            animate={bump > 0 ? { scale: [1, 1.28, 0.9, 1.06, 1], rotate: [0, -12, 9, -3, 0] } : undefined}
                            transition={{ duration: 0.7, ease: 'easeOut' }}
                        >
                            <ShoppingBag className="size-[1.15rem]" strokeWidth={1.25} />
                        </motion.span>
                        {count > 0 && (
                            <motion.span
                                key={count}
                                aria-hidden="true"
                                initial={{ scale: 0.4 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 520, damping: 16 }}
                                className="absolute end-1 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.625rem] leading-4 font-semibold text-on-accent tabular-nums"
                            >
                                {count}
                            </motion.span>
                        )}
                    </IconButton>
                </div>
            </div>
        </header>
    );
}

/** Grows each time articles are added once the cart has been fetched, so the bag can bounce. */
function useCartBump(count: number, loaded: boolean): number {
    const [bump, setBump] = useState(0);
    const previous = useRef<number | null>(null);

    useEffect(() => {
        if (!loaded) {
            return;
        }
        if (previous.current !== null && count > previous.current) {
            setBump((value) => value + 1);
        }
        previous.current = count;
    }, [count, loaded]);

    return bump;
}

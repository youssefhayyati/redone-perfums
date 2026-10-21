import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { Menu, Search, ShoppingBag, User } from 'lucide-react';
import { cn } from '@shared/format';
import { useConfig } from '../../config';
import { useCart } from '../../stores/cart';
import { ui } from '../../stores/ui';
import { IconButton } from '../ui/Button';
import { primaryNav } from './nav';
import { ThemeToggle } from './ThemeToggle';
import { Wordmark } from './Wordmark';

export function Header() {
    const config = useConfig();
    const count = useCart((state) => state.cart?.items_count ?? 0);
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
                <nav aria-label="Navigation principale" className="flex items-center">
                    <IconButton label="Ouvrir le menu" className="-ml-3 lg:hidden" onClick={() => ui.open('menu')}>
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

                <div className="-mr-3 flex items-center justify-end">
                    <IconButton label="Rechercher un parfum" onClick={() => ui.open('search')}>
                        <Search className="size-[1.15rem]" strokeWidth={1.25} />
                    </IconButton>
                    <span className="hidden sm:contents">
                        <ThemeToggle />
                    </span>
                    <NavLink to="/compte" aria-label="Mon compte" title="Mon compte" className="hidden size-11 items-center justify-center text-ink transition-colors hover:text-accent sm:inline-flex">
                        <User className="size-[1.15rem]" strokeWidth={1.25} />
                    </NavLink>
                    <IconButton label={count > 0 ? `Ouvrir le panier, ${count} article${count > 1 ? 's' : ''}` : 'Ouvrir le panier'} onClick={() => ui.open('cart')}>
                        <ShoppingBag className="size-[1.15rem]" strokeWidth={1.25} />
                        {count > 0 && (
                            <span aria-hidden="true" className="absolute top-1.5 right-1 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.625rem] leading-4 font-semibold text-on-accent tabular-nums">
                                {count}
                            </span>
                        )}
                    </IconButton>
                </div>
            </div>
        </header>
    );
}

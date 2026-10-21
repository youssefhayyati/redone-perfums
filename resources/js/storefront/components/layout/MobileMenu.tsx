import { Link } from 'react-router';
import { useConfig } from '../../config';
import { useSession } from '../../stores/session';
import { ui, useUi } from '../../stores/ui';
import { Drawer } from '../ui/Drawer';
import { primaryNav } from './nav';
import { ThemeToggle } from './ThemeToggle';

export function MobileMenu() {
    const config = useConfig();
    const open = useUi((state) => state.overlay === 'menu');
    const signedIn = useSession((state) => state.status === 'authenticated');

    return (
        <Drawer open={open} onClose={ui.close} side="left" title="Menu">
            <nav aria-label="Menu mobile" className="flex flex-col gap-10 px-6 py-8">
                <ul className="flex flex-col gap-5">
                    {primaryNav(config).map((item) => (
                        <li key={item.to}>
                            <Link to={item.to} className="font-display text-4xl transition-colors hover:text-accent">
                                {item.label}
                            </Link>
                        </li>
                    ))}
                </ul>

                {config.collections.length > 0 && (
                    <div className="flex flex-col gap-4">
                        <p className="eyebrow">Collections</p>
                        <ul className="flex flex-col gap-3">
                            {config.collections.map((collection) => (
                                <li key={collection.slug}>
                                    <Link to={`/collections/${collection.slug}`} className="text-muted transition-colors hover:text-ink">
                                        {collection.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="flex items-center justify-between border-t border-line pt-6">
                    <Link to="/compte" className="text-sm text-ink">
                        {signedIn ? 'Mon compte' : 'Se connecter'}
                    </Link>
                    <ThemeToggle />
                </div>
            </nav>
        </Drawer>
    );
}

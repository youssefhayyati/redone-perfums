import { Link } from 'react-router';
import { useConfig } from '../../config';
import { useSession } from '../../stores/session';
import { ui, useUi } from '../../stores/ui';
import { Drawer } from '../ui/Drawer';
import { LanguageSwitch } from './LanguageSwitch';
import { primaryNav } from './nav';
import { ThemeToggle } from './ThemeToggle';
import { t } from '../../i18n';

export function MobileMenu() {
    const config = useConfig();
    const open = useUi((state) => state.overlay === 'menu');
    const signedIn = useSession((state) => state.status === 'authenticated');

    return (
        <Drawer open={open} onClose={ui.close} side="start" title={t('Menu')}>
            <nav aria-label={t('Menu mobile')} className="flex flex-col gap-10 px-6 py-8">
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
                        <p className="eyebrow">{t('Collections')}</p>
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
                        {signedIn ? t('Mon compte') : t('Se connecter')}
                    </Link>
                    <div className="flex items-center gap-1">
                        <LanguageSwitch />
                        <ThemeToggle />
                    </div>
                </div>
            </nav>
        </Drawer>
    );
}

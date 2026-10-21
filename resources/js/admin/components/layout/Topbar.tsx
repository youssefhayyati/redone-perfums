import { useNavigate } from 'react-router';
import { ChevronDown, LogOut, Menu as MenuIcon, Moon, Sun } from 'lucide-react';
import { useTheme } from '@shared/theme';
import { initials } from '../../lib/format';
import { signOut } from '../../session';
import type { AdminUser } from '../../types';
import { IconButton } from '../ui/Button';
import { Menu } from '../ui/Menu';
import { toast } from '../ui/toast';
import { Wordmark } from './Sidebar';

export function ThemeToggle() {
    const [theme, setTheme] = useTheme();
    const next = theme === 'dark' ? 'light' : 'dark';

    return (
        <IconButton
            icon={theme === 'dark' ? Sun : Moon}
            label={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
            onClick={() => setTheme(next)}
        />
    );
}

function UserMenu({ user }: { user: AdminUser }) {
    const navigate = useNavigate();

    const logout = async () => {
        try {
            await signOut();
        } catch {
            toast.error('La déconnexion a échoué côté serveur ; la session locale a été fermée.');
        }
        navigate('/connexion', { replace: true });
    };

    return (
        <Menu
            triggerLabel={`Compte de ${user.name}`}
            triggerClassName="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 text-left transition-colors hover:bg-ink/[0.06]"
            trigger={
                <>
                    <span className="flex size-7 items-center justify-center rounded-full border border-line-strong bg-sunken text-2xs font-semibold text-ink" aria-hidden>
                        {initials(user.name)}
                    </span>
                    <span className="hidden min-w-0 flex-col leading-tight sm:flex">
                        <span className="max-w-40 truncate text-xs font-medium text-ink">{user.name}</span>
                        <span className="text-2xs text-muted">{user.role_label}</span>
                    </span>
                    <ChevronDown className="hidden size-3.5 text-muted sm:block" aria-hidden />
                </>
            }
            header={
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                    <p className="mt-2 text-2xs font-medium uppercase tracking-label text-accent">{user.role_label}</p>
                </div>
            }
            actions={[{ label: 'Se déconnecter', icon: <LogOut className="size-4 text-muted" aria-hidden />, onSelect: () => void logout() }]}
        />
    );
}

export function Topbar({ user, onOpenNavigation, navigationOpen }: { user: AdminUser; onOpenNavigation: () => void; navigationOpen: boolean }) {
    return (
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
            <IconButton
                icon={MenuIcon}
                label="Ouvrir la navigation"
                onClick={onOpenNavigation}
                aria-haspopup="dialog"
                aria-expanded={navigationOpen}
                className="-ml-2 lg:hidden"
            />
            <Wordmark className="lg:hidden [&>span:last-child]:hidden" />
            <div className="ml-auto flex items-center gap-1">
                <ThemeToggle />
                <span className="mx-1 h-5 w-px bg-line" aria-hidden />
                <UserMenu user={user} />
            </div>
        </header>
    );
}

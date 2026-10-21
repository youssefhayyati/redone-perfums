import { Link, NavLink } from 'react-router';
import { ExternalLink } from 'lucide-react';
import { cn } from '@shared/format';
import { NAVIGATION, filterNavigation } from '../../navigation';
import type { Permission } from '../../types';

export function Wordmark({ className }: { className?: string }) {
    return (
        <Link to="/" className={cn('inline-flex flex-col rounded leading-none', className)} aria-label="Redone — tableau de bord">
            <span className="text-[0.8125rem] font-semibold uppercase tracking-wordmark text-ink">Redone</span>
            <span className="mt-1.5 text-2xs uppercase tracking-label text-muted" aria-hidden>
                Administration
            </span>
        </Link>
    );
}

export function SidebarContent({ permissions, badges = {} }: { permissions: readonly Permission[]; badges?: Record<string, number | undefined> }) {
    const sections = filterNavigation(NAVIGATION, permissions);

    return (
        <div className="flex h-full flex-col">
            <div className="flex h-16 shrink-0 items-center px-5">
                <Wordmark />
            </div>
            <nav aria-label="Navigation principale" className="no-scrollbar flex-1 overflow-y-auto px-3 pb-6">
                {sections.map((section) => (
                    <div key={section.label} className="mt-6 first:mt-1">
                        <p className="px-2.5 pb-2 text-2xs font-medium uppercase tracking-label text-muted">{section.label}</p>
                        <ul className="flex flex-col gap-px">
                            {section.items.map((item) => {
                                const badge = badges[item.to];

                                return (
                                    <li key={item.to}>
                                        <NavLink
                                            to={item.to}
                                            end={item.end}
                                            className={({ isActive }) =>
                                                cn(
                                                    'group relative flex items-center gap-3 rounded-lg px-2.5 py-[0.4375rem] text-sm transition-colors',
                                                    isActive ? 'bg-raised font-medium text-ink' : 'text-muted hover:bg-ink/[0.045] hover:text-ink',
                                                )
                                            }
                                        >
                                            {({ isActive }) => (
                                                <>
                                                    <span
                                                        className={cn('absolute inset-y-2 -left-3 w-0.5 rounded-r-full', isActive ? 'bg-accent' : 'bg-transparent')}
                                                        aria-hidden
                                                    />
                                                    <item.icon
                                                        className={cn('size-4 shrink-0', isActive ? 'text-accent' : 'text-muted group-hover:text-ink')}
                                                        aria-hidden
                                                    />
                                                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                                                    {badge !== undefined && badge > 0 && (
                                                        <span className="rounded-full bg-warning/15 px-1.5 text-2xs font-semibold leading-4 tabular-nums text-warning">
                                                            {badge}
                                                            <span className="sr-only"> en attente</span>
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </NavLink>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>
            <div className="shrink-0 border-t border-line px-5 py-4">
                <a href="/" target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded text-xs text-muted transition-colors hover:text-ink">
                    <ExternalLink className="size-3.5" aria-hidden />
                    Voir la boutique
                    <span className="sr-only">(nouvel onglet)</span>
                </a>
            </div>
        </div>
    );
}

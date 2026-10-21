import { Link } from 'react-router';

export function Breadcrumbs({ items }: { items: Array<{ label: string; to?: string }> }) {
    return (
        <nav aria-label="Fil d’Ariane">
            <ol className="flex flex-wrap items-center gap-2 text-2xs tracking-[0.18em] text-muted uppercase">
                {items.map((item, index) => (
                    <li key={`${item.label}-${index}`} className="flex items-center gap-2">
                        {index > 0 && <span aria-hidden="true" className="h-px w-3 bg-line-strong" />}
                        {item.to ? (
                            <Link to={item.to} className="transition-colors hover:text-ink">
                                {item.label}
                            </Link>
                        ) : (
                            <span aria-current="page" className="text-ink">
                                {item.label}
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

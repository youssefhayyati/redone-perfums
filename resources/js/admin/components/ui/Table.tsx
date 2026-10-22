import type { ComponentProps, MouseEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { cn } from '@shared/format';

/**
 * Dense ledger tables. Columns marked `hideBelow` disappear on narrow screens so a
 * list stays readable on a phone without horizontal scrolling for the key columns.
 */
type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';

const HIDE: Record<Breakpoint, string> = {
    sm: 'hidden sm:table-cell',
    md: 'hidden md:table-cell',
    lg: 'hidden lg:table-cell',
    xl: 'hidden xl:table-cell',
};

export function DataTable({ children, className, caption }: { children: ReactNode; className?: string; caption?: string }) {
    return (
        <div className={cn('relative overflow-x-auto', className)}>
            <table className="w-full border-collapse text-sm [&_tbody_tr:last-child>td]:border-b-0">
                {caption && <caption className="sr-only">{caption}</caption>}
                {children}
            </table>
        </div>
    );
}

interface CellProps {
    align?: 'left' | 'right' | 'center';
    hideBelow?: Breakpoint;
    className?: string;
    children?: ReactNode;
}

export function Th({ align = 'left', hideBelow, className, children, ...props }: CellProps & Omit<ComponentProps<'th'>, 'align'>) {
    return (
        <th
            scope="col"
            {...props}
            className={cn(
                'whitespace-nowrap border-b border-line px-3 py-2.5 text-2xs font-medium uppercase tracking-label text-muted first:pl-4 last:pr-4 sm:px-4',
                align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
                hideBelow && HIDE[hideBelow],
                className,
            )}
        >
            {children}
        </th>
    );
}

export function Td({ align = 'left', hideBelow, className, children, ...props }: CellProps & Omit<ComponentProps<'td'>, 'align'>) {
    return (
        <td
            {...props}
            className={cn(
                'border-b border-line px-3 py-3 align-middle first:pl-4 last:pr-4 sm:px-4',
                align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
                hideBelow && HIDE[hideBelow],
                className,
            )}
        >
            {children}
        </td>
    );
}

const INTERACTIVE = 'a, button, input, select, textarea, label, [role="button"], [role="switch"]';

/**
 * A row that opens its record when clicked anywhere. Keyboard users reach the same
 * destination through the link placed in the row's main cell.
 */
export function LinkRow({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
    const navigate = useNavigate();

    const onClick = (event: MouseEvent<HTMLTableRowElement>) => {
        if (event.defaultPrevented || (event.target as HTMLElement).closest(INTERACTIVE) || window.getSelection()?.toString()) {
            return;
        }
        if (event.metaKey || event.ctrlKey) {
            window.open(`/admin${to}`, '_blank', 'noopener');

            return;
        }
        navigate(to);
    };

    return (
        <tr onClick={onClick} className={cn('cursor-pointer transition-colors hover:bg-ink/[0.035]', className)}>
            {children}
        </tr>
    );
}

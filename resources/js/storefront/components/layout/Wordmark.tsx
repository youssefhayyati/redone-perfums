import { Link } from 'react-router';
import { cn } from '@shared/format';
import { useConfig } from '../../config';

export function Wordmark({ className, withDescriptor = true }: { className?: string; withDescriptor?: boolean }) {
    const { store } = useConfig();

    return (
        <Link to="/" className={cn('group flex flex-col items-center gap-1 leading-none', className)} aria-label={`${store.name} — accueil`}>
            <span className="wordmark text-[1.35rem] sm:text-[1.6rem]">{store.wordmark}</span>
            {withDescriptor && <span className="hidden text-[0.5625rem] tracking-[0.42em] text-muted uppercase sm:block">{store.descriptor}</span>}
        </Link>
    );
}

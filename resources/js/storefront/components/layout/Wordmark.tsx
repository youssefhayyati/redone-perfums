import { Link } from 'react-router';
import { LogoMark } from '@shared/LogoMark';
import { cn } from '@shared/format';
import { useConfig } from '../../config';

/** The logotype sets a leading "my" in accent italic: *my*perfum. Any other text is set as is. */
function LogoType({ text }: { text: string }) {
    const parts = /^(my)(.+)$/i.exec(text);

    if (!parts) {
        return <>{text}</>;
    }

    return (
        <>
            <em className="pr-[0.04em] font-normal text-accent italic">{parts[1]}</em>
            {parts[2]}
        </>
    );
}

export function Wordmark({ className, withDescriptor = true }: { className?: string; withDescriptor?: boolean }) {
    const { store } = useConfig();

    return (
        <Link to="/" className={cn('group flex items-center gap-2.5 leading-none', className)} aria-label={`${store.name} — accueil`}>
            <LogoMark className="size-7 shrink-0 text-ink transition-transform duration-500 ease-spring group-hover:-rotate-12 sm:size-8" />
            <span className="flex flex-col items-start gap-1.5">
                <span className="wordmark text-[1.6rem] sm:text-[1.85rem]">
                    <LogoType text={store.wordmark} />
                </span>
                {withDescriptor && <span className="hidden pl-px text-[0.5rem] tracking-[0.38em] text-muted uppercase sm:block">{store.descriptor}</span>}
            </span>
        </Link>
    );
}

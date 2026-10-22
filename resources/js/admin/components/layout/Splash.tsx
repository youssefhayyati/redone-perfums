import { LogoMark } from '@shared/LogoMark';

/** Shown while the session is being checked or the first screen loads. */
export function Splash() {
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas" role="status">
            <LogoMark className="size-9 text-ink" />
            <span className="h-px w-16 overflow-hidden bg-line">
                <span className="block h-full w-1/2 animate-[admin-progress_1.2s_ease-in-out_infinite] bg-accent" />
            </span>
            <span className="sr-only">Chargement de l’administration…</span>
        </div>
    );
}

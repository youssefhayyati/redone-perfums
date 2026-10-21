import type { ImageAsset } from '@shared/types';
import { cn } from '@shared/format';

interface ProductImageProps {
    image: ImageAsset | null | undefined;
    alt: string;
    sizes?: string;
    priority?: boolean;
    className?: string;
}

/** Responsive product image; a drawn bottle stands in when no photo exists yet. */
export function ProductImage({ image, alt, sizes = '(min-width: 64rem) 25vw, 50vw', priority = false, className }: ProductImageProps) {
    if (!image?.url) {
        return <BottleSilhouette className={className} />;
    }

    return (
        <img
            src={image.url}
            srcSet={image.srcset ?? undefined}
            sizes={image.srcset ? sizes : undefined}
            alt={image.alt || alt}
            width={image.width ?? undefined}
            height={image.height ?? undefined}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            decoding="async"
            className={cn('object-contain', className)}
        />
    );
}

export function BottleSilhouette({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 120 150" className={cn('text-line-strong', className)} fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
            <rect x="50" y="18" width="20" height="16" />
            <path d="M54 34h12v8H54z" />
            <rect x="32" y="42" width="56" height="88" rx="6" />
            <path d="M44 72h32M44 78h22" strokeOpacity="0.6" />
        </svg>
    );
}

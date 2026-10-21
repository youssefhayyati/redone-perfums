import { useState } from 'react';
import type { ImageAsset } from '@shared/types';
import { cn } from '@shared/format';
import { LightSweep } from '../../motion/LightSweep';
import { ProductImage } from '../ui/ProductImage';
import { auraStyle } from './ProductCard';

export function Gallery({ images, name, accent }: { images: ImageAsset[]; name: string; accent: string | null }) {
    const [active, setActive] = useState(0);
    const current = images[active] ?? images[0] ?? null;

    return (
        <div className="flex flex-col gap-3">
            {/* Mobile: swipeable strip */}
            <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory overflow-x-auto md:hidden" aria-label={`Images de ${name}`}>
                {(images.length > 0 ? images : [null]).map((image, index) => (
                    <div key={image?.id ?? index} className="aura relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden" style={auraStyle(accent)}>
                        <ProductImage image={image} alt={name} priority={index === 0} sizes="100vw" className="absolute inset-0 size-full p-[10%]" />
                        {index === 0 && <LightSweep />}
                    </div>
                ))}
            </div>

            {/* Desktop: stage + thumbnails */}
            <div className="aura relative hidden aspect-[4/5] overflow-hidden md:block" style={auraStyle(accent)}>
                <ProductImage key={current?.id ?? 'placeholder'} image={current} alt={name} priority sizes="(min-width: 80rem) 45vw, 50vw" className="absolute inset-0 size-full p-[9%]" />
                <LightSweep />
            </div>
            {images.length > 1 && (
                <div className="hidden gap-3 md:flex" role="tablist" aria-label="Choisir une image">
                    {images.map((image, index) => (
                        <button
                            key={image.id}
                            type="button"
                            role="tab"
                            aria-selected={index === active}
                            aria-label={`Image ${index + 1} sur ${images.length}`}
                            onClick={() => setActive(index)}
                            className={cn('aura size-20 overflow-hidden border transition-colors', index === active ? 'border-ink' : 'border-transparent hover:border-line-strong')}
                            style={auraStyle(accent)}
                        >
                            <ProductImage image={image} alt="" sizes="80px" className="size-full p-2" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

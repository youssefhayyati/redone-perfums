import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Plus, Search, Trash2, X } from 'lucide-react';
import { cn } from '@shared/format';
import * as api from '../../api';
import type { UploadFolder } from '../../api';
import { moveItem } from '../../lib/arrays';
import { errorText, toFieldErrors } from '../../lib/errors';
import { PRODUCT_STATUS_LABELS } from '../../lib/status';
import type { ProductStatus } from '../../types';
import { Button, IconButton } from './Button';
import { FieldError } from './form';

/**
 * Cover image for a collection or a pack: uploaded through POST /uploads, which
 * returns a managed path saved on the record.
 */
export function ImageField({
    folder,
    path,
    url,
    onChange,
    error,
    label,
}: {
    folder: UploadFolder;
    path: string | null;
    url: string | null;
    onChange: (image: { path: string | null; url: string | null }) => void;
    error?: string;
    label: string;
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    async function upload(file: File) {
        setBusy(true);
        setUploadError(null);
        try {
            const stored = await api.uploads.image(file, folder);
            onChange({ path: stored.path, url: stored.url });
        } catch (failure) {
            setUploadError(toFieldErrors(failure).image ?? errorText(failure));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
                <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-sunken">
                    {url ? <img src={url} alt="" className="size-full object-cover" /> : <ImagePlus className="size-5 text-muted" aria-hidden />}
                </div>
                <div className="flex flex-col items-start gap-2">
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" loading={busy} onClick={() => fileRef.current?.click()}>
                            {path ? 'Remplacer l’image' : 'Téléverser une image'}
                        </Button>
                        {path && (
                            <Button size="sm" variant="ghost" icon={X} onClick={() => onChange({ path: null, url: null })} disabled={busy}>
                                Retirer
                            </Button>
                        )}
                    </div>
                    <p className="text-xs text-muted">JPG, PNG ou WebP · 400 × 400 px minimum · 8 Mo maximum</p>
                </div>
            </div>
            <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                tabIndex={-1}
                aria-label={label}
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) {
                        void upload(file);
                    }
                }}
            />
            {(uploadError ?? error) && <FieldError>{uploadError ?? error}</FieldError>}
        </div>
    );
}

export interface PickableProduct {
    id: number;
    name: string;
    status: ProductStatus;
}

/**
 * Chooses products among the catalog options. With `ordered`, the selection is a
 * list that can be rearranged (collection display order).
 */
export function ProductPicker({
    products,
    value,
    onChange,
    ordered = false,
    label,
}: {
    products: PickableProduct[];
    value: number[];
    onChange: (ids: number[]) => void;
    ordered?: boolean;
    label: string;
}) {
    const [search, setSearch] = useState('');
    const byId = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
    const selected = value.map((id) => byId.get(id) ?? { id, name: `Produit #${id}`, status: 'archived' as ProductStatus });
    const term = search.trim().toLocaleLowerCase('fr');
    const available = products.filter(
        (product) =>
            !value.includes(product.id) &&
            (term === '' || product.name.toLocaleLowerCase('fr').normalize('NFD').replace(/[̀-ͯ]/g, '').includes(term.normalize('NFD').replace(/[̀-ͯ]/g, ''))),
    );

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-2">
                <p className="text-xs font-medium text-ink">
                    {label} <span className="font-normal text-muted">({value.length})</span>
                </p>
                {selected.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">Aucun parfum sélectionné.</p>
                ) : (
                    <ol className="flex max-h-80 flex-col divide-y divide-line overflow-y-auto rounded-lg border border-line">
                        {selected.map((product, index) => (
                            <li key={product.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                                {ordered && <span className="w-5 shrink-0 text-xs tabular-nums text-muted">{index + 1}</span>}
                                <span className="min-w-0 flex-1 truncate text-ink">
                                    {product.name}
                                    {product.status !== 'active' && <span className="ml-1.5 text-xs text-muted">({PRODUCT_STATUS_LABELS[product.status]})</span>}
                                </span>
                                {ordered && (
                                    <>
                                        <IconButton icon={ArrowUp} size="sm" label={`Monter ${product.name}`} disabled={index === 0} onClick={() => onChange(moveItem(value, index, index - 1))} />
                                        <IconButton
                                            icon={ArrowDown}
                                            size="sm"
                                            label={`Descendre ${product.name}`}
                                            disabled={index === value.length - 1}
                                            onClick={() => onChange(moveItem(value, index, index + 1))}
                                        />
                                    </>
                                )}
                                <IconButton icon={Trash2} size="sm" variant="danger" label={`Retirer ${product.name}`} onClick={() => onChange(value.filter((id) => id !== product.id))} />
                            </li>
                        ))}
                    </ol>
                )}
            </div>
            <div className="flex min-w-0 flex-col gap-2">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        aria-label="Rechercher un parfum à ajouter"
                        placeholder="Rechercher un parfum à ajouter"
                        className="field-control pl-9"
                    />
                </div>
                <ul className="flex max-h-72 flex-col divide-y divide-line overflow-y-auto rounded-lg border border-line" aria-label="Parfums disponibles">
                    {available.length === 0 ? (
                        <li className="px-3 py-4 text-center text-sm text-muted">{term ? 'Aucun parfum trouvé.' : 'Tous les parfums sont sélectionnés.'}</li>
                    ) : (
                        available.map((product) => (
                            <li key={product.id}>
                                <button
                                    type="button"
                                    onClick={() => onChange([...value, product.id])}
                                    className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-ink/[0.04] focus-visible:bg-ink/[0.04]')}
                                >
                                    <Plus className="size-3.5 shrink-0 text-muted" aria-hidden />
                                    <span className="min-w-0 flex-1 truncate text-ink">{product.name}</span>
                                    {product.status !== 'active' && <span className="text-xs text-muted">{PRODUCT_STATUS_LABELS[product.status]}</span>}
                                    <span className="sr-only">— ajouter</span>
                                </button>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}

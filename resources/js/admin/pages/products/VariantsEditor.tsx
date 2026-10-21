import { useId, type ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@shared/format';
import { Button, IconButton } from '../../components/ui/Button';
import { FieldError, MoneyInput, AffixInput, TextInput } from '../../components/ui/form';
import { InlineAlert } from '../../components/ui/feedback';
import type { FieldErrors } from '../../lib/errors';
import { newVariantRow, suggestSku, type VariantRow } from './productForm';

const COLUMNS = '@min-[41rem]:grid-cols-[4.75rem_minmax(6rem,1fr)_6.5rem_6.5rem_4.25rem_4.25rem_2.75rem_2.25rem] @min-[41rem]:gap-2';

interface VariantsEditorProps {
    rows: VariantRow[];
    onChange: (rows: VariantRow[]) => void;
    errors: FieldErrors;
    productName: string;
    sizes: number[];
}

function Cell({ label, id, error, className, children }: { label: string; id: string; error?: string; className?: string; children: ReactNode }) {
    return (
        <div className={cn('flex min-w-0 flex-col gap-1', className)}>
            <label htmlFor={id} className="text-2xs font-medium text-muted @min-[41rem]:sr-only">
                {label}
            </label>
            {children}
            {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
        </div>
    );
}

/**
 * Formats of a product (size, SKU, prices in DH, stock, alert threshold, active).
 * A table on wide screens, stacked cards below. Errors use `variants.N.field` keys.
 */
export function VariantsEditor({ rows, onChange, errors, productName, sizes }: VariantsEditorProps) {
    const baseId = useId();

    const update = (index: number, patch: Partial<VariantRow>) => onChange(rows.map((row, position) => (position === index ? { ...row, ...patch } : row)));

    const add = () => {
        const used = new Set(rows.map((row) => row.size_ml));
        const size = [30, 50, 100, ...sizes].map(String).find((candidate) => !used.has(candidate)) ?? '';
        onChange([...rows, newVariantRow({ size_ml: size, sku: suggestSku(productName, size) })]);
    };

    return (
        <div className="@container flex flex-col gap-3">
            {errors.variants && (
                <InlineAlert tone="danger" live>
                    {errors.variants}
                </InlineAlert>
            )}

            <div className={cn('hidden gap-3 border-b border-line pb-2 text-2xs font-medium uppercase tracking-wide text-muted @min-[41rem]:grid', COLUMNS)} aria-hidden>
                <span>Volume</span>
                <span>Référence</span>
                <span>Prix</span>
                <span>Prix barré</span>
                <span>Stock</span>
                <span>Alerte</span>
                <span>Actif</span>
                <span />
            </div>

            <ul className="flex flex-col gap-3 @min-[41rem]:gap-2">
                {rows.map((row, index) => {
                    const id = (field: string) => `${baseId}-${index}-${field}`;
                    const error = (field: string) => errors[`variants.${index}.${field}`];
                    const control = (field: string) => ({
                        id: id(field),
                        'aria-invalid': error(field) ? (true as const) : undefined,
                        'aria-describedby': error(field) ? `${id(field)}-error` : undefined,
                    });

                    return (
                        <li
                            key={row.key}
                            className={cn('grid grid-cols-2 items-start gap-3 rounded-lg border border-line p-3 @md:grid-cols-4 @min-[41rem]:rounded-none @min-[41rem]:border-0 @min-[41rem]:p-0', COLUMNS)}
                            aria-label={`Format ${index + 1}${row.size_ml ? ` — ${row.size_ml} ml` : ''}`}
                        >
                            <Cell label="Contenance" id={id('size_ml')} error={error('size_ml')}>
                                <AffixInput
                                    {...control('size_ml')}
                                    inputMode="numeric"
                                    suffix="ml"
                                    value={row.size_ml}
                                    onChange={(event) => update(index, { size_ml: event.target.value })}
                                    aria-label={`Contenance du format ${index + 1}`}
                                />
                            </Cell>
                            <Cell label="Référence (SKU)" id={id('sku')} error={error('sku')} className="col-span-1 @md:col-span-3 @min-[41rem]:col-span-1">
                                <TextInput
                                    {...control('sku')}
                                    value={row.sku}
                                    spellCheck={false}
                                    autoCapitalize="characters"
                                    onChange={(event) => update(index, { sku: event.target.value.toUpperCase() })}
                                    onFocus={() => {
                                        if (row.sku === '' && row.size_ml !== '') {
                                            update(index, { sku: suggestSku(productName, row.size_ml) });
                                        }
                                    }}
                                    className="font-mono text-xs"
                                    aria-label={`Référence du format ${index + 1}`}
                                />
                            </Cell>
                            <Cell label="Prix" id={id('price')} error={error('price')}>
                                <MoneyInput {...control('price')} value={row.price} onChange={(event) => update(index, { price: event.target.value })} aria-label={`Prix du format ${index + 1}, en dirhams`} />
                            </Cell>
                            <Cell label="Prix barré" id={id('compare_at_price')} error={error('compare_at_price')}>
                                <MoneyInput
                                    {...control('compare_at_price')}
                                    value={row.compare_at_price}
                                    placeholder="—"
                                    onChange={(event) => update(index, { compare_at_price: event.target.value })}
                                    aria-label={`Prix barré du format ${index + 1}, en dirhams (facultatif)`}
                                />
                            </Cell>
                            <Cell label="Stock" id={id('stock')} error={error('stock')}>
                                <TextInput
                                    {...control('stock')}
                                    inputMode="numeric"
                                    value={row.stock}
                                    onChange={(event) => update(index, { stock: event.target.value })}
                                    className="tabular-nums"
                                    aria-label={`Stock du format ${index + 1}`}
                                />
                            </Cell>
                            <Cell label="Seuil d’alerte" id={id('low_stock_threshold')} error={error('low_stock_threshold')}>
                                <TextInput
                                    {...control('low_stock_threshold')}
                                    inputMode="numeric"
                                    value={row.low_stock_threshold}
                                    placeholder="5"
                                    onChange={(event) => update(index, { low_stock_threshold: event.target.value })}
                                    className="tabular-nums"
                                    aria-label={`Seuil d’alerte de stock du format ${index + 1}`}
                                />
                            </Cell>
                            <div className="flex h-10 items-center gap-2 self-end @min-[41rem]:justify-center @min-[41rem]:self-start">
                                <input
                                    id={id('is_active')}
                                    type="checkbox"
                                    checked={row.is_active}
                                    onChange={(event) => update(index, { is_active: event.target.checked })}
                                    className="size-4 accent-accent"
                                />
                                <label htmlFor={id('is_active')} className="text-xs text-ink @min-[41rem]:sr-only">
                                    Actif<span className="sr-only"> (format {index + 1} en vente)</span>
                                </label>
                            </div>
                            <div className="flex h-10 items-center justify-end self-end @min-[41rem]:self-start">
                                <IconButton
                                    icon={Trash2}
                                    variant="danger"
                                    label={`Retirer le format ${index + 1}`}
                                    disabled={rows.length === 1}
                                    onClick={() => onChange(rows.filter((_, position) => position !== index))}
                                />
                            </div>
                            {error('id') && <FieldError className="col-span-full">{error('id')}</FieldError>}
                        </li>
                    );
                })}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <Button size="sm" icon={Plus} onClick={add} disabled={rows.length >= 12}>
                    Ajouter un format
                </Button>
                <p className="text-xs text-muted">
                    Prix en dirhams (ex. 450 ou 450,50). Un changement de stock ici est tracé dans l’historique du stock. Un format déjà vendu est désactivé plutôt que supprimé.
                </p>
            </div>
        </div>
    );
}

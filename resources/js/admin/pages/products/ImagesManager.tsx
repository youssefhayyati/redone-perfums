import { useRef, useState, type DragEvent, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@shared/format';
import * as api from '../../api';
import { Button, IconButton } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Dialog } from '../../components/ui/Dialog';
import { Field, TextInput } from '../../components/ui/form';
import { toast } from '../../components/ui/toast';
import { moveItem } from '../../lib/arrays';
import { errorText, toFieldErrors } from '../../lib/errors';
import type { ImageAsset } from '../../types';

const MAX_IMAGES = 12;
const ACCEPT = 'image/jpeg,image/png,image/webp';

/**
 * Product photos: upload (JPG, PNG or WebP, 400 px minimum), reorder by drag and
 * drop or with the arrow buttons (keyboard), edit the alternative text, delete. The
 * first image is the one shown on product cards.
 */
export function ImagesManager({ productId, productName, images, onChange }: { productId: number; productName: string; images: ImageAsset[]; onChange: (images: ImageAsset[]) => void }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dropActive, setDropActive] = useState(false);
    const [editing, setEditing] = useState<ImageAsset | null>(null);
    const [deleting, setDeleting] = useState<ImageAsset | null>(null);
    const [altDraft, setAltDraft] = useState('');
    const [altBusy, setAltBusy] = useState(false);
    const [altError, setAltError] = useState<string | undefined>();
    const remaining = MAX_IMAGES - images.length;

    async function upload(files: File[]) {
        const accepted = files.filter((file) => ACCEPT.split(',').includes(file.type));
        if (accepted.length < files.length) {
            toast.error('Formats acceptés : JPG, PNG ou WebP.');
        }
        const batch = accepted.slice(0, Math.max(0, remaining));
        if (accepted.length > batch.length) {
            toast.error(`Douze images maximum par produit : ${accepted.length - batch.length} fichier(s) ignoré(s).`);
        }
        if (batch.length === 0) {
            return;
        }

        let current = images;
        setUploading({ done: 0, total: batch.length });
        for (const [index, file] of batch.entries()) {
            try {
                const image = await api.products.uploadImage(productId, file, null);
                current = [...current, image];
                onChange(current);
            } catch (error) {
                toast.error(`${file.name} : ${toFieldErrors(error).image ?? errorText(error)}`);
            }
            setUploading({ done: index + 1, total: batch.length });
        }
        setUploading(null);
        if (current.length > images.length) {
            toast.success(current.length - images.length > 1 ? `${current.length - images.length} images ajoutées.` : 'Image ajoutée.');
        }
    }

    async function reorder(next: ImageAsset[]) {
        const previous = images;
        onChange(next);
        try {
            onChange(await api.products.reorderImages(productId, next.map((image) => image.id)));
        } catch (error) {
            onChange(previous);
            toast.error(error);
        }
    }

    async function saveAlt(event: FormEvent) {
        event.preventDefault();
        if (!editing) {
            return;
        }
        setAltBusy(true);
        setAltError(undefined);
        try {
            const updated = await api.products.updateImage(productId, editing.id, altDraft.trim() === '' ? null : altDraft.trim());
            onChange(images.map((image) => (image.id === updated.id ? updated : image)));
            toast.success('Texte alternatif enregistré.');
            setEditing(null);
        } catch (error) {
            setAltError(toFieldErrors(error).alt ?? errorText(error));
        } finally {
            setAltBusy(false);
        }
    }

    const onDrop = (event: DragEvent, target: number) => {
        event.preventDefault();
        if (dragIndex !== null && dragIndex !== target) {
            void reorder(moveItem(images, dragIndex, target));
        }
        setDragIndex(null);
    };

    return (
        <div className="flex flex-col gap-4">
            {images.length > 0 && (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" aria-label="Images du produit, dans l’ordre d’affichage">
                    {images.map((image, index) => (
                        <li
                            key={image.id}
                            draggable
                            onDragStart={(event) => {
                                setDragIndex(index);
                                event.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragOver={(event) => {
                                if (dragIndex !== null) {
                                    event.preventDefault();
                                }
                            }}
                            onDrop={(event) => onDrop(event, index)}
                            onDragEnd={() => setDragIndex(null)}
                            className={cn(
                                'group overflow-hidden rounded-lg border bg-sunken transition-opacity',
                                dragIndex === index ? 'border-accent opacity-50' : 'border-line',
                                dragIndex !== null && 'cursor-grabbing',
                            )}
                        >
                            <div className="relative aspect-square cursor-grab">
                                {image.url ? (
                                    <img src={image.url} srcSet={image.srcset ?? undefined} sizes="200px" alt={image.alt ?? ''} className="size-full object-cover" loading="lazy" draggable={false} />
                                ) : (
                                    <div className="flex size-full items-center justify-center text-xs text-muted">Image indisponible</div>
                                )}
                                <span className="absolute left-2 top-2 rounded-md bg-canvas/85 px-1.5 py-0.5 text-2xs font-medium tabular-nums text-ink backdrop-blur">
                                    {index === 0 ? 'Principale' : index + 1}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1 px-2.5 py-2">
                                <p className="truncate text-xs text-muted" title={image.alt ?? ''}>
                                    {image.alt || <span className="italic">Sans texte alternatif</span>}
                                </p>
                                <div className="-mx-1 flex items-center justify-between">
                                    <div className="flex">
                                        <IconButton
                                            icon={ArrowLeft}
                                            size="sm"
                                            label={`Déplacer l’image ${index + 1} vers la gauche`}
                                            disabled={index === 0}
                                            onClick={() => void reorder(moveItem(images, index, index - 1))}
                                        />
                                        <IconButton
                                            icon={ArrowRight}
                                            size="sm"
                                            label={`Déplacer l’image ${index + 1} vers la droite`}
                                            disabled={index === images.length - 1}
                                            onClick={() => void reorder(moveItem(images, index, index + 1))}
                                        />
                                    </div>
                                    <div className="flex">
                                        <IconButton
                                            icon={Pencil}
                                            size="sm"
                                            label={`Modifier le texte alternatif de l’image ${index + 1}`}
                                            onClick={() => {
                                                setAltDraft(image.alt ?? '');
                                                setAltError(undefined);
                                                setEditing(image);
                                            }}
                                        />
                                        <IconButton icon={Trash2} size="sm" variant="danger" label={`Supprimer l’image ${index + 1}`} onClick={() => setDeleting(image)} />
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <div
                onDragOver={(event) => {
                    if (dragIndex === null && event.dataTransfer.types.includes('Files')) {
                        event.preventDefault();
                        setDropActive(true);
                    }
                }}
                onDragLeave={() => setDropActive(false)}
                onDrop={(event) => {
                    if (dragIndex !== null) {
                        return;
                    }
                    event.preventDefault();
                    setDropActive(false);
                    void upload(Array.from(event.dataTransfer.files));
                }}
                className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors',
                    dropActive ? 'border-accent bg-accent/[0.06]' : 'border-line-strong',
                )}
            >
                <ImagePlus className="size-5 text-muted" aria-hidden />
                <p className="text-sm text-ink">{uploading ? `Envoi en cours… ${uploading.done} / ${uploading.total}` : 'Glissez des photos ici ou'}</p>
                <Button size="sm" loading={uploading !== null} disabled={remaining <= 0} onClick={() => fileRef.current?.click()}>
                    Choisir des fichiers
                </Button>
                <p className="text-xs text-muted">
                    JPG, PNG ou WebP · 400 × 400 px minimum · 8 Mo maximum · {remaining > 0 ? `encore ${remaining} possible${remaining > 1 ? 's' : ''}` : 'limite atteinte'}
                </p>
                <input
                    ref={fileRef}
                    type="file"
                    accept={ACCEPT}
                    multiple
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                    onChange={(event) => {
                        const files = Array.from(event.target.files ?? []);
                        event.target.value = '';
                        void upload(files);
                    }}
                />
            </div>

            <Dialog
                open={editing !== null}
                onClose={() => setEditing(null)}
                busy={altBusy}
                size="sm"
                title="Texte alternatif"
                description="Décrit l’image pour les lecteurs d’écran et les moteurs de recherche."
                footer={
                    <>
                        <Button onClick={() => setEditing(null)} disabled={altBusy}>
                            Annuler
                        </Button>
                        <Button type="submit" form="alt-form" variant="primary" loading={altBusy}>
                            Enregistrer
                        </Button>
                    </>
                }
            >
                <form id="alt-form" onSubmit={(event) => void saveAlt(event)} className="flex flex-col gap-4">
                    {editing?.url && <img src={editing.url} alt="" className="h-40 w-full rounded-lg object-cover" />}
                    <Field label="Texte alternatif" error={altError} counter={{ value: altDraft.length, max: 160 }} hint={`Ex. « Flacon de ${productName} posé sur du lin »`}>
                        {(control) => <TextInput {...control} value={altDraft} maxLength={160} onChange={(event) => setAltDraft(event.target.value)} data-autofocus />}
                    </Field>
                </form>
            </Dialog>

            <ConfirmDialog
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                title="Supprimer cette image ?"
                description="Le fichier est supprimé définitivement."
                confirmLabel="Supprimer"
                onConfirm={async () => {
                    if (!deleting) {
                        return;
                    }
                    await api.products.deleteImage(productId, deleting.id);
                    onChange(images.filter((image) => image.id !== deleting.id));
                    toast.success('Image supprimée.');
                }}
            />
        </div>
    );
}

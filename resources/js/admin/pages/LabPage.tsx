import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ArrowDown, ArrowUp, FlaskConical, ImageOff, Pencil, Plus, Trash2 } from 'lucide-react';
import * as api from '../api';
import { Badge } from '../components/ui/Badge';
import { Button, IconButton } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState, ErrorState, InlineAlert, Skeleton } from '../components/ui/feedback';
import { arabicText, englishText, Field, Switch, TextArea, TextInput } from '../components/ui/form';
import { PageHeader, Panel } from '../components/ui/Panel';
import { ImageField } from '../components/ui/pickers';
import { toast } from '../components/ui/toast';
import { useApiQuery } from '../hooks/useApiQuery';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { moveItem } from '../lib/arrays';
import { errorText, focusFirstInvalid, hasErrors, toFieldErrors, type FieldErrors } from '../lib/errors';
import { useCan } from '../session';
import type { AdminProcessStep, ProcessStepPayload } from '../types';

interface StepForm {
    title: string;
    title_ar: string;
    title_en: string;
    body: string;
    body_ar: string;
    body_en: string;
    detail: string;
    detail_ar: string;
    detail_en: string;
    image_path: string | null;
    image_url: string | null;
    image_credit: string;
    is_visible: boolean;
}

const toForm = (step: AdminProcessStep | null): StepForm => ({
    title: step?.title ?? '',
    title_ar: step?.title_ar ?? '',
    title_en: step?.title_en ?? '',
    body: step?.body ?? '',
    body_ar: step?.body_ar ?? '',
    body_en: step?.body_en ?? '',
    detail: step?.detail ?? '',
    detail_ar: step?.detail_ar ?? '',
    detail_en: step?.detail_en ?? '',
    image_path: step?.image_path ?? null,
    image_url: step?.image_url ?? null,
    image_credit: step?.image_credit ?? '',
    is_visible: step?.is_visible ?? true,
});

const text = (value: string): string | null => (value.trim() === '' ? null : value.trim());

function toPayload(form: StepForm): ProcessStepPayload {
    return {
        title: form.title.trim(),
        title_ar: text(form.title_ar),
        title_en: text(form.title_en),
        body: form.body.trim(),
        body_ar: text(form.body_ar),
        body_en: text(form.body_en),
        detail: text(form.detail),
        detail_ar: text(form.detail_ar),
        detail_en: text(form.detail_en),
        image_path: form.image_path,
        image_credit: text(form.image_credit),
        is_visible: form.is_visible,
    };
}

function StepDialog({ step, open, onClose, onSaved }: { step: AdminProcessStep | null; open: boolean; onClose: () => void; onSaved: (step: AdminProcessStep) => void }) {
    const [form, setForm] = useState<StepForm>(() => toForm(step));
    const [errors, setErrors] = useState<FieldErrors>({});
    const [busy, setBusy] = useState(false);
    const set = <K extends keyof StepForm>(key: K, value: StepForm[K]) => setForm((current) => ({ ...current, [key]: value }));

    useEffect(() => {
        if (open) {
            setForm(toForm(step));
            setErrors({});
        }
    }, [open, step]);

    async function submit(event: FormEvent) {
        event.preventDefault();
        const local: FieldErrors = {};
        if (form.title.trim() === '') {
            local.title = 'Indiquez le nom de l’étape.';
        }
        if (form.body.trim() === '') {
            local.body = 'Racontez cette étape en quelques phrases.';
        }
        if (hasErrors(local)) {
            setErrors(local);
            focusFirstInvalid();

            return;
        }
        setBusy(true);
        try {
            const saved = step ? await api.processSteps.update(step.id, toPayload(form)) : await api.processSteps.create(toPayload(form));
            onSaved(saved);
            toast.success(step ? 'Étape enregistrée.' : 'Étape ajoutée.');
            onClose();
        } catch (error) {
            const fields = toFieldErrors(error);
            setErrors(fields);
            if (!hasErrors(fields)) {
                toast.error(errorText(error));
            }
            focusFirstInvalid();
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            busy={busy}
            size="lg"
            title={step ? `Modifier « ${step.title} »` : 'Nouvelle étape'}
            footer={
                <>
                    <Button onClick={onClose} disabled={busy}>
                        Annuler
                    </Button>
                    <Button type="submit" form="step-form" variant="primary" loading={busy}>
                        {step ? 'Enregistrer' : 'Ajouter l’étape'}
                    </Button>
                </>
            }
        >
            <form id="step-form" onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
                <ImageField
                    folder="lab"
                    label="Photo de l’étape"
                    path={form.image_path}
                    url={form.image_url}
                    error={errors.image_path}
                    // A new photo is the store's own: the previous photo's credit no longer applies.
                    onChange={(image) =>
                        setForm((current) => ({ ...current, image_path: image.path, image_url: image.url, image_credit: image.path === step?.image_path ? (step.image_credit ?? '') : '' }))
                    }
                />
                <p className="-mt-2 text-xs text-muted">Format portrait conseillé (4:5), au moins 1200 × 1500 px : la photo occupe une demi-page.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nom de l’étape" required error={errors.title}>
                        {(control) => <TextInput {...control} value={form.title} maxLength={120} placeholder="Ex. La macération" onChange={(event) => set('title', event.target.value)} data-autofocus />}
                    </Field>
                    <Field label="Nom en arabe" optional error={errors.title_ar}>
                        {(control) => <TextInput {...control} {...arabicText} value={form.title_ar} maxLength={120} placeholder={form.title} onChange={(event) => set('title_ar', event.target.value)} />}
                    </Field>
                    <Field label="En bref" optional error={errors.detail} hint="Affiché en pastille, ex. « 4 à 6 semaines ».">
                        {(control) => <TextInput {...control} value={form.detail} maxLength={80} onChange={(event) => set('detail', event.target.value)} />}
                    </Field>
                    <Field label="En bref, en arabe" optional error={errors.detail_ar}>
                        {(control) => <TextInput {...control} {...arabicText} value={form.detail_ar} maxLength={80} placeholder={form.detail} onChange={(event) => set('detail_ar', event.target.value)} />}
                    </Field>
                </div>
                <Field label="Récit" required error={errors.body} counter={{ value: form.body.length, max: 1000 }}>
                    {(control) => <TextArea {...control} rows={4} maxLength={1000} value={form.body} onChange={(event) => set('body', event.target.value)} />}
                </Field>
                <Field label="Récit en arabe" optional error={errors.body_ar} counter={{ value: form.body_ar.length, max: 1000 }}>
                    {(control) => <TextArea {...control} {...arabicText} rows={4} maxLength={1000} value={form.body_ar} onChange={(event) => set('body_ar', event.target.value)} />}
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nom en anglais" optional error={errors.title_en}>
                        {(control) => <TextInput {...control} {...englishText} value={form.title_en} maxLength={120} placeholder={form.title} onChange={(event) => set('title_en', event.target.value)} />}
                    </Field>
                    <Field label="En bref, en anglais" optional error={errors.detail_en}>
                        {(control) => <TextInput {...control} {...englishText} value={form.detail_en} maxLength={80} placeholder={form.detail} onChange={(event) => set('detail_en', event.target.value)} />}
                    </Field>
                </div>
                <Field label="Récit en anglais" optional error={errors.body_en} counter={{ value: form.body_en.length, max: 1000 }}>
                    {(control) => <TextArea {...control} {...englishText} rows={4} maxLength={1000} value={form.body_en} onChange={(event) => set('body_en', event.target.value)} />}
                </Field>
                <Field label="Crédit photo" optional error={errors.image_credit} hint="Seulement si la photo n’est pas la vôtre (auteur et licence). Laissez vide pour vos propres photos.">
                    {(control) => <TextInput {...control} value={form.image_credit} maxLength={255} onChange={(event) => set('image_credit', event.target.value)} />}
                </Field>
                <Switch checked={form.is_visible} onChange={(value) => set('is_visible', value)} label="Visible sur la boutique" description="Masquée, l’étape reste ici en brouillon." />
            </form>
        </Dialog>
    );
}

/**
 * The making of the perfumes, told on the homepage (section « Le laboratoire »): steps
 * with a photo of the lab each, in order. Stock photos are flagged until replaced.
 */
export default function LabPage() {
    useDocumentTitle('Laboratoire');
    const query = useApiQuery('process-steps', (signal) => api.processSteps.list(signal));
    const canEditTexts = useCan('manage-settings');
    const [editing, setEditing] = useState<AdminProcessStep | null>(null);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState<AdminProcessStep | null>(null);
    const [moving, setMoving] = useState(false);
    const steps = query.data ?? [];
    const stockPhotos = steps.filter((step) => step.is_demo).length;

    const upsert = (step: AdminProcessStep) =>
        query.setData((current) => {
            const list = current ?? [];

            return list.some((item) => item.id === step.id) ? list.map((item) => (item.id === step.id ? step : item)) : [...list, step];
        });

    async function move(from: number, to: number) {
        const reordered = moveItem(steps, from, to);
        query.setData(reordered);
        setMoving(true);
        try {
            query.setData(await api.processSteps.reorder(reordered.map((step) => step.id)));
        } catch (error) {
            toast.error(errorText(error));
            query.reload();
        } finally {
            setMoving(false);
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Laboratoire"
                description="Les étapes de fabrication racontées sur la page d’accueil, chacune avec une photo de votre laboratoire."
                actions={
                    <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
                        Nouvelle étape
                    </Button>
                }
            />

            {stockPhotos > 0 && (
                <InlineAlert tone="warning" title={stockPhotos === 1 ? '1 photo d’exemple' : `${stockPhotos} photos d’exemple`}>
                    Ces photos viennent d’une banque d’images libre de droits (Wikimedia Commons) et ne montrent pas votre laboratoire. Remplacez-les par vos propres photos avant
                    l’ouverture : la section raconte votre savoir-faire.
                </InlineAlert>
            )}

            <Panel
                padded={false}
                title="Étapes"
                description={
                    canEditTexts ? (
                        <>
                            Titre et introduction de la section :{' '}
                            <Link to="/reglages#reglages-homepage" className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                                Réglages, page d’accueil
                            </Link>
                            .
                        </>
                    ) : (
                        'Dans l’ordre où elles sont racontées.'
                    )
                }
            >
                {query.error && !query.data ? (
                    <ErrorState error={query.error} onRetry={query.reload} />
                ) : !query.data ? (
                    <div className="flex flex-col gap-3 p-5">
                        {[0, 1, 2].map((index) => (
                            <Skeleton key={index} className="h-24 w-full" />
                        ))}
                    </div>
                ) : steps.length === 0 ? (
                    <EmptyState
                        icon={FlaskConical}
                        title="Aucune étape"
                        description="Sans étape, la section du laboratoire n’apparaît pas sur la page d’accueil."
                        action={
                            <Button size="sm" variant="primary" icon={Plus} onClick={() => setCreating(true)}>
                                Nouvelle étape
                            </Button>
                        }
                    />
                ) : (
                    <ol className="divide-y divide-line">
                        {steps.map((step, index) => (
                            <li key={step.id} className="flex items-center gap-4 px-4 py-3 sm:px-5">
                                <span className="w-6 shrink-0 text-xs text-muted tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                                <div className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-sunken">
                                    {step.image_url ? <img src={step.image_url} alt="" className="size-full object-cover" /> : <ImageOff className="size-4 text-muted" aria-hidden />}
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col gap-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button type="button" onClick={() => setEditing(step)} className="truncate text-left font-medium text-ink hover:text-accent">
                                            {step.title}
                                        </button>
                                        {step.title_ar && (
                                            <span lang="ar" dir="rtl" className="text-sm text-muted">
                                                {step.title_ar}
                                            </span>
                                        )}
                                        {step.is_demo && <Badge tone="warning">Photo d’exemple</Badge>}
                                        {!step.is_visible && <Badge tone="muted">Masquée</Badge>}
                                    </div>
                                    <p className="line-clamp-2 text-sm text-muted">{step.body}</p>
                                </div>
                                <div className="flex shrink-0 items-center">
                                    <IconButton icon={ArrowUp} size="sm" label={`Monter ${step.title}`} onClick={() => void move(index, index - 1)} disabled={moving || index === 0} />
                                    <IconButton icon={ArrowDown} size="sm" label={`Descendre ${step.title}`} onClick={() => void move(index, index + 1)} disabled={moving || index === steps.length - 1} />
                                    <IconButton icon={Pencil} size="sm" label={`Modifier ${step.title}`} onClick={() => setEditing(step)} />
                                    <IconButton icon={Trash2} size="sm" variant="danger" label={`Supprimer ${step.title}`} onClick={() => setDeleting(step)} />
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
            </Panel>

            <StepDialog
                step={editing}
                open={creating || editing !== null}
                onClose={() => {
                    setCreating(false);
                    setEditing(null);
                }}
                onSaved={upsert}
            />
            <ConfirmDialog
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                title={`Supprimer « ${deleting?.title ?? ''} » ?`}
                description="L’étape et son récit disparaissent de la page d’accueil. Cette action est définitive."
                confirmLabel="Supprimer"
                onConfirm={async () => {
                    if (!deleting) {
                        return;
                    }
                    await api.processSteps.remove(deleting.id);
                    query.setData((current) => current?.filter((item) => item.id !== deleting.id));
                    toast.success('Étape supprimée.');
                }}
            />
        </div>
    );
}

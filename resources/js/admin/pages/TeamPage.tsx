import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, Pencil, Plus, Power, UserCog } from 'lucide-react';
import { cn, formatDateTime } from '@shared/format';
import { ApiError } from '@shared/http';
import * as api from '../api';
import { Badge } from '../components/ui/Badge';
import { Button, IconButton } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState, ErrorState, InlineAlert, TableSkeleton } from '../components/ui/feedback';
import { Field, Fieldset, RadioCards, TextInput } from '../components/ui/form';
import { PageHeader, Panel } from '../components/ui/Panel';
import { DataTable, Td, Th } from '../components/ui/Table';
import { toast } from '../components/ui/toast';
import { useApiQuery } from '../hooks/useApiQuery';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { errorText, focusFirstInvalid, hasErrors, toFieldErrors, type FieldErrors } from '../lib/errors';
import { initials } from '../lib/format';
import { useUser } from '../session';
import type { Option, StaffRole, TeamMember } from '../types';

const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
    admin: 'Accès complet, y compris réglages, livraison et équipe.',
    manager: 'Catalogue, commandes, clients, promotions et contenus.',
    support: 'Tableau de bord, commandes et clients.',
};

const ROLE_TONES: Record<StaffRole, 'accent' | 'ink' | 'neutral'> = { admin: 'accent', manager: 'ink', support: 'neutral' };

function roleOptions(roles: Array<Option<StaffRole>>) {
    return roles.map((role) => ({ value: role.value, label: role.label, description: ROLE_DESCRIPTIONS[role.value] }));
}

function NewMemberDialog({ open, roles, onClose, onCreated }: { open: boolean; roles: Array<Option<StaffRole>>; onClose: () => void; onCreated: (member: TeamMember) => void }) {
    const [form, setForm] = useState({ name: '', email: '', role: 'support' as StaffRole, password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setForm({ name: '', email: '', role: 'support', password: '' });
            setErrors({});
            setShowPassword(false);
        }
    }, [open]);

    async function submit(event: FormEvent) {
        event.preventDefault();
        const local: FieldErrors = {};
        if (form.name.trim() === '') {
            local.name = 'Indiquez le nom.';
        }
        if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
            local.email = 'Adresse e-mail invalide.';
        }
        if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
            local.password = '8 caractères minimum, avec des lettres et des chiffres.';
        }
        if (hasErrors(local)) {
            setErrors(local);
            focusFirstInvalid();

            return;
        }
        setBusy(true);
        try {
            const member = await api.team.create({ name: form.name.trim(), email: form.email.trim(), role: form.role, password: form.password });
            onCreated(member);
            toast.success(`${member.name} a été ajouté·e à l’équipe.`);
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
            title="Ajouter un membre"
            description="Transmettez le mot de passe de façon sûre ; la personne se connecte sur /admin/connexion."
            footer={
                <>
                    <Button onClick={onClose} disabled={busy}>
                        Annuler
                    </Button>
                    <Button type="submit" form="member-form" variant="primary" loading={busy}>
                        Ajouter
                    </Button>
                </>
            }
        >
            <form id="member-form" onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nom" required error={errors.name}>
                        {(control) => <TextInput {...control} value={form.name} maxLength={120} autoComplete="off" onChange={(event) => setForm({ ...form, name: event.target.value })} data-autofocus />}
                    </Field>
                    <Field label="E-mail" required error={errors.email}>
                        {(control) => <TextInput {...control} type="email" value={form.email} maxLength={190} autoComplete="off" onChange={(event) => setForm({ ...form, email: event.target.value })} />}
                    </Field>
                </div>
                <Field label="Mot de passe provisoire" required error={errors.password} hint="8 caractères minimum, avec des lettres et des chiffres.">
                    {(control) => (
                        <div className="relative">
                            <TextInput
                                {...control}
                                type={showPassword ? 'text' : 'password'}
                                value={form.password}
                                autoComplete="new-password"
                                className="pr-11"
                                onChange={(event) => setForm({ ...form, password: event.target.value })}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((value) => !value)}
                                aria-pressed={showPassword}
                                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-ink/[0.06] hover:text-ink"
                            >
                                {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                            </button>
                        </div>
                    )}
                </Field>
                <Fieldset legend="Rôle" error={errors.role}>
                    <RadioCards columns={3} value={form.role} onChange={(role) => setForm({ ...form, role })} options={roleOptions(roles)} />
                </Fieldset>
            </form>
        </Dialog>
    );
}

function EditMemberDialog({ member, roles, isSelf, onClose, onSaved }: { member: TeamMember | null; roles: Array<Option<StaffRole>>; isSelf: boolean; onClose: () => void; onSaved: (member: TeamMember) => void }) {
    const [name, setName] = useState('');
    const [role, setRole] = useState<StaffRole>('support');
    const [errors, setErrors] = useState<FieldErrors>({});
    const [failure, setFailure] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (member) {
            setName(member.name);
            setRole(member.role);
            setErrors({});
            setFailure(null);
        }
    }, [member]);

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (!member) {
            return;
        }
        if (name.trim() === '') {
            setErrors({ name: 'Indiquez le nom.' });

            return;
        }
        setBusy(true);
        setFailure(null);
        try {
            const changes = { ...(name.trim() !== member.name ? { name: name.trim() } : {}), ...(role !== member.role ? { role } : {}) };
            const saved = Object.keys(changes).length > 0 ? await api.team.update(member.id, changes) : member;
            onSaved(saved);
            toast.success('Membre enregistré.');
            onClose();
        } catch (error) {
            const fields = toFieldErrors(error);
            setErrors(fields);
            // Self-demotion and "last administrator" refusals come back on `role`.
            setFailure(fields.role ?? (hasErrors(fields) ? null : errorText(error)));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog
            open={member !== null}
            onClose={onClose}
            busy={busy}
            size="lg"
            title={member ? `Modifier ${member.name}` : ''}
            description={member?.email}
            footer={
                <>
                    <Button onClick={onClose} disabled={busy}>
                        Annuler
                    </Button>
                    <Button type="submit" form="member-edit-form" variant="primary" loading={busy}>
                        Enregistrer
                    </Button>
                </>
            }
        >
            <form id="member-edit-form" onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
                {failure && (
                    <InlineAlert tone="danger" live>
                        {failure}
                    </InlineAlert>
                )}
                {isSelf && !failure && <InlineAlert tone="info">C’est votre compte : seul un autre administrateur peut changer votre rôle.</InlineAlert>}
                <Field label="Nom" required error={errors.name}>
                    {(control) => <TextInput {...control} value={name} maxLength={120} onChange={(event) => setName(event.target.value)} data-autofocus />}
                </Field>
                <Fieldset legend="Rôle">
                    <RadioCards columns={3} value={role} onChange={setRole} options={roleOptions(roles)} />
                </Fieldset>
            </form>
        </Dialog>
    );
}

export default function TeamPage() {
    useDocumentTitle('Équipe');
    const me = useUser();
    const query = useApiQuery('team', (signal) => api.team.list(signal));
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<TeamMember | null>(null);
    const [toggling, setToggling] = useState<TeamMember | null>(null);
    const roles = query.data?.roles ?? [];

    const replace = (member: TeamMember) =>
        query.setData((current) => {
            if (!current) {
                return current;
            }
            const exists = current.data.some((item) => item.id === member.id);
            const data = exists ? current.data.map((item) => (item.id === member.id ? member : item)) : [...current.data, member];

            return { ...current, data: [...data].sort((a, b) => a.name.localeCompare(b.name, 'fr')) };
        });

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Équipe"
                description="Comptes ayant accès à l’administration et leurs rôles."
                actions={
                    <Button variant="primary" icon={Plus} onClick={() => setAdding(true)} disabled={!query.data}>
                        Ajouter un membre
                    </Button>
                }
            />
            <Panel padded={false}>
                {query.error && !query.data ? (
                    <ErrorState error={query.error} onRetry={query.reload} />
                ) : !query.data ? (
                    <TableSkeleton rows={3} columns={4} />
                ) : query.data.data.length === 0 ? (
                    <EmptyState icon={UserCog} title="Aucun membre" />
                ) : (
                    <DataTable caption="Membres de l’équipe">
                        <thead>
                            <tr>
                                <Th>Membre</Th>
                                <Th>Rôle</Th>
                                <Th hideBelow="sm">État</Th>
                                <Th hideBelow="md" align="right">
                                    Dernière connexion
                                </Th>
                                <Th align="right">
                                    <span className="sr-only">Actions</span>
                                </Th>
                            </tr>
                        </thead>
                        <tbody>
                            {query.data.data.map((member) => {
                                const isSelf = member.id === me?.id;

                                return (
                                    <tr key={member.id} className={cn('transition-colors hover:bg-ink/[0.03]', !member.is_active && 'text-muted')}>
                                        <Td>
                                            <div className="flex items-center gap-3">
                                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line-strong bg-sunken text-2xs font-semibold text-ink" aria-hidden>
                                                    {initials(member.name)}
                                                </span>
                                                <div className="min-w-0">
                                                    <span className="flex items-center gap-2 font-medium text-ink">
                                                        <span className="truncate">{member.name}</span>
                                                        {isSelf && <Badge tone="muted">Vous</Badge>}
                                                    </span>
                                                    <span className="block max-w-64 truncate text-xs text-muted">{member.email}</span>
                                                </div>
                                            </div>
                                        </Td>
                                        <Td>
                                            <Badge tone={ROLE_TONES[member.role]}>{member.role_label}</Badge>
                                        </Td>
                                        <Td hideBelow="sm">{member.is_active ? <Badge tone="success" dot>Actif</Badge> : <Badge tone="muted" dot>Désactivé</Badge>}</Td>
                                        <Td hideBelow="md" align="right" className="whitespace-nowrap text-xs tabular-nums text-muted">
                                            {member.last_login_at ? formatDateTime(member.last_login_at) : 'Jamais'}
                                        </Td>
                                        <Td align="right" className="whitespace-nowrap">
                                            <IconButton icon={Pencil} size="sm" label={`Modifier ${member.name}`} onClick={() => setEditing(member)} />
                                            <IconButton
                                                icon={Power}
                                                size="sm"
                                                variant={member.is_active ? 'danger' : 'ghost'}
                                                label={member.is_active ? `Désactiver ${member.name}` : `Réactiver ${member.name}`}
                                                onClick={() => setToggling(member)}
                                            />
                                        </Td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </DataTable>
                )}
            </Panel>

            <NewMemberDialog open={adding} roles={roles} onClose={() => setAdding(false)} onCreated={replace} />
            <EditMemberDialog member={editing} roles={roles} isSelf={editing?.id === me?.id} onClose={() => setEditing(null)} onSaved={replace} />
            <ConfirmDialog
                open={toggling !== null}
                onClose={() => setToggling(null)}
                tone={toggling?.is_active ? 'danger' : 'primary'}
                title={toggling?.is_active ? `Désactiver ${toggling.name} ?` : `Réactiver ${toggling?.name ?? ''} ?`}
                description={
                    toggling?.is_active
                        ? 'La personne ne pourra plus se connecter à l’administration. Son historique est conservé.'
                        : 'La personne pourra de nouveau se connecter avec son mot de passe actuel.'
                }
                confirmLabel={toggling?.is_active ? 'Désactiver' : 'Réactiver'}
                onConfirm={async () => {
                    if (!toggling) {
                        return;
                    }
                    try {
                        const saved = await api.team.update(toggling.id, { is_active: !toggling.is_active });
                        replace(saved);
                        toast.success(saved.is_active ? `${saved.name} est réactivé·e.` : `${saved.name} est désactivé·e.`);
                    } catch (error) {
                        // Surface the API's own wording (self-deactivation, last administrator).
                        throw new ApiError(422, toFieldErrors(error).role ?? errorText(error));
                    }
                }}
            />
        </div>
    );
}

import { useState, type ReactNode } from 'react';
import { errorText } from '../../lib/errors';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { InlineAlert } from './feedback';

interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    /** May throw: the dialog stays open and shows the API message. */
    onConfirm: () => Promise<unknown> | void;
    title: ReactNode;
    description?: ReactNode;
    children?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'danger' | 'primary';
}

/** Confirmation for destructive or irreversible actions. */
export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    description,
    children,
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler',
    tone = 'danger',
}: ConfirmDialogProps) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const close = () => {
        setError(null);
        onClose();
    };

    async function confirm() {
        setBusy(true);
        setError(null);
        try {
            await onConfirm();
            setBusy(false);
            onClose();
        } catch (failure) {
            setBusy(false);
            setError(errorText(failure));
        }
    }

    return (
        <Dialog
            open={open}
            onClose={close}
            busy={busy}
            role="alertdialog"
            size="sm"
            title={title}
            description={description}
            footer={
                <>
                    <Button onClick={close} disabled={busy} data-autofocus>
                        {cancelLabel}
                    </Button>
                    <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} onClick={() => void confirm()}>
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            {(children || error) && (
                <div className="flex flex-col gap-3 text-sm text-muted">
                    {children}
                    {error && (
                        <InlineAlert tone="danger" live>
                            {error}
                        </InlineAlert>
                    )}
                </div>
            )}
        </Dialog>
    );
}

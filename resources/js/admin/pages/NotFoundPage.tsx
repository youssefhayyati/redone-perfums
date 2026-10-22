import { Compass } from 'lucide-react';
import { ButtonLink } from '../components/ui/Button';
import { EmptyState } from '../components/ui/feedback';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFoundPage() {
    useDocumentTitle('Page introuvable');

    return (
        <EmptyState
            className="py-28"
            as="h1"
            icon={Compass}
            title="Page introuvable"
            description="L’adresse demandée ne correspond à aucun écran de l’administration."
            action={
                <ButtonLink to="/" variant="primary" size="sm">
                    Retour au tableau de bord
                </ButtonLink>
            }
        />
    );
}

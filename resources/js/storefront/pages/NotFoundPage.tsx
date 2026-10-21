import { ButtonLink } from '../components/ui/Button';
import { useHead } from '../hooks/useHead';

export default function NotFoundPage() {
    useHead({ title: 'Page introuvable', noindex: true });

    return (
        <section className="container-page flex min-h-[70vh] flex-col items-center justify-center gap-7 py-24 text-center">
            <p className="eyebrow">Erreur 404</p>
            <h1 className="font-display text-display-lg text-balance">
                Ce parfum s’est <em className="text-accent">évaporé</em>.
            </h1>
            <p className="max-w-md text-muted">La page demandée n’existe pas ou plus. Le lien est peut-être ancien, ou le parfum n’est plus proposé.</p>
            <div className="flex flex-wrap justify-center gap-3">
                <ButtonLink to="/boutique">Voir la boutique</ButtonLink>
                <ButtonLink to="/" variant="secondary">
                    Retour à l’accueil
                </ButtonLink>
            </div>
        </section>
    );
}

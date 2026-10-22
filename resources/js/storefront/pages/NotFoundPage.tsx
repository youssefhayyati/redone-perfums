import { ButtonLink } from '../components/ui/Button';
import { useHead } from '../hooks/useHead';
import { t, tNodes } from '../i18n';

export default function NotFoundPage() {
    useHead({ title: t('Page introuvable'), noindex: true });

    return (
        <section className="container-page flex min-h-[70vh] flex-col items-center justify-center gap-7 py-24 text-center">
            <p className="eyebrow">{t('Erreur 404')}</p>
            <h1 className="font-display text-display-lg text-balance">
                {tNodes('Ce parfum s’est {word}.', { word: <em className="text-accent">{t('évaporé')}</em> })}
            </h1>
            <p className="max-w-md text-muted">{t('La page demandée n’existe pas ou plus. Le lien est peut-être ancien, ou le parfum n’est plus proposé.')}</p>
            <div className="flex flex-wrap justify-center gap-3">
                <ButtonLink to="/boutique">{t('Voir la boutique')}</ButtonLink>
                <ButtonLink to="/" variant="secondary">
                    {t('Retour à l’accueil')}
                </ButtonLink>
            </div>
        </section>
    );
}

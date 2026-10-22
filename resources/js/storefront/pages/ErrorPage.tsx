import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { ButtonLabel, buttonClasses } from '../components/ui/Button';
import { t } from '../i18n';

/** Last-resort boundary: a render error or a failed lazy chunk (e.g. after a deploy). */
export function ErrorPage() {
    const error = useRouteError();
    const notFound = isRouteErrorResponse(error) && error.status === 404;

    return (
        <main className="container-page flex min-h-dvh flex-col items-center justify-center gap-6 text-center">
            <p className="eyebrow">{notFound ? t('Erreur 404') : t('Un contretemps')}</p>
            <h1 className="font-display text-display-md">{notFound ? t('Cette page s’est évaporée.') : t('La page n’a pas pu s’afficher.')}</h1>
            <p className="max-w-md text-muted">
                {notFound ? t('Le lien est peut-être ancien.') : t('Rechargez la page : si une nouvelle version du site vient d’être publiée, cela suffit le plus souvent.')}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
                <button type="button" className={buttonClasses('primary')} onClick={() => window.location.reload()}>
                    <ButtonLabel>{t('Recharger')}</ButtonLabel>
                </button>
                <Link to="/" className={buttonClasses('secondary')} reloadDocument>
                    <ButtonLabel>{t('Accueil')}</ButtonLabel>
                </Link>
            </div>
        </main>
    );
}

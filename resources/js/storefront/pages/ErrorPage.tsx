import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { ButtonLabel, buttonClasses } from '../components/ui/Button';

/** Last-resort boundary: a render error or a failed lazy chunk (e.g. after a deploy). */
export function ErrorPage() {
    const error = useRouteError();
    const notFound = isRouteErrorResponse(error) && error.status === 404;

    return (
        <main className="container-page flex min-h-dvh flex-col items-center justify-center gap-6 text-center">
            <p className="eyebrow">{notFound ? 'Erreur 404' : 'Un contretemps'}</p>
            <h1 className="font-display text-display-md">{notFound ? 'Cette page s’est évaporée.' : 'La page n’a pas pu s’afficher.'}</h1>
            <p className="max-w-md text-muted">
                {notFound ? 'Le lien est peut-être ancien.' : 'Rechargez la page : si une nouvelle version du site vient d’être publiée, cela suffit le plus souvent.'}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
                <button type="button" className={buttonClasses('primary')} onClick={() => window.location.reload()}>
                    <ButtonLabel>Recharger</ButtonLabel>
                </button>
                <Link to="/" className={buttonClasses('secondary')} reloadDocument>
                    <ButtonLabel>Accueil</ButtonLabel>
                </Link>
            </div>
        </main>
    );
}

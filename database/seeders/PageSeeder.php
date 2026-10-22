<?php

namespace Database\Seeders;

use App\Models\Page;
use Illuminate\Database\Seeder;

/**
 * Content pages. Only the presentation page is published: the legal pages are drafts
 * whose bracketed passages must be written by the store before publication (the
 * dashboard setup checklist tracks them). Bodies use the light markup rendered by the
 * storefront: "## heading", "- item", blank line between paragraphs.
 */
class PageSeeder extends Seeder
{
    public function run(): void
    {
        $pages = [
            [
                'slug' => 'la-maison',
                'title' => 'La maison',
                'meta_description' => 'Une maison de parfum imaginée au Maroc : compositions, coffrets et conseil.',
                'is_published' => true,
                'body' => <<<'TEXT'
                    Myperfum compose des parfums de caractère, nourris des matières et des paysages du Maroc : les résines des souks, la fleur d’oranger des médinas, le cèdre de l’Atlas.

                    ## Une boutique de démonstration
                    Le catalogue présenté ici est fictif. Remplacez ce texte depuis l’administration (Contenu › Pages) pour raconter l’histoire de votre maison, vos matières et vos ateliers.

                    ## Notre façon de faire
                    - Chaque parfum est présenté avec sa pyramide olfactive complète.
                    - Les frais de livraison s’affichent selon votre ville avant la validation de la commande.
                    - Vous réglez votre commande à la livraison.
                    TEXT,
            ],
            [
                'slug' => 'livraison',
                'title' => 'Livraison',
                'meta_description' => 'Zones, frais et délais de livraison au Maroc.',
                'body' => <<<'TEXT'
                    ## Zones et délais
                    Nous livrons dans les villes proposées lors de la commande. Les frais et le délai indicatif s’affichent dès que vous choisissez votre ville.

                    ## Frais de livraison
                    [À compléter : vos tarifs par zone et le seuil à partir duquel la livraison est offerte.]

                    ## Suivi de commande
                    [À compléter : transporteur, suivi du colis, contact en cas de retard.]
                    TEXT,
            ],
            [
                'slug' => 'retours',
                'title' => 'Retours et échanges',
                'meta_description' => 'Conditions de retour et d’échange.',
                'body' => <<<'TEXT'
                    ## Délai de retour
                    [À compléter : délai accordé pour retourner un article et conditions (flacon non ouvert, emballage d’origine…).]

                    ## Procédure
                    [À compléter : comment nous contacter, adresse de retour, prise en charge des frais de retour.]

                    ## Remboursement
                    [À compléter : délai et mode de remboursement.]
                    TEXT,
            ],
            [
                'slug' => 'conditions-generales-de-vente',
                'title' => 'Conditions générales de vente',
                'meta_description' => 'Conditions générales de vente de la boutique.',
                'body' => <<<'TEXT'
                    [À compléter avec votre conseil juridique avant publication.]

                    ## Objet
                    [Identité du vendeur, coordonnées, registre de commerce, identifiant fiscal.]

                    ## Prix
                    [Devise, taxes, frais de livraison affichés avant validation.]

                    ## Commande et paiement
                    [Étapes de la commande, paiement à la livraison, confirmation.]

                    ## Livraison
                    [Zones desservies, délais, réception du colis.]

                    ## Retours
                    [Conditions de retour et de remboursement.]

                    ## Litiges
                    [Droit applicable et règlement des différends.]
                    TEXT,
            ],
            [
                'slug' => 'confidentialite',
                'title' => 'Politique de confidentialité',
                'meta_description' => 'Comment nous traitons vos données personnelles.',
                'body' => <<<'TEXT'
                    [À compléter avant publication, notamment au regard de la loi n° 09-08 relative à la protection des personnes physiques à l’égard du traitement des données à caractère personnel.]

                    ## Données collectées
                    Nom, téléphone, adresse de livraison et, si vous le souhaitez, adresse e-mail : elles servent à préparer, livrer et suivre vos commandes.

                    ## Lettre d’information
                    Votre adresse n’est utilisée pour la lettre de la maison qu’avec votre accord. Chaque envoi permet de se désinscrire.

                    ## Vos droits
                    [Modalités d’accès, de rectification et d’opposition ; coordonnées du responsable du traitement.]
                    TEXT,
            ],
        ];

        foreach ($pages as $position => $page) {
            Page::updateOrCreate(
                ['slug' => $page['slug']],
                [...$page, 'is_published' => $page['is_published'] ?? false, 'sort_order' => $position],
            );
        }
    }
}

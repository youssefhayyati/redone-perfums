<?php

namespace App\Services\Settings;

use App\Models\City;
use App\Models\Collection;
use App\Models\Pack;
use App\Models\Page;

/**
 * Store configuration the storefront needs on every page. Inlined in the HTML shell
 * (no extra request before first paint) and also served by /api/storefront.
 */
final class StorefrontConfig
{
    public function __construct(private readonly StoreSettings $settings) {}

    /**
     * @return array<string, mixed>
     */
    public function build(): array
    {
        $s = $this->settings->nested();

        return [
            'store' => $s['store'],
            'announcement' => $s['announcement'],
            'contact' => $s['contact'],
            'social' => array_filter($s['social']),
            'payment_methods' => $this->settings->bool('payment.cod_enabled')
                ? [['code' => 'cod', 'label' => 'Paiement à la livraison', 'description' => 'Réglez en espèces à la réception de votre commande.']]
                : [],
            'checkout' => ['email_required' => $this->settings->bool('checkout.email_required')],
            'benefits' => $this->benefits(),
            'pages' => Page::query()->where('is_published', true)->orderBy('sort_order')->get(['slug', 'title']),
            'collections' => Collection::query()->where('is_visible', true)->orderBy('sort_order')->get(['name', 'slug']),
            'has_packs' => Pack::query()->where('is_active', true)->exists(),
        ];
    }

    /**
     * Reassurance items derived from real configuration only.
     *
     * @return list<array{icon: string, title: string, text: string}>
     */
    private function benefits(): array
    {
        $benefits = [];

        $cities = City::query()->deliverable()->count();
        if ($cities > 0) {
            $benefits[] = [
                'icon' => 'truck',
                'title' => 'Livraison au Maroc',
                'text' => "Livraison dans {$cities} ".($cities > 1 ? 'villes' : 'ville').', frais calculés selon votre ville avant validation.',
            ];
        }

        if ($this->settings->bool('payment.cod_enabled')) {
            $benefits[] = [
                'icon' => 'banknote',
                'title' => 'Paiement à la livraison',
                'text' => 'Vous réglez en espèces à la réception de votre commande.',
            ];
        }

        if (Pack::query()->where('is_active', true)->exists()) {
            $benefits[] = [
                'icon' => 'layers',
                'title' => 'Coffrets à composer',
                'text' => 'Réunissez vos parfums préférés dans un coffret au prix avantageux.',
            ];
        }

        if ($this->settings->bool('benefits.gift_packaging')) {
            $benefits[] = [
                'icon' => 'gift',
                'title' => 'Écrin cadeau',
                'text' => $this->settings->get('benefits.gift_packaging_text') ?: 'Un emballage cadeau est proposé pour vos commandes.',
            ];
        }

        $contact = array_filter([
            $this->settings->get('contact.whatsapp'),
            $this->settings->get('contact.phone'),
            $this->settings->get('contact.email'),
        ]);
        if ($contact !== []) {
            $hours = $this->settings->get('contact.hours');
            $benefits[] = [
                'icon' => 'message-circle',
                'title' => 'Conseil personnalisé',
                'text' => 'Une question sur un parfum ? Écrivez-nous'.($hours ? ' — '.$hours : '').'.',
            ];
        }

        return $benefits;
    }
}

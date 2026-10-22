<?php

namespace App\Services\Settings;

use App\Models\City;
use App\Models\Collection;
use App\Models\Pack;
use App\Models\Page;
use App\Support\GeoPoint;

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
        $s = $this->settings;

        return [
            'store' => [
                'name' => $s->get('store.name'),
                'wordmark' => $s->get('store.wordmark'),
                'descriptor' => $s->localized('store.descriptor'),
                'meta_description' => $s->localized('store.meta_description'),
            ],
            'announcement' => [
                'enabled' => $s->bool('announcement.enabled'),
                'text' => $s->localized('announcement.text'),
                'link' => $s->get('announcement.link'),
            ],
            'contact' => [
                'email' => $s->get('contact.email'),
                'phone' => $s->get('contact.phone'),
                'whatsapp' => $s->get('contact.whatsapp'),
                'address' => $s->localized('contact.address'),
                'hours' => $s->localized('contact.hours'),
            ],
            'location' => $this->location(),
            'analytics' => array_filter([
                'ga4' => $s->get('analytics.ga4_id'),
                'meta_pixel' => $s->get('analytics.meta_pixel_id'),
            ]),
            'social' => array_filter($s->nested()['social']),
            'payment_methods' => $s->bool('payment.cod_enabled')
                ? [['code' => 'cod', 'label' => __('Paiement à la livraison'), 'description' => __('Réglez en espèces à la réception de votre commande.')]]
                : [],
            'checkout' => ['email_required' => $this->settings->bool('checkout.email_required')],
            'benefits' => $this->benefits(),
            'pages' => Page::query()->where('is_published', true)->orderBy('sort_order')->get(Page::withTranslations(['slug', 'title']))
                ->map(fn (Page $page) => ['slug' => $page->slug, 'title' => $page->translated('title')]),
            'collections' => Collection::query()->where('is_visible', true)->orderBy('sort_order')->get(Collection::withTranslations(['name', 'slug']))
                ->map(fn (Collection $collection) => ['name' => $collection->translated('name'), 'slug' => $collection->slug]),
            'has_packs' => Pack::query()->where('is_active', true)->exists(),
        ];
    }

    /**
     * The shop on a map, or null while its coordinates are not filled.
     *
     * @return array{lat: float, lng: float, zoom: int, title: string|null, hours: string|null}|null
     */
    private function location(): ?array
    {
        $point = GeoPoint::parse($this->settings->get('location.coordinates'));

        if ($point === null) {
            return null;
        }

        return [
            ...$point,
            'zoom' => max(3, min(21, (int) $this->settings->get('location.zoom', 16))),
            'title' => $this->settings->localized('location.title'),
            'hours' => $this->settings->localized('location.hours'),
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
                'title' => __('Livraison au Maroc'),
                'text' => trans_choice('Livraison dans :count ville, frais calculés selon votre ville avant validation.|Livraison dans :count villes, frais calculés selon votre ville avant validation.', $cities, ['count' => $cities]),
            ];
        }

        if ($this->settings->bool('payment.cod_enabled')) {
            $benefits[] = [
                'icon' => 'banknote',
                'title' => __('Paiement à la livraison'),
                'text' => __('Vous réglez en espèces à la réception de votre commande.'),
            ];
        }

        if (Pack::query()->where('is_active', true)->exists()) {
            $benefits[] = [
                'icon' => 'layers',
                'title' => __('Coffrets à composer'),
                'text' => __('Réunissez vos parfums préférés dans un coffret au prix avantageux.'),
            ];
        }

        if ($this->settings->bool('benefits.gift_packaging')) {
            $benefits[] = [
                'icon' => 'gift',
                'title' => __('Écrin cadeau'),
                'text' => $this->settings->localized('benefits.gift_packaging_text') ?: __('Un emballage cadeau est proposé pour vos commandes.'),
            ];
        }

        $contact = array_filter([
            $this->settings->get('contact.whatsapp'),
            $this->settings->get('contact.phone'),
            $this->settings->get('contact.email'),
        ]);
        if ($contact !== []) {
            $hours = $this->settings->localized('contact.hours');
            $benefits[] = [
                'icon' => 'message-circle',
                'title' => __('Conseil personnalisé'),
                'text' => $hours ? __('Une question sur un parfum ? Écrivez-nous — :hours.', ['hours' => $hours]) : __('Une question sur un parfum ? Écrivez-nous.'),
            ];
        }

        return $benefits;
    }
}

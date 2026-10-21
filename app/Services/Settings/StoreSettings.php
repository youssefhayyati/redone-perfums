<?php

namespace App\Services\Settings;

use App\Models\StoreSetting;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;

/**
 * Admin-editable store configuration with typed defaults.
 *
 * Every value here is safe to publish to the storefront: secrets never live in
 * store settings, they belong in the environment.
 */
final class StoreSettings
{
    private const CACHE_KEY = 'store-settings.v1';

    /** @var array<string, mixed>|null */
    private ?array $resolved = null;

    /**
     * @return array<string, array{type: string, default: mixed, group: string, label: string}>
     */
    public static function schema(): array
    {
        $s = fn (string $group, string $type, mixed $default, string $label) => compact('group', 'type', 'default', 'label');

        return [
            'store.name' => $s('general', 'string', 'Redone Parfums', 'Nom de la boutique'),
            'store.wordmark' => $s('general', 'string', 'REDONE', 'Logotype (texte)'),
            'store.descriptor' => $s('general', 'string', 'Maison de parfum', 'Sous-titre du logotype'),
            'store.meta_description' => $s('general', 'text', 'Parfums de niche et coffrets composés à la main. Livraison au Maroc selon votre ville.', 'Description SEO par défaut'),

            'announcement.enabled' => $s('announcement', 'boolean', true, 'Afficher la barre d’annonce'),
            'announcement.text' => $s('announcement', 'string', 'Catalogue de démonstration — les produits affichés sont fictifs.', 'Texte de l’annonce'),
            'announcement.link' => $s('announcement', 'string', null, 'Lien (optionnel, chemin interne ex. /packs)'),

            'contact.email' => $s('contact', 'string', null, 'E-mail de contact'),
            'contact.phone' => $s('contact', 'string', null, 'Téléphone'),
            'contact.whatsapp' => $s('contact', 'string', null, 'WhatsApp (numéro international)'),
            'contact.address' => $s('contact', 'text', null, 'Adresse'),
            'contact.hours' => $s('contact', 'string', null, 'Horaires du service client'),

            'social.instagram' => $s('social', 'url', null, 'Instagram'),
            'social.tiktok' => $s('social', 'url', null, 'TikTok'),
            'social.facebook' => $s('social', 'url', null, 'Facebook'),

            'payment.cod_enabled' => $s('payment', 'boolean', true, 'Paiement à la livraison'),
            'checkout.email_required' => $s('payment', 'boolean', false, 'E-mail obligatoire à la commande'),

            'benefits.gift_packaging' => $s('benefits', 'boolean', false, 'Emballage cadeau proposé'),
            'benefits.gift_packaging_text' => $s('benefits', 'string', null, 'Précision sur l’emballage cadeau'),

            'home.hero_eyebrow' => $s('homepage', 'string', 'Maison de parfum · Collection nocturne', 'Hero — surtitre'),
            'home.hero_title' => $s('homepage', 'string', 'L’heure où le parfum se révèle.', 'Hero — titre'),
            'home.hero_subtitle' => $s('homepage', 'text', 'Des compositions d’ombre et d’ambre, pensées pour la peau et la nuit. Choisissez votre signature, ou composez votre propre collection.', 'Hero — texte'),
            'home.story_product_id' => $s('homepage', 'integer', null, 'Récit — parfum mis en avant'),
            'home.story_eyebrow' => $s('homepage', 'string', 'Le récit', 'Récit — surtitre'),
            'home.story_title' => $s('homepage', 'string', null, 'Récit — titre (par défaut : nom du parfum)'),
            'home.story_body' => $s('homepage', 'text', null, 'Récit — texte (par défaut : inspiration du parfum)'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function all(): array
    {
        if ($this->resolved !== null) {
            return $this->resolved;
        }

        $stored = Cache::rememberForever(self::CACHE_KEY, fn () => StoreSetting::query()->pluck('value', 'key')->all());

        $values = [];
        foreach (self::schema() as $key => $definition) {
            $values[$key] = array_key_exists($key, $stored) ? $stored[$key] : $definition['default'];
        }

        return $this->resolved = $values;
    }

    public function get(string $key, mixed $fallback = null): mixed
    {
        return $this->all()[$key] ?? $fallback;
    }

    public function bool(string $key): bool
    {
        return (bool) $this->get($key, false);
    }

    /**
     * @param  array<string, mixed>  $values
     */
    public function put(array $values): void
    {
        $schema = self::schema();

        foreach ($values as $key => $value) {
            if (! isset($schema[$key])) {
                continue;
            }

            StoreSetting::updateOrCreate(['key' => $key], ['value' => $this->cast($schema[$key]['type'], $value)]);
        }

        $this->flush();
    }

    public function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
        $this->resolved = null;
    }

    /**
     * Nested representation for the storefront: ['store' => ['name' => …], …].
     *
     * @return array<string, mixed>
     */
    public function nested(): array
    {
        $nested = [];
        foreach ($this->all() as $key => $value) {
            Arr::set($nested, $key, $value);
        }

        return $nested;
    }

    private function cast(string $type, mixed $value): mixed
    {
        if ($value === '' || $value === null) {
            return $type === 'boolean' ? false : null;
        }

        return match ($type) {
            'boolean' => (bool) $value,
            'integer' => (int) $value,
            default => trim((string) $value),
        };
    }
}

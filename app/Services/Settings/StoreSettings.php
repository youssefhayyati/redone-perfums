<?php

namespace App\Services\Settings;

use App\Models\StoreSetting;
use App\Support\Locale;
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
            'store.name' => $s('general', 'string', 'Myperfum', 'Nom de la boutique'),
            'store.wordmark' => $s('general', 'string', 'myperfum', 'Logotype (texte)'),
            'store.descriptor' => $s('general', 'string', 'Maison de parfum', 'Sous-titre du logotype'),
            'store.descriptor_ar' => $s('general', 'string', 'دار عطور', 'Sous-titre du logotype (arabe)'),
            'store.descriptor_en' => $s('general', 'string', 'Perfume house', 'Sous-titre du logotype (anglais)'),
            'store.meta_description' => $s('general', 'text', 'Parfums de niche et coffrets composés à la main. Livraison au Maroc selon votre ville.', 'Description SEO par défaut'),
            'store.meta_description_ar' => $s('general', 'text', 'عطور فاخرة وعلب هدايا تُركَّب بعناية. توصيل داخل المغرب حسب مدينتك.', 'Description SEO par défaut (arabe)'),
            'store.meta_description_en' => $s('general', 'text', 'Niche perfumes and hand-assembled gift sets. Delivery across Morocco, priced by city.', 'Description SEO par défaut (anglais)'),

            'announcement.enabled' => $s('announcement', 'boolean', true, 'Afficher la barre d’annonce'),
            'announcement.text' => $s('announcement', 'string', 'Catalogue de démonstration — les produits affichés sont fictifs.', 'Texte de l’annonce'),
            'announcement.text_ar' => $s('announcement', 'string', 'متجر تجريبي — المنتجات المعروضة خيالية.', 'Texte de l’annonce (arabe)'),
            'announcement.text_en' => $s('announcement', 'string', 'Demo catalogue — the products shown are fictional.', 'Texte de l’annonce (anglais)'),
            'announcement.link' => $s('announcement', 'string', null, 'Lien (optionnel, chemin interne ex. /coffrets)'),

            'contact.email' => $s('contact', 'string', null, 'E-mail de contact'),
            'contact.phone' => $s('contact', 'string', null, 'Téléphone'),
            'contact.whatsapp' => $s('contact', 'string', null, 'WhatsApp (numéro international)'),
            'contact.address' => $s('contact', 'text', null, 'Adresse'),
            'contact.address_ar' => $s('contact', 'text', null, 'Adresse (arabe)'),
            'contact.address_en' => $s('contact', 'text', null, 'Adresse (anglais)'),
            'contact.hours' => $s('contact', 'string', null, 'Horaires du service client'),
            'contact.hours_ar' => $s('contact', 'string', null, 'Horaires du service client (arabe)'),
            'contact.hours_en' => $s('contact', 'string', null, 'Horaires du service client (anglais)'),

            // Shown as a map on the homepage once the coordinates are filled; the address comes from contact.address.
            'location.coordinates' => $s('location', 'string', null, 'Coordonnées GPS de la boutique (latitude, longitude)'),
            'location.zoom' => $s('location', 'integer', 16, 'Zoom de la carte (de 3 à 21)'),
            'location.title' => $s('location', 'string', 'Venez sentir nos parfums', 'Titre de la section'),
            'location.title_ar' => $s('location', 'string', 'تعالوا لاكتشاف عطورنا', 'Titre de la section (arabe)'),
            'location.title_en' => $s('location', 'string', 'Come and smell our perfumes', 'Titre de la section (anglais)'),
            'location.hours' => $s('location', 'string', null, 'Horaires d’ouverture de la boutique'),
            'location.hours_ar' => $s('location', 'string', null, 'Horaires d’ouverture de la boutique (arabe)'),
            'location.hours_en' => $s('location', 'string', null, 'Horaires d’ouverture de la boutique (anglais)'),

            // Internal: never part of StorefrontConfig, which publishes the whole contact group.
            'notifications.orders_email' => $s('notifications', 'string', null, 'E-mail qui reçoit les nouvelles commandes (par défaut : e-mail de contact)'),

            // Public identifiers, loaded on the storefront only after the visitor accepts cookies.
            'analytics.ga4_id' => $s('analytics', 'string', null, 'Google Analytics 4 — identifiant de mesure (G-…)'),
            'analytics.meta_pixel_id' => $s('analytics', 'string', null, 'Meta Pixel (Instagram, Facebook) — identifiant'),

            'social.instagram' => $s('social', 'url', null, 'Instagram'),
            'social.tiktok' => $s('social', 'url', null, 'TikTok'),
            'social.facebook' => $s('social', 'url', null, 'Facebook'),

            'payment.cod_enabled' => $s('payment', 'boolean', true, 'Paiement à la livraison'),
            'checkout.email_required' => $s('payment', 'boolean', false, 'E-mail obligatoire à la commande'),

            'benefits.gift_packaging' => $s('benefits', 'boolean', false, 'Emballage cadeau proposé'),
            'benefits.gift_packaging_text' => $s('benefits', 'string', null, 'Précision sur l’emballage cadeau'),
            'benefits.gift_packaging_text_ar' => $s('benefits', 'string', null, 'Précision sur l’emballage cadeau (arabe)'),
            'benefits.gift_packaging_text_en' => $s('benefits', 'string', null, 'Précision sur l’emballage cadeau (anglais)'),

            'home.hero_eyebrow' => $s('homepage', 'string', 'Maison de parfum · Collection nocturne', 'Hero — surtitre'),
            'home.hero_eyebrow_ar' => $s('homepage', 'string', 'دار عطور · مجموعة الليل', 'Hero — surtitre (arabe)'),
            'home.hero_eyebrow_en' => $s('homepage', 'string', 'Perfume house · Night collection', 'Hero — surtitre (anglais)'),
            'home.hero_title' => $s('homepage', 'string', 'L’heure où le parfum se révèle.', 'Hero — titre'),
            'home.hero_title_ar' => $s('homepage', 'string', 'الساعة التي يتجلّى فيها العطر.', 'Hero — titre (arabe)'),
            'home.hero_title_en' => $s('homepage', 'string', 'The hour when perfume reveals itself.', 'Hero — titre (anglais)'),
            'home.hero_subtitle' => $s('homepage', 'text', 'Des compositions d’ombre et d’ambre, pensées pour la peau et la nuit. Choisissez votre signature, ou composez votre propre collection.', 'Hero — texte'),
            'home.hero_subtitle_ar' => $s('homepage', 'text', 'تركيبات من الظلّ والعنبر، صُمّمت للبشرة ولليل. اختر عطرك المميّز، أو ركّب مجموعتك الخاصة.', 'Hero — texte (arabe)'),
            'home.hero_subtitle_en' => $s('homepage', 'text', 'Compositions of shadow and amber, made for the skin and the night. Choose your signature, or compose your own collection.', 'Hero — texte (anglais)'),
            'lab.title' => $s('homepage', 'string', 'De la fleur au flacon', 'Laboratoire — titre'),
            'lab.title_ar' => $s('homepage', 'string', 'من الزهرة إلى القارورة', 'Laboratoire — titre (arabe)'),
            'lab.title_en' => $s('homepage', 'string', 'From flower to bottle', 'Laboratoire — titre (anglais)'),
            'lab.intro' => $s('homepage', 'text', 'Chaque parfum naît d’un long travail de patience : choisir la matière, en extraire l’âme, composer, éprouver, puis laisser le temps faire son œuvre.', 'Laboratoire — texte'),
            'lab.intro_ar' => $s('homepage', 'text', 'يولد كل عطر من عمل طويل يتطلّب الصبر: اختيار المادة، واستخلاص روحها، والتأليف، والتجربة، ثم ترك الوقت يقوم بعمله.', 'Laboratoire — texte (arabe)'),
            'lab.intro_en' => $s('homepage', 'text', 'Every perfume is born of long, patient work: choosing the material, drawing out its soul, composing, testing, then letting time do its work.', 'Laboratoire — texte (anglais)'),
            'home.story_product_id' => $s('homepage', 'integer', null, 'Récit — parfum mis en avant'),
            'home.story_eyebrow' => $s('homepage', 'string', 'Le récit', 'Récit — surtitre'),
            'home.story_eyebrow_ar' => $s('homepage', 'string', 'الحكاية', 'Récit — surtitre (arabe)'),
            'home.story_eyebrow_en' => $s('homepage', 'string', 'The story', 'Récit — surtitre (anglais)'),
            'home.story_title' => $s('homepage', 'string', null, 'Récit — titre (par défaut : nom du parfum)'),
            'home.story_title_ar' => $s('homepage', 'string', null, 'Récit — titre (arabe)'),
            'home.story_title_en' => $s('homepage', 'string', null, 'Récit — titre (anglais)'),
            'home.story_body' => $s('homepage', 'text', null, 'Récit — texte (par défaut : inspiration du parfum)'),
            'home.story_body_ar' => $s('homepage', 'text', null, 'Récit — texte (arabe)'),
            'home.story_body_en' => $s('homepage', 'text', null, 'Récit — texte (anglais)'),
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

    /**
     * A text setting in the current language: on Arabic or English requests its `_ar` /
     * `_en` sibling when filled (e.g. `home.hero_title_en`), the French value otherwise.
     */
    public function localized(string $key): mixed
    {
        $locale = Locale::translation();

        if ($locale !== null) {
            $translation = $this->get($key.'_'.$locale);

            if ($translation !== null && $translation !== '') {
                return $translation;
            }
        }

        return $this->get($key);
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

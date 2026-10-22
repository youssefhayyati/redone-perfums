<?php

namespace App\Http\Controllers;

use App\Models\Collection;
use App\Models\Pack;
use App\Models\Page;
use App\Models\Product;
use App\Services\Settings\StorefrontConfig;
use App\Services\Settings\StoreSettings;
use App\Support\Locale;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Str;
use Illuminate\View\View;

/**
 * Serves the HTML shells of the two SPAs. For shareable URLs the server fills in the
 * title, description, Open Graph tags and Product structured data, so links preview
 * correctly and crawlers see accurate metadata without executing JavaScript.
 */
class SpaController extends Controller
{
    public function storefront(Request $request, StoreSettings $settings, StorefrontConfig $config): Response
    {
        // Arabic pages live under /ar; the rest of the path is the same in both languages.
        $path = trim($request->path(), '/');
        $locale = Locale::FRENCH;
        if ($path === 'ar' || str_starts_with($path, 'ar/')) {
            $locale = Locale::ARABIC;
            $path = substr($path, 3) ?: '';
        }
        App::setLocale($locale);

        $store = $settings->get('store.name');
        $meta = [
            'title' => $store.' — '.$settings->localized('store.descriptor'),
            'description' => $settings->localized('store.meta_description'),
            'image' => asset('images/og-default.jpg'),
            'type' => 'website',
            'jsonld' => null,
        ];

        $status = $this->isKnownRoute($path) ? 200 : 404;
        $private = preg_match('#^(panier|commande|compte)(/|$)#', $path) === 1;

        if (preg_match('#^(parfums|collections|coffrets|pages)/([a-z0-9\-]+)$#', $path, $m) && ! $this->exists($m[1], $m[2])) {
            $status = 404;
        }

        if (preg_match('#^parfums/([a-z0-9\-]+)$#', $path, $m) && ($product = $this->product($m[1]))) {
            $image = $product->images->first();
            $prices = $product->activeVariants->pluck('price');
            $meta = [
                'title' => ($product->translated('meta_title') ?: $product->translated('name')).' — '.$store,
                'description' => $product->translated('meta_description') ?: ($product->translated('tagline') ?: Str::limit(strip_tags((string) $product->translated('description')), 155)),
                'image' => $this->shareableImage($image?->url(), $meta['image']),
                'type' => 'product',
                'jsonld' => $prices->isEmpty() ? null : [
                    '@context' => 'https://schema.org',
                    '@type' => 'Product',
                    'name' => $product->translated('name'),
                    'description' => $product->translated('tagline') ?: Str::limit(strip_tags((string) $product->translated('description')), 300),
                    'image' => $product->images->map->url()->filter()->values()->all(),
                    'brand' => ['@type' => 'Brand', 'name' => $store],
                    'sku' => $product->activeVariants->first()?->sku,
                    'offers' => [
                        '@type' => 'AggregateOffer',
                        'priceCurrency' => 'MAD',
                        'lowPrice' => number_format($prices->min() / 100, 2, '.', ''),
                        'highPrice' => number_format($prices->max() / 100, 2, '.', ''),
                        'offerCount' => $prices->count(),
                        'availability' => $product->activeVariants->contains(fn ($v) => $v->stock > 0)
                            ? 'https://schema.org/InStock'
                            : 'https://schema.org/OutOfStock',
                    ],
                ],
            ];
        } elseif (preg_match('#^collections/([a-z0-9\-]+)$#', $path, $m)
            && ($collection = Collection::where('slug', $m[1])->where('is_visible', true)->first())) {
            $meta['title'] = $collection->translated('name').' — '.$store;
            $meta['description'] = $collection->translated('tagline') ?: Str::limit((string) $collection->translated('description'), 155) ?: $meta['description'];
            $meta['image'] = $this->shareableImage($collection->imageUrl(), $meta['image']);
        } elseif (preg_match('#^coffrets/([a-z0-9\-]+)$#', $path, $m)
            && ($pack = Pack::where('slug', $m[1])->where('is_active', true)->first())) {
            $meta['title'] = $pack->translated('name').' — '.$store;
            $meta['description'] = $pack->translated('tagline') ?: Str::limit((string) $pack->translated('description'), 155) ?: $meta['description'];
            $meta['image'] = $this->shareableImage($pack->imageUrl(), $meta['image']);
        } elseif (preg_match('#^pages/([a-z0-9\-]+)$#', $path, $m)
            && ($page = Page::where('slug', $m[1])->where('is_published', true)->first())) {
            $meta['title'] = $page->translated('title').' — '.$store;
            $meta['description'] = $page->translated('meta_description') ?: $meta['description'];
        }

        return response()->view('storefront', [
            'meta' => [
                ...$meta,
                'url' => $request->url(),
                'site_name' => $store,
                'noindex' => $private || $status === 404,
                'locale' => $locale,
                'dir' => $locale === Locale::ARABIC ? 'rtl' : 'ltr',
                // The same page in each language, for hreflang links and the language switch.
                'alternates' => collect(Locale::SUPPORTED)->mapWithKeys(fn (string $code) => [$code => url(Locale::path($path, $code))])->all(),
            ],
            'config' => $config->build(),
        ], $status);
    }

    public function admin(StoreSettings $settings): View
    {
        return view('admin', ['storeName' => $settings->get('store.name')]);
    }

    /**
     * Social networks do not render SVG previews: those fall back to the default image.
     */
    private function shareableImage(?string $url, string $fallback): string
    {
        if ($url === null || Str::endsWith(Str::lower((string) parse_url($url, PHP_URL_PATH)), '.svg')) {
            return $fallback;
        }

        return $url;
    }

    private function product(string $slug): ?Product
    {
        return Product::query()->published()->where('slug', $slug)->with(['images', 'activeVariants'])->first();
    }

    /** Mirrors the storefront router (resources/js/storefront/routes.tsx). */
    private function isKnownRoute(string $path): bool
    {
        $patterns = [
            '', 'boutique', 'collections', 'decouvrir', 'coffrets', 'panier', 'commande',
            'compte', 'compte/connexion', 'compte/inscription', 'compte/mot-de-passe-oublie', 'compte/reinitialiser',
            'parfums/[a-z0-9\-]+', 'collections/[a-z0-9\-]+', 'coffrets/[a-z0-9\-]+', 'pages/[a-z0-9\-]+',
            'commande/confirmation/[A-Z0-9\-]+', 'compte/commandes/[A-Z0-9\-]+',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match('#^'.$pattern.'$#', $path) === 1) {
                return true;
            }
        }

        return false;
    }

    private function exists(string $type, string $slug): bool
    {
        return match ($type) {
            'parfums' => Product::query()->published()->where('slug', $slug)->exists(),
            'collections' => Collection::query()->where('is_visible', true)->where('slug', $slug)->exists(),
            'coffrets' => Pack::query()->where('is_active', true)->where('slug', $slug)->exists(),
            'pages' => Page::query()->where('is_published', true)->where('slug', $slug)->exists(),
        };
    }
}

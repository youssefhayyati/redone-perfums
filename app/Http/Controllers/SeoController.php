<?php

namespace App\Http\Controllers;

use App\Models\Collection;
use App\Models\Pack;
use App\Models\Page;
use App\Models\Product;
use App\Support\Locale;
use Illuminate\Http\Response;

/**
 * What search engines read: robots.txt and the sitemap. Both are served by Laravel
 * because the sitemap's address depends on APP_URL, and its entries on the catalogue.
 */
class SeoController extends Controller
{
    /** Storefront sections that exist whatever the catalogue holds. */
    private const SECTIONS = ['/', '/boutique', '/collections', '/decouvrir'];

    public function robots(): Response
    {
        $rules = [
            'User-agent: *',
            'Disallow: /admin',
            'Disallow: /api/',
            'Disallow: /panier',
            'Disallow: /commande',
            'Disallow: /compte',
            '',
            'Sitemap: '.url('/sitemap.xml'),
        ];

        return response(implode("\n", $rules)."\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    /**
     * Every page the storefront serves with a 200, by the same rules as SpaController,
     * in French and under /ar in Arabic, each linked to its other language.
     */
    public function sitemap(): Response
    {
        $packs = Pack::query()->where('is_active', true)->orderBy('sort_order')->get(['slug', 'updated_at']);

        $entries = collect(self::SECTIONS)
            ->when($packs->isNotEmpty(), fn ($sections) => $sections->push('/coffrets'))
            ->map(fn (string $path) => ['path' => $path, 'updated_at' => null])
            ->concat(Product::query()->published()->orderBy('sort_order')->get(['slug', 'updated_at'])
                ->map(fn (Product $product) => ['path' => '/parfums/'.$product->slug, 'updated_at' => $product->updated_at]))
            ->concat(Collection::query()->where('is_visible', true)->orderBy('sort_order')->get(['slug', 'updated_at'])
                ->map(fn (Collection $collection) => ['path' => '/collections/'.$collection->slug, 'updated_at' => $collection->updated_at]))
            ->concat($packs->map(fn (Pack $pack) => ['path' => '/coffrets/'.$pack->slug, 'updated_at' => $pack->updated_at]))
            ->concat(Page::query()->where('is_published', true)->orderBy('sort_order')->get(['slug', 'updated_at'])
                ->map(fn (Page $page) => ['path' => '/pages/'.$page->slug, 'updated_at' => $page->updated_at]));

        return response()
            ->view('seo.sitemap', ['entries' => $entries, 'locales' => Locale::SUPPORTED])
            ->header('Content-Type', 'application/xml; charset=UTF-8');
    }
}

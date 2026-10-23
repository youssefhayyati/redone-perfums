<?php

namespace Tests\Feature\Seeders;

use App\Models\Collection;
use App\Models\Pack;
use App\Models\PackItem;
use App\Models\Product;
use App\Models\ProductImage;
use Database\Seeders\DemoCatalogSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\File;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class DemoCatalogSeederTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_uses_every_artwork_file_shipped_in_the_demo_folder_and_no_other(): void
    {
        $this->seed(DemoCatalogSeeder::class);

        $referenced = ProductImage::query()->pluck('path')
            ->merge(Collection::query()->pluck('image_path'))
            ->merge(Pack::query()->pluck('image_path'))
            ->sort()->values()->all();
        $shipped = collect(File::files(public_path('images/demo')))
            ->map(fn ($file) => '/images/demo/'.$file->getFilename())
            ->sort()->values()->all();

        $this->assertCount(75, $referenced);
        $this->assertSame($shipped, $referenced);
    }

    #[TestWith(['coffret-decouverte'])]
    #[TestWith(['trio-signature'])]
    public function test_custom_packs_offer_every_50_ml_perfume_of_their_collections(string $slug): void
    {
        $this->seed(DemoCatalogSeeder::class);

        $response = $this->getJson("/api/packs/{$slug}");

        $response->assertOk()->assertJsonCount(28, 'options');
    }

    public function test_the_best_sellers_pack_holds_its_three_perfumes_at_a_reduced_price(): void
    {
        $this->seed(DemoCatalogSeeder::class);

        $response = $this->getJson('/api/packs/coffret-best-sellers');

        $response->assertOk()
            ->assertJsonPath('data.contents.*.product.slug', ['aisha', 'crystal-24', 'muskitoko-musc-blanc'])
            ->assertJsonPath('data.starting_price', 142000);
    }

    public function test_running_it_twice_adds_nothing(): void
    {
        $this->seed(DemoCatalogSeeder::class);

        $this->seed(DemoCatalogSeeder::class);

        $this->assertSame(37, Product::query()->count());
        $this->assertSame(68, ProductImage::query()->count());
        $this->assertSame(4, Collection::query()->count());
        $this->assertSame(3, Pack::query()->count());
        $this->assertSame(3, PackItem::query()->count());
    }
}

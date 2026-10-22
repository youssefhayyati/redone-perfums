<?php

namespace Tests\Feature\Seeders;

use App\Models\City;
use App\Models\Collection;
use App\Models\ProcessStep;
use App\Models\Product;
use Database\Seeders\EnglishContentSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class EnglishContentSeederTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_fills_the_english_version_of_demo_records(): void
    {
        $product = Product::factory()->create(['slug' => 'nuit-d-ambre', 'name' => 'Nuit d’Ambre']);
        $collection = Collection::factory()->create(['slug' => 'essentiels']);
        $city = City::factory()->named('Tanger')->create(['region' => 'Tanger-Tétouan-Al Hoceïma']);
        $step = ProcessStep::factory()->create(['title' => 'La macération']);

        $this->seed(EnglishContentSeeder::class);

        $this->assertSame('A luminous amber that lingers until dawn.', $product->fresh()->tagline_en);
        $this->assertSame('Eau de Parfum', $product->fresh()->concentration_en);
        $this->assertNull($product->fresh()->name_en, 'Perfume names keep their French original.');
        $this->assertSame('The Essentials', $collection->fresh()->name_en);
        $this->assertSame('Tangier', $city->fresh()->name_en);
        $this->assertSame('Tangier-Tetouan-Al Hoceima', $city->fresh()->region_en);
        $this->assertSame('Maceration', $step->fresh()->title_en);
        $this->assertSame('4 to 6 weeks', $step->fresh()->detail_en);
    }

    public function test_never_overwrites_english_text_written_by_the_store(): void
    {
        $product = Product::factory()->create(['slug' => 'nuit-d-ambre', 'tagline_en' => 'Our amber, until dawn.']);

        $this->seed(EnglishContentSeeder::class);

        $this->assertSame('Our amber, until dawn.', $product->fresh()->tagline_en);
        $this->assertSame('Eau de Parfum', $product->fresh()->concentration_en);
    }
}

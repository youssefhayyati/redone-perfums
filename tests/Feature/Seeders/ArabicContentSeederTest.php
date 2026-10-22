<?php

namespace Tests\Feature\Seeders;

use App\Models\City;
use App\Models\Product;
use Database\Seeders\ArabicContentSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class ArabicContentSeederTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_fills_the_arabic_version_of_demo_records(): void
    {
        $product = Product::factory()->create(['slug' => 'nuit-d-ambre']);
        $city = City::factory()->named('Casablanca')->create(['region' => 'Casablanca-Settat']);

        $this->seed(ArabicContentSeeder::class);

        $this->assertSame('ليلة العنبر', $product->fresh()->name_ar);
        $this->assertSame('ماء عطر', $product->fresh()->concentration_ar);
        $this->assertSame('الدار البيضاء', $city->fresh()->name_ar);
        $this->assertSame('الدار البيضاء سطات', $city->fresh()->region_ar);
    }

    public function test_never_overwrites_arabic_text_written_by_the_store(): void
    {
        $product = Product::factory()->create(['slug' => 'nuit-d-ambre', 'name_ar' => 'ليالي العنبر']);

        $this->seed(ArabicContentSeeder::class);

        $this->assertSame('ليالي العنبر', $product->fresh()->name_ar);
        $this->assertSame('عنبر مضيء يمتدّ حتى الفجر.', $product->fresh()->tagline_ar);
    }
}

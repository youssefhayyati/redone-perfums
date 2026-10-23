<?php

namespace Tests\Feature\Seeders;

use App\Models\City;
use App\Models\Collection;
use App\Models\FragranceFamily;
use App\Models\Note;
use App\Models\Pack;
use App\Models\Product;
use Database\Seeders\ArabicContentSeeder;
use Database\Seeders\DemoCatalogSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class ArabicContentSeederTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_fills_the_arabic_version_of_demo_records(): void
    {
        $product = Product::factory()->create(['slug' => 'aisha']);
        $city = City::factory()->named('Casablanca')->create(['region' => 'Casablanca-Settat']);

        $this->seed(ArabicContentSeeder::class);

        $this->assertSame('عائشة', $product->fresh()->name_ar);
        $this->assertSame('خلاصة عطر', $product->fresh()->concentration_ar);
        $this->assertSame('الدار البيضاء', $city->fresh()->name_ar);
        $this->assertSame('الدار البيضاء سطات', $city->fresh()->region_ar);
    }

    public function test_never_overwrites_arabic_text_written_by_the_store(): void
    {
        $product = Product::factory()->create(['slug' => 'aisha', 'name_ar' => 'عيشة']);

        $this->seed(ArabicContentSeeder::class);

        $this->assertSame('عيشة', $product->fresh()->name_ar);
        $this->assertSame('الإبداع الأيقوني للدار، شرقيّ وزهري.', $product->fresh()->tagline_ar);
    }

    public function test_translates_every_record_of_the_demo_catalogue(): void
    {
        $this->seed(DemoCatalogSeeder::class);

        $this->seed(ArabicContentSeeder::class);

        $this->assertSame([], Product::query()->where(fn ($q) => $q->whereNull('name_ar')->orWhereNull('tagline_ar')->orWhereNull('description_ar')->orWhereNull('concentration_ar'))->pluck('slug')->all());
        $this->assertSame([], Note::query()->whereNull('name_ar')->pluck('slug')->all());
        $this->assertSame([], FragranceFamily::query()->whereNull('name_ar')->pluck('slug')->all());
        $this->assertSame([], Collection::query()->whereNull('name_ar')->pluck('slug')->all());
        $this->assertSame([], Pack::query()->whereNull('name_ar')->pluck('slug')->all());
    }
}

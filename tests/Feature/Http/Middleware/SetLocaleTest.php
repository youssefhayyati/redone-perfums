<?php

namespace Tests\Feature\Http\Middleware;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class SetLocaleTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_arabic_storefront_requests_receive_the_arabic_version(): void
    {
        $this->bilingualProduct();

        $response = $this->withHeader('X-Locale', 'ar')->getJson('/api/products/nuit-d-ambre');

        $response->assertOk()
            ->assertJsonPath('data.name', 'ليلة العنبر')
            ->assertJsonPath('data.tagline', 'عنبر مضيء يمتدّ حتى الفجر.')
            ->assertJsonPath('data.variants.0.label', '50 مل');
    }

    public function test_english_storefront_requests_receive_the_english_version(): void
    {
        $this->bilingualProduct(['name_en' => 'Amber Night', 'tagline_en' => 'A luminous amber that lingers until dawn.']);

        $response = $this->withHeader('X-Locale', 'en')->getJson('/api/products/nuit-d-ambre');

        $response->assertOk()
            ->assertJsonPath('data.name', 'Amber Night')
            ->assertJsonPath('data.tagline', 'A luminous amber that lingers until dawn.')
            ->assertJsonPath('data.variants.0.label', '50 ml');
    }

    public function test_english_requests_fall_back_to_french_where_no_english_text_is_written(): void
    {
        $this->bilingualProduct(['name_en' => 'Amber Night']);

        $response = $this->withHeader('X-Locale', 'en')->getJson('/api/products/nuit-d-ambre');

        $response->assertOk()
            ->assertJsonPath('data.name', 'Amber Night')
            ->assertJsonPath('data.tagline', 'Un ambre lumineux qui s’étire jusqu’à l’aube.');
    }

    #[TestWith(['X-Locale', 'de'])]
    #[TestWith(['X-Locale', 'fr'])]
    #[TestWith(['Accept-Language', 'ar'])]
    #[TestWith(['Accept-Language', 'en'])]
    public function test_requests_without_a_storefront_x_locale_stay_in_french(string $header, string $value): void
    {
        $this->bilingualProduct();

        $response = $this->withHeader($header, $value)->getJson('/api/products/nuit-d-ambre');

        $response->assertOk()
            ->assertJsonPath('data.name', 'Nuit d’Ambre')
            ->assertJsonPath('data.variants.0.label', '50 ml');
    }

    public function test_arabic_requests_fall_back_to_french_where_no_arabic_text_is_written(): void
    {
        $this->bilingualProduct(['tagline_ar' => null]);

        $response = $this->withHeader('X-Locale', 'ar')->getJson('/api/products/nuit-d-ambre');

        $response->assertOk()
            ->assertJsonPath('data.name', 'ليلة العنبر')
            ->assertJsonPath('data.tagline', 'Un ambre lumineux qui s’étire jusqu’à l’aube.');
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function bilingualProduct(array $attributes = []): Product
    {
        $product = Product::factory()->published()->create([
            'name' => 'Nuit d’Ambre',
            'slug' => 'nuit-d-ambre',
            'name_ar' => 'ليلة العنبر',
            'tagline' => 'Un ambre lumineux qui s’étire jusqu’à l’aube.',
            'tagline_ar' => 'عنبر مضيء يمتدّ حتى الفجر.',
            ...$attributes,
        ]);
        ProductVariant::factory()->for($product)->create(['size_ml' => 50]);

        return $product;
    }
}

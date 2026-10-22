<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use Closure;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ProductImageControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_upload_stores_webp_sizes_and_returns_201_with_url_and_srcset(): void
    {
        Storage::fake('public');
        $ulid = Str::freezeUlids();
        $product = Product::factory()->named('Aurore')->create();
        $base = "products/{$product->id}/".strtolower((string) $ulid);

        $response = $this->actingAs($this->manager())->post("/api/admin/products/{$product->id}/images", [
            'image' => UploadedFile::fake()->image('flacon.jpg', 1200, 900),
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.url', "/storage/{$base}.webp")
            ->assertJsonPath('data.srcset', "/storage/{$base}-480.webp 480w, /storage/{$base}-960.webp 960w, /storage/{$base}.webp 1200w")
            ->assertJsonPath('data.alt', 'Aurore')
            ->assertJsonPath('data.width', 1200)
            ->assertJsonPath('data.height', 900);
        Storage::disk('public')->assertExists(["{$base}.webp", "{$base}-480.webp", "{$base}-960.webp"]);
        $this->assertSame('WEBP', substr(Storage::disk('public')->get("{$base}.webp"), 8, 4));
        $this->assertDatabaseHas('product_images', [
            'product_id' => $product->id, 'path' => "{$base}.webp", 'width' => 1200, 'height' => 900, 'sort_order' => 1,
        ]);
    }

    public function test_upload_scales_images_wider_than_2000_px_down_to_2000(): void
    {
        Storage::fake('public');
        $product = Product::factory()->create();

        $response = $this->actingAs($this->manager())->post("/api/admin/products/{$product->id}/images", [
            'image' => UploadedFile::fake()->image('affiche.png', 2100, 1050),
            'alt' => 'Flacon Aurore sur marbre',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.width', 2000)
            ->assertJsonPath('data.height', 1000)
            ->assertJsonPath('data.alt', 'Flacon Aurore sur marbre');
        $this->assertSame([480, 960, 1600, 2000], array_keys(ProductImage::query()->sole()->variants));
    }

    public function test_upload_rejects_an_image_under_400_px_with_422(): void
    {
        Storage::fake('public');
        $product = Product::factory()->create();

        $response = $this->actingAs($this->manager())->post("/api/admin/products/{$product->id}/images", [
            'image' => UploadedFile::fake()->image('vignette.jpg', 300, 300),
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['image' => 'L’image doit mesurer au moins 400 × 400 px.']);
        $this->assertDatabaseCount('product_images', 0);
        Storage::disk('public')->assertDirectoryEmpty('/');
    }

    /**
     * @return array<string, array{Closure(): UploadedFile}>
     */
    public static function nonImageFiles(): array
    {
        return [
            'pdf' => [fn () => UploadedFile::fake()->create('fiche-produit.pdf', 120, 'application/pdf')],
            'svg that could carry a script' => [fn () => UploadedFile::fake()->createWithContent(
                'logo.svg',
                '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><script>alert(1)</script></svg>',
            )],
        ];
    }

    /**
     * @param  Closure(): UploadedFile  $file
     */
    #[DataProvider('nonImageFiles')]
    public function test_upload_rejects_files_other_than_jpg_png_or_webp_with_422(Closure $file): void
    {
        Storage::fake('public');
        $product = Product::factory()->create();

        $response = $this->actingAs($this->manager())->post("/api/admin/products/{$product->id}/images", ['image' => $file()]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['image' => 'Formats acceptés : JPG, PNG ou WebP.']);
        $this->assertDatabaseCount('product_images', 0);
        Storage::disk('public')->assertDirectoryEmpty('/');
    }

    public function test_upload_refuses_a_13th_image_with_422(): void
    {
        Storage::fake('public');
        $product = Product::factory()->has(ProductImage::factory()->count(12), 'images')->create();

        $response = $this->actingAs($this->manager())->post("/api/admin/products/{$product->id}/images", [
            'image' => UploadedFile::fake()->image('flacon.jpg', 800, 800),
        ]);

        $response->assertUnprocessable()
            ->assertJsonPath('message', 'Douze images maximum par produit.');
        $this->assertSame(12, $product->images()->count());
        Storage::disk('public')->assertDirectoryEmpty('/');
    }

    public function test_reorder_saves_the_requested_order_and_ignores_images_of_other_products(): void
    {
        $product = Product::factory()->create();
        [$first, $second, $third] = ProductImage::factory()->count(3)->for($product)
            ->sequence(['sort_order' => 0], ['sort_order' => 1], ['sort_order' => 2])
            ->create()
            ->all();
        $foreign = ProductImage::factory()->create(['sort_order' => 5]);

        $response = $this->actingAs($this->manager())->putJson("/api/admin/products/{$product->id}/images/order", [
            'ids' => [$third->id, $foreign->id, $first->id, $second->id],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.*.id', [$third->id, $first->id, $second->id]);
        $this->assertSame([0, 2, 3, 5], [
            $third->fresh()->sort_order, $first->fresh()->sort_order, $second->fresh()->sort_order, $foreign->fresh()->sort_order,
        ]);
    }

    public function test_alt_text_update_is_saved(): void
    {
        $image = ProductImage::factory()->create(['alt' => 'Ancien texte']);

        $response = $this->actingAs($this->manager())->patchJson("/api/admin/products/{$image->product_id}/images/{$image->id}", [
            'alt' => 'Flacon Aurore 50 ml',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.alt', 'Flacon Aurore 50 ml');
        $this->assertSame('Flacon Aurore 50 ml', $image->fresh()->alt);
    }

    public function test_destroy_deletes_every_size_of_the_image_and_its_record(): void
    {
        Storage::fake('public');
        $image = ProductImage::factory()->state(['path' => 'products/7/aurore.webp'])->withResponsiveVariants()->create();
        $files = ['products/7/aurore.webp', 'products/7/aurore-480.webp', 'products/7/aurore-960.webp'];
        foreach ($files as $path) {
            Storage::disk('public')->put($path, 'webp');
        }

        $response = $this->actingAs($this->manager())->deleteJson("/api/admin/products/{$image->product_id}/images/{$image->id}");

        $response->assertOk()
            ->assertExactJson(['message' => 'Image supprimée.']);
        Storage::disk('public')->assertMissing($files);
        $this->assertModelMissing($image);
    }

    /**
     * @return array<string, array{string, array<string, string>}>
     */
    public static function imageMutations(): array
    {
        return [
            'update the alt text' => ['patch', ['alt' => 'Remplacé']],
            'delete' => ['delete', []],
        ];
    }

    /**
     * @param  array<string, string>  $payload
     */
    #[DataProvider('imageMutations')]
    public function test_an_image_of_another_product_returns_404(string $method, array $payload): void
    {
        $product = Product::factory()->create();
        $foreignImage = ProductImage::factory()->create(['alt' => 'Original']);

        $response = $this->actingAs($this->manager())->json($method, "/api/admin/products/{$product->id}/images/{$foreignImage->id}", $payload);

        $response->assertNotFound();
        $this->assertDatabaseHas('product_images', ['id' => $foreignImage->id, 'alt' => 'Original']);
    }

    private function manager(): User
    {
        return User::factory()->manager()->create();
    }
}

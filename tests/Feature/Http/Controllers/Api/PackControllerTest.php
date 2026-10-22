<?php

namespace Tests\Feature\Http\Controllers\Api;

use App\Models\Collection;
use App\Models\Pack;
use App\Models\Product;
use App\Models\ProductVariant;
use Closure;
use Database\Factories\PackFactory;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PackControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_index_lists_only_active_packs(): void
    {
        Pack::factory()->custom(3)->named('Coffret Découverte')->create(['sort_order' => 2]);
        Pack::factory()->fixed()->containing($this->perfume('Ambre Nuit'), 2)->named('Duo Ambre')->create(['sort_order' => 1]);
        Pack::factory()->inactive()->create();

        $response = $this->getJson('/api/packs');

        $response->assertOk()
            ->assertJsonPath('data.*.slug', ['duo-ambre', 'coffret-decouverte'])
            ->assertJsonPath('data.*.bottle_count', [2, 3]);
    }

    public function test_show_returns_404_for_an_inactive_pack(): void
    {
        Pack::factory()->inactive()->named('Coffret Retiré')->create();

        $response = $this->getJson('/api/packs/coffret-retire');

        $response->assertNotFound();
    }

    public function test_show_offers_only_active_variants_of_published_products_in_the_allowed_sizes(): void
    {
        Pack::factory()->custom(2)->allowedSizes([50])->named('Duo Découverte')->create();
        $amber = Product::factory()->published()->named('Ambre Nuit')->create();
        $amber50 = ProductVariant::factory()->for($amber)->create(['size_ml' => 50]);
        ProductVariant::factory()->for($amber)->create(['size_ml' => 100]);
        $oud50 = $this->perfume('Oud Royal');
        $this->perfume('Grand Format', sizeMl: 100);
        ProductVariant::factory()->for(Product::factory()->draft())->create(['size_ml' => 50]);
        ProductVariant::factory()->inactive()->for(Product::factory()->published())->create(['size_ml' => 50]);

        $response = $this->getJson('/api/packs/duo-decouverte');

        $response->assertOk()
            ->assertJsonPath('data.slug', 'duo-decouverte')
            ->assertJsonPath('options.*.slug', ['ambre-nuit', 'oud-royal'])
            ->assertJsonPath('options.*.pack_variants.*.id', [$amber50->id, $oud50->id]);
    }

    public function test_show_with_collection_eligibility_offers_only_products_of_those_collections(): void
    {
        $evenings = Collection::factory()->create();
        $inCollection = $this->perfume('Oud Royal');
        $evenings->products()->attach($inCollection->product_id);
        $this->perfume('Néroli Frais');
        Pack::factory()->custom(2)->forCollections($evenings)->named('Duo du Soir')->create();

        $response = $this->getJson('/api/packs/duo-du-soir');

        $response->assertOk()
            ->assertJsonPath('options.*.slug', ['oud-royal']);
    }

    public function test_show_with_product_eligibility_offers_only_the_listed_published_products(): void
    {
        $listed = $this->perfume('Ambre Nuit');
        $listedDraft = ProductVariant::factory()->for(Product::factory()->draft())->create();
        $this->perfume('Cèdre Blanc');
        Pack::factory()->custom(2)->forProducts($listed->product, $listedDraft->product)->named('Duo Choisi')->create();

        $response = $this->getJson('/api/packs/duo-choisi');

        $response->assertOk()
            ->assertJsonPath('options.*.slug', ['ambre-nuit']);
    }

    public function test_show_of_a_fixed_pack_lists_its_contents_and_no_options(): void
    {
        $amber = $this->perfume('Ambre Nuit');
        $oud = $this->perfume('Oud Royal', 52000);
        Pack::factory()->fixed()->containing($amber, 2)->containing($oud)->named('Trio Signature')->create();

        $response = $this->getJson('/api/packs/trio-signature');

        $response->assertOk()
            ->assertJsonPath('options', [])
            ->assertJsonPath('data.bottle_count', 3)
            ->assertJsonPath('data.contents.*.quantity', [2, 1])
            ->assertJsonPath('data.contents.*.product.name', ['Ambre Nuit', 'Oud Royal']);
    }

    /**
     * @return array<string, array{Closure(PackFactory): PackFactory, int, int}>
     */
    public static function pricingRules(): array
    {
        return [
            'fixed price' => [fn (PackFactory $pack) => $pack->fixedPrice(120000), 120000, 15000],
            'percent off, rounded to the dirham' => [fn (PackFactory $pack) => $pack->percentOff(15), 114800, 20200],
            'amount off' => [fn (PackFactory $pack) => $pack->amountOff(20000), 115000, 20000],
        ];
    }

    /**
     * @param  Closure(PackFactory): PackFactory  $pricing
     */
    #[DataProvider('pricingRules')]
    public function test_quote_returns_the_server_price_for_each_pricing_rule(Closure $pricing, int $price, int $savings): void
    {
        $selection = [
            $this->perfume('Ambre Nuit', 45000)->id,
            $this->perfume('Bois Sacré', 38000)->id,
            $this->perfume('Cèdre Blanc', 52000)->id,
        ];
        $pricing(Pack::factory()->custom(3)->named('Trio Libre'))->create();

        $response = $this->postJson('/api/packs/trio-libre/quote', ['selections' => $selection, 'price' => 100]);

        $response->assertOk()
            ->assertExactJson(['compare_at' => 135000, 'price' => $price, 'savings' => $savings, 'out_of_stock' => []]);
    }

    public function test_quote_rejects_a_selection_with_the_wrong_number_of_perfumes_with_422(): void
    {
        Pack::factory()->custom(3)->named('Trio Libre')->create();

        $response = $this->postJson('/api/packs/trio-libre/quote', [
            'selections' => [$this->perfume('Ambre Nuit')->id, $this->perfume('Oud Royal')->id],
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['selections' => 'Ce coffret se compose de 3 parfums : vous en avez choisi 2.']);
    }

    public function test_quote_rejects_the_same_perfume_twice_in_a_pack_without_duplicates_with_422(): void
    {
        Pack::factory()->custom(3)->named('Trio Libre')->create();
        $amber = $this->perfume('Ambre Nuit');

        $response = $this->postJson('/api/packs/trio-libre/quote', [
            'selections' => [$amber->id, $amber->id, $this->perfume('Oud Royal')->id],
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['selections' => 'Chaque parfum ne peut être choisi qu’une fois dans ce coffret.']);
    }

    public function test_quote_rejects_two_sizes_of_one_perfume_in_a_pack_without_duplicates_with_422(): void
    {
        Pack::factory()->custom(2)->named('Duo Libre')->create();
        $amber = Product::factory()->published()->create();
        $amber50 = ProductVariant::factory()->for($amber)->create(['size_ml' => 50]);
        $amber100 = ProductVariant::factory()->for($amber)->create(['size_ml' => 100]);

        $response = $this->postJson('/api/packs/duo-libre/quote', ['selections' => [$amber50->id, $amber100->id]]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['selections' => 'Chaque parfum ne peut être choisi qu’une fois dans ce coffret.']);
    }

    public function test_quote_prices_a_repeated_perfume_once_per_bottle_in_a_pack_allowing_duplicates(): void
    {
        Pack::factory()->custom(3)->allowingDuplicates()->amountOff(10000)->named('Trio Libre')->create();
        $amber = $this->perfume('Ambre Nuit', 45000);

        $response = $this->postJson('/api/packs/trio-libre/quote', [
            'selections' => [$amber->id, $amber->id, $this->perfume('Oud Royal', 38000)->id],
        ]);

        $response->assertOk()
            ->assertJsonPath('compare_at', 128000)
            ->assertJsonPath('price', 118000);
    }

    public function test_quote_rejects_a_variant_the_pack_does_not_accept_with_422(): void
    {
        Pack::factory()->custom(2)->allowedSizes([50])->named('Duo Libre')->create();

        $response = $this->postJson('/api/packs/duo-libre/quote', [
            'selections' => [$this->perfume('Ambre Nuit')->id, $this->perfume('Oud Royal', sizeMl: 100)->id],
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['selections' => 'Un des parfums choisis ne peut pas entrer dans ce coffret.']);
    }

    public function test_quote_flags_selected_variants_without_enough_stock(): void
    {
        Pack::factory()->custom(3)->allowingDuplicates()->named('Trio Libre')->create();
        $lastBottle = $this->perfume('Ambre Nuit', stock: 1);
        $soldOut = $this->perfume('Oud Royal', stock: 0);

        $response = $this->postJson('/api/packs/trio-libre/quote', [
            'selections' => [$lastBottle->id, $lastBottle->id, $soldOut->id],
        ]);

        $response->assertOk()
            ->assertJsonPath('out_of_stock', [$lastBottle->id, $soldOut->id]);
    }

    public function test_quote_returns_404_for_an_inactive_pack(): void
    {
        Pack::factory()->inactive()->named('Coffret Retiré')->create();

        $response = $this->postJson('/api/packs/coffret-retire/quote', ['selections' => []]);

        $response->assertNotFound();
    }

    private function perfume(string $name, int $price = 45000, int $sizeMl = 50, int $stock = 20): ProductVariant
    {
        return ProductVariant::factory()
            ->for(Product::factory()->published()->named($name))
            ->create(['size_ml' => $sizeMl, 'price' => $price, 'stock' => $stock]);
    }
}

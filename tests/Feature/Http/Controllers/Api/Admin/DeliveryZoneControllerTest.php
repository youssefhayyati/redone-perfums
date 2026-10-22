<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Models\City;
use App\Models\DeliveryZone;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class DeliveryZoneControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_index_lists_zones_in_display_order_with_their_city_count(): void
    {
        $north = DeliveryZone::factory()->create(['name' => 'Nord', 'sort_order' => 2]);
        DeliveryZone::factory()->create(['name' => 'Grand Casablanca', 'sort_order' => 1]);
        City::factory()->count(2)->for($north, 'zone')->create();

        $response = $this->actingAs($this->admin())->getJson('/api/admin/delivery-zones');

        $response->assertOk()
            ->assertJsonPath('data.*.name', ['Grand Casablanca', 'Nord'])
            ->assertJsonPath('data.*.cities_count', [0, 2]);
    }

    public function test_store_creates_a_zone_and_returns_201(): void
    {
        $response = $this->actingAs($this->admin())->postJson('/api/admin/delivery-zones', [
            'name' => 'Grand Casablanca',
            'fee' => 2500,
            'free_shipping_threshold' => 100000,
            'delivery_estimate' => '24 h',
            'is_active' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Grand Casablanca')
            ->assertJsonPath('data.cities_count', 0);
        $this->assertDatabaseHas('delivery_zones', [
            'name' => 'Grand Casablanca', 'fee' => 2500, 'free_shipping_threshold' => 100000,
            'delivery_estimate' => '24 h', 'is_active' => true, 'sort_order' => 0,
        ]);
    }

    public function test_store_without_a_fee_returns_422(): void
    {
        $response = $this->actingAs($this->admin())->postJson('/api/admin/delivery-zones', ['name' => 'Sud']);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['fee' => 'Le champ frais de livraison est obligatoire.']);
        $this->assertDatabaseCount('delivery_zones', 0);
    }

    public function test_update_without_the_active_flag_suspends_the_zone(): void
    {
        $zone = DeliveryZone::factory()->create(['name' => 'Sud', 'fee' => 4000]);

        $response = $this->actingAs($this->admin())->putJson("/api/admin/delivery-zones/{$zone->id}", ['name' => 'Sud', 'fee' => 4500]);

        $response->assertOk()
            ->assertJsonPath('data.is_active', false);
        $this->assertDatabaseHas('delivery_zones', ['id' => $zone->id, 'fee' => 4500, 'is_active' => false]);
    }

    public function test_destroy_leaves_its_cities_without_a_zone(): void
    {
        $zone = DeliveryZone::factory()->create();
        $city = City::factory()->for($zone, 'zone')->create();

        $response = $this->actingAs($this->admin())->deleteJson("/api/admin/delivery-zones/{$zone->id}");

        $response->assertOk()
            ->assertExactJson(['message' => 'Zone supprimée.']);
        $this->assertModelMissing($zone);
        $this->assertNull($city->fresh()->delivery_zone_id);
    }

    private function admin(): User
    {
        return User::factory()->admin()->create();
    }
}

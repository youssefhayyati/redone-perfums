<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Models\City;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class CityControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_index_lists_cities_alphabetically_with_their_zone(): void
    {
        $zone = DeliveryZone::factory()->create(['name' => 'Grand Casablanca']);
        City::factory()->for($zone, 'zone')->named('Mohammédia')->create();
        City::factory()->for($zone, 'zone')->named('Casablanca')->create();

        $response = $this->actingAs($this->admin())->getJson('/api/admin/cities');

        $response->assertOk()
            ->assertJsonPath('data.*.name', ['Casablanca', 'Mohammédia'])
            ->assertJsonPath('data.0.zone', ['id' => $zone->id, 'name' => 'Grand Casablanca']);
    }

    public function test_store_creates_a_city_in_a_zone_and_returns_201(): void
    {
        $zone = DeliveryZone::factory()->create(['name' => 'Nord']);

        $response = $this->actingAs($this->admin())->postJson('/api/admin/cities', [
            'name' => 'Tanger',
            'region' => 'Tanger-Tétouan-Al Hoceïma',
            'delivery_zone_id' => $zone->id,
            'is_active' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Tanger')
            ->assertJsonPath('data.zone', ['id' => $zone->id, 'name' => 'Nord']);
        $this->assertDatabaseHas('cities', ['name' => 'Tanger', 'delivery_zone_id' => $zone->id, 'is_active' => true]);
    }

    public function test_store_with_a_name_already_in_use_returns_422(): void
    {
        City::factory()->named('Tanger')->create();

        $response = $this->actingAs($this->admin())->postJson('/api/admin/cities', ['name' => 'Tanger']);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['name' => 'La valeur du champ nom est déjà utilisée.']);
        $this->assertDatabaseCount('cities', 1);
    }

    public function test_store_with_an_unknown_zone_returns_422(): void
    {
        $response = $this->actingAs($this->admin())->postJson('/api/admin/cities', ['name' => 'Tanger', 'delivery_zone_id' => 999]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['delivery_zone_id' => 'La valeur choisie pour zone de livraison n’est pas valide.']);
        $this->assertDatabaseCount('cities', 0);
    }

    public function test_update_keeps_its_own_name_available(): void
    {
        $city = City::factory()->named('Tanger')->create();

        $response = $this->actingAs($this->admin())->putJson("/api/admin/cities/{$city->id}", [
            'name' => 'Tanger',
            'region' => 'Nord',
            'is_active' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.region', 'Nord');
        $this->assertDatabaseHas('cities', ['id' => $city->id, 'name' => 'Tanger', 'region' => 'Nord']);
    }

    public function test_destroy_deletes_the_city_while_orders_keep_its_name(): void
    {
        $city = City::factory()->named('Tanger')->create();
        $order = Order::factory()->create(['city_id' => $city->id, 'city_name' => 'Tanger']);

        $response = $this->actingAs($this->admin())->deleteJson("/api/admin/cities/{$city->id}");

        $response->assertOk()
            ->assertExactJson(['message' => 'Ville supprimée.']);
        $this->assertModelMissing($city);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'city_id' => null, 'city_name' => 'Tanger']);
    }

    private function admin(): User
    {
        return User::factory()->admin()->create();
    }
}

<?php

namespace Tests\Feature\Http\Controllers\Api;

use App\Models\City;
use App\Models\DeliveryZone;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class DeliveryControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_cities_lists_only_active_cities_of_active_zones_with_their_zone_terms(): void
    {
        $casablanca = DeliveryZone::factory()->freeShippingFrom(100000)->create(['fee' => 2500, 'delivery_estimate' => '24 h']);
        $suspended = DeliveryZone::factory()->inactive()->create();
        $rabat = City::factory()->for($casablanca, 'zone')->named('Rabat')->create(['region' => 'Rabat-Salé-Kénitra', 'sort_order' => 2]);
        $casa = City::factory()->for($casablanca, 'zone')->named('Casablanca')->create(['region' => 'Casablanca-Settat', 'sort_order' => 1]);
        City::factory()->for($casablanca, 'zone')->inactive()->create();
        City::factory()->for($suspended, 'zone')->create();
        City::factory()->withoutZone()->create();

        $response = $this->getJson('/api/delivery/cities');

        $response->assertOk()
            ->assertExactJson(['data' => [
                ['id' => $casa->id, 'name' => 'Casablanca', 'region' => 'Casablanca-Settat', 'fee' => 2500, 'free_shipping_threshold' => 100000, 'estimate' => '24 h'],
                ['id' => $rabat->id, 'name' => 'Rabat', 'region' => 'Rabat-Salé-Kénitra', 'fee' => 2500, 'free_shipping_threshold' => 100000, 'estimate' => '24 h'],
            ]]);
    }
}

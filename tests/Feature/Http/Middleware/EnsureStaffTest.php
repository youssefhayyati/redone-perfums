<?php

namespace Tests\Feature\Http\Middleware;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class EnsureStaffTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_admin_api_returns_401_without_a_session(): void
    {
        $response = $this->getJson('/api/admin/me');

        $response->assertUnauthorized();
    }

    public function test_admin_api_returns_403_to_a_customer_session(): void
    {
        $customer = User::factory()->customer()->create();

        $response = $this->actingAs($customer)->getJson('/api/admin/me');

        $response->assertForbidden()
            ->assertJsonPath('message', 'Accès réservé à l’équipe.');
    }

    public function test_admin_api_returns_403_to_a_deactivated_staff_session(): void
    {
        $formerAdmin = User::factory()->admin()->inactive()->create();

        $response = $this->actingAs($formerAdmin)->getJson('/api/admin/me');

        $response->assertForbidden()
            ->assertJsonPath('message', 'Accès réservé à l’équipe.');
    }

    public function test_admin_api_lets_an_active_staff_member_through(): void
    {
        $support = User::factory()->support()->create();

        $response = $this->actingAs($support)->getJson('/api/admin/me');

        $response->assertOk()
            ->assertJsonPath('user.id', $support->id);
    }
}

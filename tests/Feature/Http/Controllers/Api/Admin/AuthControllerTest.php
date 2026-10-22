<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_staff_login_returns_the_role_and_its_permissions(): void
    {
        $this->freezeTime();
        $manager = User::factory()->manager()->create(['name' => 'Yasmine Alaoui', 'email' => 'yasmine@redone.ma']);

        $response = $this->fromAdminSpa()->postJson('/api/admin/login', [
            'email' => '  Yasmine@Redone.ma ',
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertExactJson(['user' => [
                'id' => $manager->id,
                'name' => 'Yasmine Alaoui',
                'email' => 'yasmine@redone.ma',
                'role' => 'manager',
                'role_label' => 'Gestionnaire',
                'permissions' => [
                    'view-dashboard', 'view-revenue', 'manage-catalog', 'manage-orders',
                    'view-customers', 'manage-promotions', 'manage-content',
                ],
            ]]);
        $this->assertAuthenticatedAs($manager, 'web');
        $this->assertSame(now()->toDateTimeString(), $manager->fresh()->last_login_at->toDateTimeString());
    }

    public function test_customer_credentials_are_refused_with_422(): void
    {
        $customer = User::factory()->customer()->create();

        $response = $this->fromAdminSpa()->postJson('/api/admin/login', [
            'email' => $customer->email,
            'password' => 'password',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'Identifiants incorrects.']);
        $this->assertGuest('web');
        $this->assertNull($customer->fresh()->last_login_at);
    }

    public function test_deactivated_staff_is_refused_with_422(): void
    {
        $formerManager = User::factory()->manager()->inactive()->create();

        $response = $this->fromAdminSpa()->postJson('/api/admin/login', [
            'email' => $formerManager->email,
            'password' => 'password',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'Identifiants incorrects.']);
        $this->assertGuest('web');
    }

    public function test_wrong_password_is_refused_with_422(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->fromAdminSpa()->postJson('/api/admin/login', [
            'email' => $admin->email,
            'password' => 'not-the-password',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'Identifiants incorrects.']);
        $this->assertGuest('web');
    }

    public function test_me_returns_the_signed_in_staff_member(): void
    {
        $support = User::factory()->support()->create(['name' => 'Karim Idrissi']);

        $response = $this->actingAs($support)->getJson('/api/admin/me');

        $response->assertOk()
            ->assertJsonPath('user.name', 'Karim Idrissi')
            ->assertJsonPath('user.role', 'support')
            ->assertJsonPath('user.role_label', 'Service client')
            ->assertJsonPath('user.permissions', ['view-dashboard', 'manage-orders', 'view-customers']);
    }

    public function test_logout_ends_the_staff_session(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->fromAdminSpa()->postJson('/api/admin/logout');

        $response->assertOk()
            ->assertJsonPath('message', 'Déconnecté.');
        $this->assertGuest('web');
    }

    /**
     * Session endpoints need a first-party (Sanctum stateful) request.
     */
    private function fromAdminSpa(): static
    {
        return $this->withHeader('Origin', 'http://localhost');
    }
}

<?php

namespace Tests\Feature\Http\Controllers\Api\Auth;

use App\Enums\UserRole;
use App\Models\Cart;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_register_creates_and_signs_in_the_customer_and_returns_201(): void
    {
        Event::fake([Registered::class]);

        $response = $this->fromStorefront()->postJson('/api/auth/register', [
            'name' => 'Salma Benali',
            'email' => ' Salma@Example.com ',
            'phone' => '06 12 34 56 78',
            'password' => 'Parfum2026',
            'password_confirmation' => 'Parfum2026',
        ]);

        $user = User::query()->where('email', 'salma@example.com')->sole();
        $response->assertCreated()
            ->assertExactJson(['user' => [
                'id' => $user->id,
                'name' => 'Salma Benali',
                'email' => 'salma@example.com',
                'phone' => '06 12 34 56 78',
            ]]);
        $this->assertSame('+212612345678', $user->phone);
        $this->assertSame(UserRole::Customer, $user->role);
        $this->assertTrue(Hash::check('Parfum2026', $user->password));
        $this->assertAuthenticatedAs($user, 'web');
        Event::assertDispatched(Registered::class, fn (Registered $event) => $event->user->is($user));
    }

    public function test_register_ignores_a_role_or_activation_flag_sent_by_the_client(): void
    {
        $response = $this->fromStorefront()->postJson('/api/auth/register', [
            'name' => 'Salma Benali',
            'email' => 'salma@example.com',
            'password' => 'Parfum2026',
            'password_confirmation' => 'Parfum2026',
            'role' => 'admin',
            'is_active' => false,
        ]);

        $response->assertCreated();
        $user = User::query()->where('email', 'salma@example.com')->sole();
        $this->assertSame(UserRole::Customer, $user->role);
        $this->assertTrue($user->is_active);
    }

    public function test_register_attaches_the_guest_cart_to_the_new_account(): void
    {
        $cart = Cart::create(['token' => (string) Str::uuid()]);

        $response = $this->fromStorefront()->withHeader('X-Cart-Token', $cart->token)->postJson('/api/auth/register', [
            'name' => 'Salma Benali',
            'email' => 'salma@example.com',
            'password' => 'Parfum2026',
            'password_confirmation' => 'Parfum2026',
        ]);

        $response->assertCreated();
        $this->assertSame($response->json('user.id'), $cart->fresh()->user_id);
    }

    public function test_register_with_an_email_already_in_use_returns_422(): void
    {
        User::factory()->create(['email' => 'salma@example.com']);

        $response = $this->fromStorefront()->postJson('/api/auth/register', [
            'name' => 'Salma Benali',
            'email' => 'Salma@Example.com',
            'password' => 'Parfum2026',
            'password_confirmation' => 'Parfum2026',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'Un compte existe déjà avec cette adresse e-mail.']);
        $this->assertDatabaseCount('users', 1);
        $this->assertGuest('web');
    }

    public function test_register_with_an_empty_form_returns_422_for_every_required_field(): void
    {
        $response = $this->fromStorefront()->postJson('/api/auth/register', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors([
                'name' => 'Le champ nom est obligatoire.',
                'email' => 'Le champ e-mail est obligatoire.',
                'password' => 'Le champ mot de passe est obligatoire.',
            ]);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_register_with_a_mismatched_confirmation_returns_422(): void
    {
        $response = $this->fromStorefront()->postJson('/api/auth/register', [
            'name' => 'Salma Benali',
            'email' => 'salma@example.com',
            'password' => 'Parfum2026',
            'password_confirmation' => 'Parfum2027',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['password' => 'Les deux mots de passe ne correspondent pas.']);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_login_signs_in_the_customer_and_attaches_the_guest_cart(): void
    {
        $this->freezeTime();
        $customer = User::factory()->customer()->withPhone('+212612345678')->create([
            'name' => 'Salma Benali',
            'email' => 'salma@example.com',
        ]);
        $cart = Cart::create(['token' => (string) Str::uuid()]);

        $response = $this->fromStorefront()->withHeader('X-Cart-Token', $cart->token)->postJson('/api/auth/login', [
            'email' => 'Salma@Example.com',
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertExactJson(['user' => [
                'id' => $customer->id,
                'name' => 'Salma Benali',
                'email' => 'salma@example.com',
                'phone' => '06 12 34 56 78',
            ]]);
        $this->assertAuthenticatedAs($customer, 'web');
        $this->assertSame($customer->id, $cart->fresh()->user_id);
        $this->assertSame(now()->toDateTimeString(), $customer->fresh()->last_login_at->toDateTimeString());
    }

    public function test_login_leaves_a_cart_owned_by_another_account_untouched(): void
    {
        $owner = User::factory()->customer()->create();
        $cart = Cart::create(['token' => (string) Str::uuid(), 'user_id' => $owner->id]);
        $intruder = User::factory()->customer()->create();

        $response = $this->fromStorefront()->withHeader('X-Cart-Token', $cart->token)->postJson('/api/auth/login', [
            'email' => $intruder->email,
            'password' => 'password',
        ]);

        $response->assertOk();
        $this->assertSame($owner->id, $cart->fresh()->user_id);
    }

    public function test_login_with_wrong_credentials_returns_422(): void
    {
        $customer = User::factory()->customer()->create();

        $response = $this->fromStorefront()->postJson('/api/auth/login', [
            'email' => $customer->email,
            'password' => 'not-the-password',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'Identifiants incorrects.']);
        $this->assertGuest('web');
    }

    public function test_staff_account_is_refused_on_the_storefront_with_422(): void
    {
        $manager = User::factory()->manager()->create();

        $response = $this->fromStorefront()->postJson('/api/auth/login', [
            'email' => $manager->email,
            'password' => 'password',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'Utilisez l’espace d’administration pour ce compte.']);
        $this->assertGuest('web');
        $this->assertNull($manager->fresh()->last_login_at);
    }

    public function test_deactivated_account_is_refused_with_422(): void
    {
        $customer = User::factory()->customer()->inactive()->create();

        $response = $this->fromStorefront()->postJson('/api/auth/login', [
            'email' => $customer->email,
            'password' => 'password',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'Identifiants incorrects.']);
        $this->assertGuest('web');
    }

    public function test_login_is_throttled_after_five_failed_attempts_with_429(): void
    {
        $customer = User::factory()->customer()->create();
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->fromStorefront()->postJson('/api/auth/login', ['email' => $customer->email, 'password' => 'guess-'.$attempt]);
        }

        $response = $this->fromStorefront()->postJson('/api/auth/login', ['email' => $customer->email, 'password' => 'password']);

        $response->assertTooManyRequests();
        $this->assertGuest('web');
    }

    public function test_logout_signs_the_customer_out(): void
    {
        $customer = User::factory()->customer()->create();

        $response = $this->actingAs($customer)->fromStorefront()->postJson('/api/auth/logout');

        $response->assertOk()
            ->assertJsonPath('message', 'Déconnecté.');
        $this->assertGuest('web');
    }

    public function test_logout_without_a_session_returns_401(): void
    {
        $response = $this->fromStorefront()->postJson('/api/auth/logout');

        $response->assertUnauthorized();
    }

    public function test_me_returns_the_signed_in_customer(): void
    {
        $customer = User::factory()->customer()->create(['name' => 'Salma Benali']);

        $response = $this->actingAs($customer)->getJson('/api/auth/me');

        $response->assertOk()
            ->assertJsonPath('user.id', $customer->id)
            ->assertJsonPath('user.name', 'Salma Benali');
    }

    public function test_me_returns_null_for_a_guest(): void
    {
        $response = $this->getJson('/api/auth/me');

        $response->assertOk()
            ->assertExactJson(['user' => null]);
    }

    public function test_me_returns_null_for_a_staff_account(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->getJson('/api/auth/me');

        $response->assertOk()
            ->assertExactJson(['user' => null]);
    }

    /**
     * Session endpoints need a first-party (Sanctum stateful) request.
     */
    private function fromStorefront(): static
    {
        return $this->withHeader('Origin', 'http://localhost');
    }
}

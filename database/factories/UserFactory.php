<?php

namespace Database\Factories;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'phone' => null,
            'role' => UserRole::Customer,
            'is_active' => true,
            'last_login_at' => null,
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * A storefront customer account (the default role).
     */
    public function customer(): static
    {
        return $this->role(UserRole::Customer);
    }

    /**
     * A staff member with every permission.
     */
    public function admin(): static
    {
        return $this->role(UserRole::Admin);
    }

    /**
     * A staff member running the catalog, orders, promotions and content.
     */
    public function manager(): static
    {
        return $this->role(UserRole::Manager);
    }

    /**
     * A customer-service staff member (orders and customers only).
     */
    public function support(): static
    {
        return $this->role(UserRole::Support);
    }

    public function role(UserRole $role): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => $role,
        ]);
    }

    /**
     * A deactivated account: it can no longer sign in.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * A Moroccan mobile number stored in E.164, as the application normalizes it.
     */
    public function withPhone(string $e164 = '+212612345678'): static
    {
        return $this->state(fn (array $attributes) => [
            'phone' => $e164,
        ]);
    }
}

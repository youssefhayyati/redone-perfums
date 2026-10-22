<?php

namespace Tests\Feature\Providers;

use App\Enums\Permission;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AppServiceProviderTest extends TestCase
{
    /**
     * Who may do what in the back office (docs/ARCHITECTURE.md, "Roles").
     */
    private const GRANTED = [
        'customer' => [],
        'support' => ['view-dashboard', 'manage-orders', 'view-customers'],
        'manager' => [
            'view-dashboard', 'view-revenue', 'manage-catalog', 'manage-orders',
            'view-customers', 'manage-promotions', 'manage-content',
        ],
        'admin' => [
            'view-dashboard', 'view-revenue', 'manage-catalog', 'manage-orders', 'view-customers',
            'manage-promotions', 'manage-content', 'manage-settings', 'manage-team',
        ],
    ];

    /**
     * @return array<string, array{UserRole, Permission, bool}>
     */
    public static function rolePermissionMatrix(): array
    {
        $cases = [];

        foreach (UserRole::cases() as $role) {
            foreach (Permission::cases() as $permission) {
                $granted = in_array($permission->value, self::GRANTED[$role->value], true);
                $cases["{$role->value} ".($granted ? 'may' : 'may not')." {$permission->value}"] = [$role, $permission, $granted];
            }
        }

        return $cases;
    }

    #[DataProvider('rolePermissionMatrix')]
    public function test_gate_grants_each_permission_only_to_the_roles_holding_it(UserRole $role, Permission $permission, bool $granted): void
    {
        $user = User::factory()->role($role)->make();

        $allowed = Gate::forUser($user)->allows($permission->value);

        $this->assertSame($granted, $allowed);
    }

    /**
     * @return array<string, array{UserRole}>
     */
    public static function staffRoles(): array
    {
        return [
            'support' => [UserRole::Support],
            'manager' => [UserRole::Manager],
            'admin' => [UserRole::Admin],
        ];
    }

    #[DataProvider('staffRoles')]
    public function test_gate_denies_every_permission_to_a_deactivated_staff_member(UserRole $role): void
    {
        $user = User::factory()->role($role)->inactive()->make();

        $allowed = array_values(array_filter(
            array_map(fn (Permission $permission) => $permission->value, Permission::cases()),
            fn (string $ability) => Gate::forUser($user)->allows($ability),
        ));

        $this->assertSame([], $allowed);
    }
}

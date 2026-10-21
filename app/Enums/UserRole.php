<?php

namespace App\Enums;

enum UserRole: string
{
    case Customer = 'customer';
    case Support = 'support';
    case Manager = 'manager';
    case Admin = 'admin';

    public function isStaff(): bool
    {
        return $this !== self::Customer;
    }

    /**
     * @return list<Permission>
     */
    public function permissions(): array
    {
        return match ($this) {
            self::Customer => [],
            self::Support => [
                Permission::ViewDashboard,
                Permission::ManageOrders,
                Permission::ViewCustomers,
            ],
            self::Manager => [
                Permission::ViewDashboard,
                Permission::ViewRevenue,
                Permission::ManageCatalog,
                Permission::ManageOrders,
                Permission::ViewCustomers,
                Permission::ManagePromotions,
                Permission::ManageContent,
            ],
            self::Admin => Permission::cases(),
        };
    }

    public function can(Permission $permission): bool
    {
        return in_array($permission, $this->permissions(), true);
    }

    public function label(): string
    {
        return match ($this) {
            self::Customer => 'Client',
            self::Support => 'Service client',
            self::Manager => 'Gestionnaire',
            self::Admin => 'Administrateur',
        };
    }

    /**
     * @return list<self>
     */
    public static function staff(): array
    {
        return [self::Support, self::Manager, self::Admin];
    }
}

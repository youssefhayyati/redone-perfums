<?php

namespace App\Enums;

/**
 * Each case is registered as a Gate ability of the same name.
 */
enum Permission: string
{
    case ViewDashboard = 'view-dashboard';
    case ViewRevenue = 'view-revenue';
    case ManageCatalog = 'manage-catalog';
    case ManageOrders = 'manage-orders';
    case ViewCustomers = 'view-customers';
    case ManagePromotions = 'manage-promotions';
    case ManageContent = 'manage-content';
    case ManageSettings = 'manage-settings';
    case ManageTeam = 'manage-team';
}

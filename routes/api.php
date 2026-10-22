<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\Admin;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\PasswordResetController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\CollectionController;
use App\Http\Controllers\Api\DeliveryController;
use App\Http\Controllers\Api\NewsletterController;
use App\Http\Controllers\Api\PackController;
use App\Http\Controllers\Api\PageController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\StorefrontController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Storefront
|--------------------------------------------------------------------------
*/

Route::get('storefront', [StorefrontController::class, 'config']);
Route::get('home', [StorefrontController::class, 'home']);

Route::get('products', [ProductController::class, 'index']);
Route::get('products/facets', [ProductController::class, 'facets']);
Route::get('products/{slug}', [ProductController::class, 'show']);

Route::get('collections', [CollectionController::class, 'index']);
Route::get('collections/{slug}', [CollectionController::class, 'show']);
Route::get('families', [CollectionController::class, 'families']);

Route::get('packs', [PackController::class, 'index']);
Route::get('packs/{slug}', [PackController::class, 'show']);
Route::post('packs/{slug}/quote', [PackController::class, 'quote'])->middleware('throttle:cart');

Route::get('pages/{slug}', [PageController::class, 'show']);
Route::get('delivery/cities', [DeliveryController::class, 'cities']);

Route::prefix('cart')->middleware('throttle:cart')->group(function () {
    Route::get('/', [CartController::class, 'show']);
    Route::post('items', [CartController::class, 'addItem']);
    Route::post('packs', [CartController::class, 'addPack']);
    Route::patch('items/{item}', [CartController::class, 'updateItem'])->whereNumber('item');
    Route::delete('items/{item}', [CartController::class, 'removeItem'])->whereNumber('item');
    Route::post('coupon', [CartController::class, 'applyCoupon']);
    Route::delete('coupon', [CartController::class, 'removeCoupon']);
});

Route::post('checkout', [CheckoutController::class, 'store'])->middleware('throttle:checkout');
Route::get('orders/{reference}', [CheckoutController::class, 'show'])->middleware('throttle:cart');

Route::post('newsletter', [NewsletterController::class, 'subscribe'])->middleware('throttle:newsletter');
Route::post('newsletter/unsubscribe', [NewsletterController::class, 'unsubscribe'])->middleware('throttle:newsletter');

/*
|--------------------------------------------------------------------------
| Customer accounts
|--------------------------------------------------------------------------
*/

Route::prefix('auth')->group(function () {
    Route::middleware('throttle:auth')->group(function () {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login', [AuthController::class, 'login']);
        Route::post('forgot-password', [PasswordResetController::class, 'sendLink']);
        Route::post('reset-password', [PasswordResetController::class, 'reset']);
    });
    Route::get('me', [AuthController::class, 'me']);
    Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
});

Route::prefix('account')->middleware('auth:sanctum')->group(function () {
    Route::get('orders', [AccountController::class, 'orders']);
    Route::get('orders/{reference}', [AccountController::class, 'order']);
    Route::put('profile', [AccountController::class, 'updateProfile']);
    Route::put('password', [AccountController::class, 'updatePassword'])->middleware('throttle:auth');
});

/*
|--------------------------------------------------------------------------
| Administration — no public registration; see `php artisan app:create-admin`.
|--------------------------------------------------------------------------
*/

Route::prefix('admin')->group(function () {
    Route::post('login', [Admin\AuthController::class, 'login'])->middleware('throttle:auth');

    Route::middleware(['auth:sanctum', 'staff'])->group(function () {
        Route::get('me', [Admin\AuthController::class, 'me']);
        Route::post('logout', [Admin\AuthController::class, 'logout']);

        Route::get('dashboard', Admin\DashboardController::class)->middleware('can:view-dashboard');

        Route::middleware('can:manage-catalog')->group(function () {
            Route::get('catalog/options', [Admin\ProductController::class, 'options']);
            Route::apiResource('products', Admin\ProductController::class);
            Route::post('products/{product}/restore', [Admin\ProductController::class, 'restore'])->withTrashed();
            Route::post('products/{product}/images', [Admin\ProductImageController::class, 'store'])->middleware('throttle:uploads');
            Route::put('products/{product}/images/order', [Admin\ProductImageController::class, 'reorder']);
            Route::patch('products/{product}/images/{image}', [Admin\ProductImageController::class, 'update'])->scopeBindings();
            Route::delete('products/{product}/images/{image}', [Admin\ProductImageController::class, 'destroy'])->scopeBindings();

            Route::apiResource('families', Admin\FamilyController::class)->except('show');
            Route::get('notes', [Admin\FamilyController::class, 'notes']);
            Route::get('notes/translations', [Admin\NoteController::class, 'index']);
            Route::put('notes/{note}', [Admin\NoteController::class, 'update']);

            Route::apiResource('collections', Admin\CollectionController::class);
            Route::apiResource('packs', Admin\PackController::class);

            Route::get('inventory', [Admin\InventoryController::class, 'index']);
            Route::get('inventory/{variant}/movements', [Admin\InventoryController::class, 'movements']);
            Route::post('inventory/{variant}/adjust', [Admin\InventoryController::class, 'adjust']);

            Route::post('uploads', [Admin\UploadController::class, 'store'])->middleware('throttle:uploads');
        });

        Route::middleware('can:manage-orders')->group(function () {
            Route::get('orders', [Admin\OrderController::class, 'index']);
            Route::get('orders/export', [Admin\OrderController::class, 'export']);
            Route::get('orders/slips', [Admin\OrderController::class, 'slips']);
            Route::get('orders/{order}', [Admin\OrderController::class, 'show']);
            Route::post('orders/{order}/status', [Admin\OrderController::class, 'updateStatus']);
            Route::post('orders/{order}/payment', [Admin\OrderController::class, 'updatePayment']);
            Route::patch('orders/{order}/delivery', [Admin\OrderController::class, 'updateDelivery']);
            Route::post('orders/{order}/notes', [Admin\OrderController::class, 'addNote']);
        });

        Route::middleware('can:view-customers')->group(function () {
            Route::get('customers', [Admin\CustomerController::class, 'index']);
            Route::get('customers/{customer}', [Admin\CustomerController::class, 'show']);
        });

        Route::middleware('can:manage-promotions')->group(function () {
            Route::apiResource('coupons', Admin\CouponController::class)->except('show');
        });

        Route::middleware('can:manage-content')->group(function () {
            Route::apiResource('pages', Admin\PageController::class)->except('show');
            Route::get('newsletter', [Admin\NewsletterController::class, 'index']);
        });

        Route::middleware('can:manage-settings')->group(function () {
            Route::get('settings', [Admin\SettingsController::class, 'show']);
            Route::put('settings', [Admin\SettingsController::class, 'update']);
            Route::apiResource('delivery-zones', Admin\DeliveryZoneController::class)->except('show');
            Route::get('cities', [Admin\CityController::class, 'index']);
            Route::post('cities', [Admin\CityController::class, 'store']);
            Route::put('cities/{city}', [Admin\CityController::class, 'update']);
            Route::delete('cities/{city}', [Admin\CityController::class, 'destroy']);
        });

        Route::middleware('can:manage-team')->group(function () {
            Route::get('team', [Admin\TeamController::class, 'index']);
            Route::post('team', [Admin\TeamController::class, 'store']);
            Route::put('team/{member}', [Admin\TeamController::class, 'update']);
        });
    });
});

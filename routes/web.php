<?php

use App\Http\Controllers\SpaController;
use Illuminate\Support\Facades\Route;

// Admin SPA (its own bundle and HTML shell). Every API call it makes is authorized
// server-side; this route only serves static HTML.
Route::get('/admin/{any?}', [SpaController::class, 'admin'])->where('any', '.*')->name('admin');

// Storefront SPA: every other path not handled by the API or static files.
Route::get('/{any?}', [SpaController::class, 'storefront'])
    ->where('any', '^(?!api/|sanctum/|storage/|build/|up$).*')
    ->name('storefront');

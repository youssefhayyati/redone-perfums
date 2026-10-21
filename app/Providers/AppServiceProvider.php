<?php

namespace App\Providers;

use App\Enums\Permission;
use App\Models\User;
use App\Services\Settings\StoreSettings;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->scoped(StoreSettings::class);
    }

    public function boot(): void
    {
        Model::shouldBeStrict(! $this->app->isProduction());

        foreach (Permission::cases() as $permission) {
            Gate::define($permission->value, fn (User $user) => $user->hasPermission($permission));
        }

        Password::defaults(fn () => $this->app->isProduction()
            ? Password::min(10)->letters()->numbers()->uncompromised()
            : Password::min(8)->letters()->numbers());

        ResetPassword::createUrlUsing(fn (User $user, string $token) => url('/compte/reinitialiser?'.http_build_query([
            'token' => $token,
            'email' => $user->email,
        ])));

        $this->configureRateLimiting();
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(120)->by($request->user()?->id ?: $request->ip()));

        RateLimiter::for('auth', fn (Request $request) => [
            Limit::perMinute(5)->by(mb_strtolower((string) $request->input('email')).'|'.$request->ip()),
            Limit::perMinute(20)->by($request->ip()),
        ]);

        RateLimiter::for('cart', fn (Request $request) => Limit::perMinute(60)->by($request->ip()));

        RateLimiter::for('checkout', fn (Request $request) => [
            Limit::perMinute(6)->by($request->ip()),
            Limit::perHour(30)->by($request->ip()),
        ]);

        RateLimiter::for('newsletter', fn (Request $request) => Limit::perMinute(3)->by($request->ip()));

        RateLimiter::for('uploads', fn (Request $request) => Limit::perMinute(30)->by($request->user()?->id ?: $request->ip()));
    }
}

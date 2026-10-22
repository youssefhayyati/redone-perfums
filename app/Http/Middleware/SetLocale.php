<?php

namespace App\Http\Middleware;

use App\Support\Locale;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * API requests from the Arabic and English storefronts carry `X-Locale: ar` or `en`.
 * Anything else (the admin, an unknown value, no header) stays in French. The browser's
 * Accept-Language is ignored: an admin whose browser speaks Arabic or English must still
 * receive the French admin data.
 */
class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->header('X-Locale');

        if (Locale::isSupported($locale)) {
            App::setLocale($locale);
        }

        return $next($request);
    }
}

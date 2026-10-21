<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Admin API entry gate: an authenticated, active staff account. Fine-grained
 * permissions are then checked per route with `can:` middleware.
 */
class EnsureStaff
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        abort_unless($user !== null && $user->isStaff(), 403, 'Accès réservé à l’équipe.');

        return $next($request);
    }
}

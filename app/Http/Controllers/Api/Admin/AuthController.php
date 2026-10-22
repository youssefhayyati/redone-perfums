<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\Permission;
use App\Http\Controllers\Api\Auth\AuthController as CustomerAuth;
use App\Http\Controllers\Controller;
use App\Http\Requests\Storefront\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $user = CustomerAuth::attemptCredentials($request);

        if (! $user->isStaff()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            // Same message as a wrong password: do not reveal which accounts exist.
            throw ValidationException::withMessages(['email' => 'Identifiants incorrects.']);
        }

        CustomerAuth::recordLogin($user);

        return response()->json(['user' => self::present($user)]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => self::present($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Déconnecté.']);
    }

    /**
     * @return array<string, mixed>
     */
    public static function present(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role->value,
            'role_label' => $user->role->label(),
            'permissions' => array_map(fn (Permission $p) => $p->value, $user->role->permissions()),
        ];
    }
}

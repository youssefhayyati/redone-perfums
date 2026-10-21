<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Storefront\LoginRequest;
use App\Http\Requests\Storefront\RegisterRequest;
use App\Models\User;
use App\Services\Cart\CartManager;
use App\Support\MoroccanPhone;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * Customer authentication for the storefront (Sanctum stateful session).
 */
class AuthController extends Controller
{
    public function __construct(private readonly CartManager $carts) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $user = new User([
            'name' => trim($request->string('name')),
            'email' => $request->string('email'),
            'phone' => MoroccanPhone::normalize($request->input('phone')),
            'password' => $request->string('password'),
        ]);
        $user->save();

        event(new Registered($user));

        Auth::guard('web')->login($user);
        $request->session()->regenerate();
        $this->claimCart($request, $user);

        return response()->json(['user' => self::present($user)], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = self::attemptCredentials($request);

        // Staff sign in through /admin, which keeps the two areas clearly separated.
        if ($user->role->isStaff()) {
            Auth::guard('web')->logout();
            throw ValidationException::withMessages(['email' => 'Utilisez l’espace d’administration pour ce compte.']);
        }

        $this->claimCart($request, $user);

        return response()->json(['user' => self::present($user)]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Déconnecté.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json(['user' => $user && ! $user->role->isStaff() ? self::present($user) : null]);
    }

    /**
     * Shared by the customer and admin login endpoints.
     */
    public static function attemptCredentials(Request $request): User
    {
        $credentials = ['email' => $request->string('email')->toString(), 'password' => $request->string('password')->toString()];

        if (! Auth::guard('web')->attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages(['email' => 'Identifiants incorrects.']);
        }

        /** @var User $user */
        $user = Auth::guard('web')->user();

        if (! $user->is_active) {
            Auth::guard('web')->logout();
            throw ValidationException::withMessages(['email' => 'Identifiants incorrects.']);
        }

        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()])->save();

        return $user;
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
            'phone' => $user->phone ? MoroccanPhone::format($user->phone) : null,
        ];
    }

    private function claimCart(Request $request, User $user): void
    {
        $cart = $this->carts->find($request->header('X-Cart-Token'));

        if ($cart !== null && $cart->user_id === null) {
            $cart->forceFill(['user_id' => $user->id])->save();
        }
    }
}

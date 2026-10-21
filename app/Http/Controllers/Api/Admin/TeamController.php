<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/**
 * Staff accounts. Roles are assigned explicitly here (never mass-assigned), and an
 * administrator cannot lock the store out by demoting or deactivating the last admin.
 */
class TeamController extends Controller
{
    public function index(): JsonResponse
    {
        $members = User::query()
            ->whereIn('role', array_map(fn ($r) => $r->value, UserRole::staff()))
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $members->map(fn (User $u) => $this->present($u)),
            'roles' => array_map(fn (UserRole $r) => ['value' => $r->value, 'label' => $r->label()], UserRole::staff()),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'role' => ['required', Rule::in(array_map(fn ($r) => $r->value, UserRole::staff()))],
            'password' => ['required', Password::defaults()],
        ]);

        $user = new User([
            'name' => $data['name'],
            'email' => mb_strtolower($data['email']),
            'password' => $data['password'],
        ]);
        $user->role = UserRole::from($data['role']);
        $user->is_active = true;
        $user->save();

        return response()->json(['data' => $this->present($user)], 201);
    }

    public function update(Request $request, User $member): JsonResponse
    {
        abort_unless($member->role->isStaff(), 404);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'role' => ['sometimes', Rule::in(array_map(fn ($r) => $r->value, UserRole::staff()))],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $isSelf = $member->is($request->user());
        $newRole = isset($data['role']) ? UserRole::from($data['role']) : $member->role;
        $newActive = $data['is_active'] ?? $member->is_active;

        if ($isSelf && ($newRole !== $member->role || ! $newActive)) {
            throw ValidationException::withMessages(['role' => 'Vous ne pouvez pas modifier votre propre rôle ni désactiver votre compte.']);
        }

        $losesAdmin = $member->role === UserRole::Admin && $member->is_active && ($newRole !== UserRole::Admin || ! $newActive);
        if ($losesAdmin && User::query()->where('role', UserRole::Admin)->where('is_active', true)->count() <= 1) {
            throw ValidationException::withMessages(['role' => 'La boutique doit conserver au moins un administrateur actif.']);
        }

        if (isset($data['name'])) {
            $member->name = $data['name'];
        }
        $member->role = $newRole;
        $member->is_active = $newActive;
        $member->save();

        return response()->json(['data' => $this->present($member)]);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role->value,
            'role_label' => $u->role->label(),
            'is_active' => $u->is_active,
            'last_login_at' => $u->last_login_at?->toIso8601String(),
        ];
    }
}

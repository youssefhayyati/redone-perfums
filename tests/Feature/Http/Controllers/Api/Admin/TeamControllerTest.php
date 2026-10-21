<?php

namespace Tests\Feature\Http\Controllers\Api\Admin;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class TeamControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_manager_gets_403_on_team_management(): void
    {
        $response = $this->actingAs(User::factory()->manager()->create())->getJson('/api/admin/team');

        $response->assertForbidden();
    }

    public function test_index_lists_staff_members_only_with_the_assignable_roles(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Amina Tazi']);
        $support = User::factory()->support()->create(['name' => 'Karim Idrissi']);
        User::factory()->customer()->create(['name' => 'Salma Benali']);

        $response = $this->actingAs($admin)->getJson('/api/admin/team');

        $response->assertOk()
            ->assertJsonPath('data.*.id', [$admin->id, $support->id])
            ->assertJsonPath('roles', [
                ['value' => 'support', 'label' => 'Service client'],
                ['value' => 'manager', 'label' => 'Gestionnaire'],
                ['value' => 'admin', 'label' => 'Administrateur'],
            ]);
    }

    public function test_admin_creates_a_staff_account_and_returns_201(): void
    {
        $response = $this->actingAs($this->admin())->postJson('/api/admin/team', [
            'name' => 'Karim Idrissi',
            'email' => 'Karim@Redone.ma',
            'role' => 'support',
            'password' => 'Parfum2026',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.email', 'karim@redone.ma')
            ->assertJsonPath('data.role', 'support')
            ->assertJsonPath('data.is_active', true);
        $member = User::query()->where('email', 'karim@redone.ma')->sole();
        $this->assertSame(UserRole::Support, $member->role);
        $this->assertTrue(Hash::check('Parfum2026', $member->password));
    }

    public function test_creating_a_customer_account_from_the_team_screen_returns_422(): void
    {
        $response = $this->actingAs($this->admin())->postJson('/api/admin/team', [
            'name' => 'Salma Benali',
            'email' => 'salma@example.com',
            'role' => 'customer',
            'password' => 'Parfum2026',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['role' => 'La valeur choisie pour rôle n’est pas valide.']);
        $this->assertDatabaseMissing('users', ['email' => 'salma@example.com']);
    }

    /**
     * @return array<string, array{array<string, mixed>}>
     */
    public static function changesToOneself(): array
    {
        return [
            'own role' => [['role' => 'manager']],
            'own deactivation' => [['is_active' => false]],
        ];
    }

    /**
     * @param  array<string, mixed>  $change
     */
    #[DataProvider('changesToOneself')]
    public function test_admin_cannot_demote_or_deactivate_themselves_422(array $change): void
    {
        $admin = $this->admin();
        User::factory()->admin()->create();

        $response = $this->actingAs($admin)->putJson("/api/admin/team/{$admin->id}", $change);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['role' => 'Vous ne pouvez pas modifier votre propre rôle ni désactiver votre compte.']);
        $this->assertSame(UserRole::Admin, $admin->fresh()->role);
        $this->assertTrue($admin->fresh()->is_active);
    }

    public function test_admin_can_rename_themselves(): void
    {
        $admin = $this->admin();

        $response = $this->actingAs($admin)->putJson("/api/admin/team/{$admin->id}", ['name' => 'Amina Tazi', 'role' => 'admin']);

        $response->assertOk()
            ->assertJsonPath('data.name', 'Amina Tazi');
        $this->assertSame('Amina Tazi', $admin->fresh()->name);
    }

    public function test_admin_demotes_another_admin_while_an_active_admin_remains(): void
    {
        $actor = $this->admin();
        $colleague = User::factory()->admin()->create();

        $response = $this->actingAs($actor)->putJson("/api/admin/team/{$colleague->id}", ['role' => 'manager']);

        $response->assertOk()
            ->assertJsonPath('data.role', 'manager');
        $this->assertSame(UserRole::Manager, $colleague->fresh()->role);
    }

    /**
     * @return array<string, array{array<string, mixed>}>
     */
    public static function changesRemovingTheLastAdmin(): array
    {
        return [
            'demotion' => [['role' => 'manager']],
            'deactivation' => [['is_active' => false]],
        ];
    }

    /**
     * Under the current permissions the acting admin always counts as an active admin,
     * so this guard only triggers when the actor's account changed after the request was
     * authenticated (here: deactivated by someone else in the meantime).
     *
     * @param  array<string, mixed>  $change
     */
    #[DataProvider('changesRemovingTheLastAdmin')]
    public function test_last_active_admin_cannot_be_demoted_or_deactivated_422(array $change): void
    {
        $actor = $this->admin();
        $lastAdmin = User::factory()->admin()->create();
        User::query()->whereKey($actor->id)->update(['is_active' => false]);

        $response = $this->actingAs($actor)->putJson("/api/admin/team/{$lastAdmin->id}", $change);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['role' => 'La boutique doit conserver au moins un administrateur actif.']);
        $this->assertSame(UserRole::Admin, $lastAdmin->fresh()->role);
        $this->assertTrue($lastAdmin->fresh()->is_active);
    }

    public function test_customer_account_cannot_be_edited_from_the_team_screen_404(): void
    {
        $customer = User::factory()->customer()->create();

        $response = $this->actingAs($this->admin())->putJson("/api/admin/team/{$customer->id}", ['role' => 'admin']);

        $response->assertNotFound();
        $this->assertSame(UserRole::Customer, $customer->fresh()->role);
    }

    private function admin(): User
    {
        return User::factory()->admin()->create();
    }
}

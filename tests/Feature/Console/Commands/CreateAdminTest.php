<?php

namespace Tests\Feature\Console\Commands;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class CreateAdminTest extends TestCase
{
    use LazilyRefreshDatabase;

    private const PASSWORD_QUESTION = 'Mot de passe (10 caractères minimum, lettres et chiffres)';

    private const CONFIRMATION_QUESTION = 'Confirmez le mot de passe';

    public function test_creates_an_active_verified_administrator(): void
    {
        $this->freezeTime();

        $this->artisan('app:create-admin', ['--name' => 'Amina Tazi', '--email' => ' Amina@Redone.ma '])
            ->expectsQuestion(self::PASSWORD_QUESTION, 'MaisonRedone2026')
            ->expectsQuestion(self::CONFIRMATION_QUESTION, 'MaisonRedone2026')
            ->expectsOutput('Compte créé : amina@redone.ma (Administrateur).')
            ->assertSuccessful();

        $admin = User::query()->where('email', 'amina@redone.ma')->sole();
        $this->assertSame('Amina Tazi', $admin->name);
        $this->assertSame(UserRole::Admin, $admin->role);
        $this->assertTrue($admin->is_active);
        $this->assertSame(now()->toDateTimeString(), $admin->email_verified_at->toDateTimeString());
        $this->assertTrue(Hash::check('MaisonRedone2026', $admin->password));
    }

    public function test_promotes_an_existing_account_to_the_requested_staff_role(): void
    {
        $existing = User::factory()->customer()->inactive()->create(['name' => 'Karim', 'email' => 'karim@redone.ma']);

        $this->artisan('app:create-admin', ['--name' => 'Karim Idrissi', '--email' => 'karim@redone.ma', '--role' => 'support'])
            ->expectsQuestion(self::PASSWORD_QUESTION, 'ServiceClient2026')
            ->expectsQuestion(self::CONFIRMATION_QUESTION, 'ServiceClient2026')
            ->expectsOutput('Compte mis à jour : karim@redone.ma (Service client).')
            ->assertSuccessful();

        $existing->refresh();
        $this->assertDatabaseCount('users', 1);
        $this->assertSame('Karim Idrissi', $existing->name);
        $this->assertSame(UserRole::Support, $existing->role);
        $this->assertTrue($existing->is_active);
        $this->assertTrue(Hash::check('ServiceClient2026', $existing->password));
    }

    /**
     * @return array<string, array{string, string, string}>
     */
    public static function rejectedPasswords(): array
    {
        return [
            'without a digit' => ['motdepassefaible', 'motdepassefaible', 'Le champ mot de passe doit contenir au moins un chiffre.'],
            'shorter than 10 characters' => ['court2026', 'court2026', 'Le champ mot de passe doit contenir au moins 10 caractères.'],
            'confirmation mismatch' => ['MaisonRedone2026', 'MaisonRedone2027', 'Les deux mots de passe ne correspondent pas.'],
        ];
    }

    #[DataProvider('rejectedPasswords')]
    public function test_rejects_a_weak_or_unconfirmed_password_and_creates_nothing(string $password, string $confirmation, string $message): void
    {
        $this->artisan('app:create-admin', ['--name' => 'Amina Tazi', '--email' => 'amina@redone.ma'])
            ->expectsQuestion(self::PASSWORD_QUESTION, $password)
            ->expectsQuestion(self::CONFIRMATION_QUESTION, $confirmation)
            ->expectsOutput($message)
            ->assertFailed();

        $this->assertDatabaseCount('users', 0);
    }

    #[TestWith(['customer'])]
    #[TestWith(['superuser'])]
    public function test_rejects_a_role_that_is_not_a_staff_role(string $role): void
    {
        $this->artisan('app:create-admin', ['--name' => 'Amina Tazi', '--email' => 'amina@redone.ma', '--role' => $role])
            ->expectsOutput('Rôle invalide : admin, manager ou support.')
            ->assertFailed();

        $this->assertDatabaseCount('users', 0);
    }
}

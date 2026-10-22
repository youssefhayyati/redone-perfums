<?php

namespace Tests\Feature\Http\Controllers\Api\Auth;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    private const SAME_ANSWER = 'Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé.';

    public function test_forgot_password_sends_a_reset_link_to_the_storefront_page(): void
    {
        $user = User::factory()->create(['email' => 'salma@example.com']);
        Notification::fake();

        $response = $this->postJson('/api/auth/forgot-password', ['email' => ' Salma@Example.com ']);

        $response->assertOk()
            ->assertExactJson(['message' => self::SAME_ANSWER]);
        Notification::assertSentTo($user, ResetPassword::class);
        $notification = Notification::sent($user, ResetPassword::class)->sole();
        $this->assertStringEndsWith(
            '/compte/reinitialiser?token='.$notification->token.'&email=salma%40example.com',
            $notification->toMail($user)->actionUrl,
        );
    }

    public function test_forgot_password_from_the_arabic_storefront_links_to_the_arabic_page(): void
    {
        $user = User::factory()->create(['email' => 'salma@example.com']);
        Notification::fake();

        $response = $this->withHeader('X-Locale', 'ar')->postJson('/api/auth/forgot-password', ['email' => 'salma@example.com']);

        $response->assertOk()
            ->assertExactJson(['message' => 'إذا كان هناك حساب مرتبط بهذا البريد، فقد أرسلنا إليه رابطًا لإعادة تعيين كلمة المرور.']);
        $notification = Notification::sent($user, ResetPassword::class)->sole();
        $this->assertStringContainsString('/ar/compte/reinitialiser?token=', $notification->toMail($user)->actionUrl);
    }

    public function test_forgot_password_from_the_english_storefront_links_to_the_english_page(): void
    {
        $user = User::factory()->create(['email' => 'salma@example.com']);
        Notification::fake();

        $response = $this->withHeader('X-Locale', 'en')->postJson('/api/auth/forgot-password', ['email' => 'salma@example.com']);

        $response->assertOk()
            ->assertExactJson(['message' => 'If an account exists for this address, a reset link has just been sent to it.']);
        $notification = Notification::sent($user, ResetPassword::class)->sole();
        $this->assertStringContainsString('/en/compte/reinitialiser?token=', $notification->toMail($user)->actionUrl);
    }

    public function test_english_forgot_password_never_reveals_whether_an_account_exists(): void
    {
        Notification::fake();

        $response = $this->withHeader('X-Locale', 'en')->postJson('/api/auth/forgot-password', ['email' => 'inconnu@example.com']);

        $response->assertOk()
            ->assertExactJson(['message' => 'If an account exists for this address, a reset link has just been sent to it.']);
        Notification::assertNothingSent();
    }

    public function test_forgot_password_gives_the_same_answer_for_an_unknown_address_and_sends_nothing(): void
    {
        User::factory()->create(['email' => 'salma@example.com']);
        Notification::fake();

        $response = $this->postJson('/api/auth/forgot-password', ['email' => 'inconnu@example.com']);

        $response->assertOk()
            ->assertExactJson(['message' => self::SAME_ANSWER]);
        Notification::assertNothingSent();
    }

    public function test_reset_with_a_valid_token_changes_the_password(): void
    {
        $user = User::factory()->create(['email' => 'salma@example.com']);
        $previousRememberToken = $user->remember_token;
        $token = Password::createToken($user);
        Event::fake([PasswordReset::class]);

        $response = $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => 'Salma@Example.com',
            'password' => 'NouveauParfum2026',
            'password_confirmation' => 'NouveauParfum2026',
        ]);

        $response->assertOk()
            ->assertExactJson(['message' => 'Votre mot de passe a été modifié. Vous pouvez vous connecter.']);
        $user->refresh();
        $this->assertTrue(Hash::check('NouveauParfum2026', $user->password));
        $this->assertNotSame($previousRememberToken, $user->remember_token);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'salma@example.com']);
        Event::assertDispatched(PasswordReset::class, fn (PasswordReset $event) => $event->user->is($user));
    }

    public function test_reset_with_an_invalid_token_returns_422_and_keeps_the_password(): void
    {
        $user = User::factory()->create(['email' => 'salma@example.com']);
        Password::createToken($user);

        $response = $this->postJson('/api/auth/reset-password', [
            'token' => 'not-the-token',
            'email' => 'salma@example.com',
            'password' => 'NouveauParfum2026',
            'password_confirmation' => 'NouveauParfum2026',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'Ce lien n’est plus valide. Demandez-en un nouveau.']);
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_reset_with_a_token_older_than_an_hour_returns_422(): void
    {
        $user = User::factory()->create(['email' => 'salma@example.com']);
        $token = Password::createToken($user);
        $this->travel(61)->minutes();

        $response = $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => 'salma@example.com',
            'password' => 'NouveauParfum2026',
            'password_confirmation' => 'NouveauParfum2026',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'Ce lien n’est plus valide. Demandez-en un nouveau.']);
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }
}

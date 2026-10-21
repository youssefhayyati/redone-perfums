<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

/**
 * The only way to create the first administrator: there is no public admin
 * registration and no seeded admin password.
 */
#[Signature('app:create-admin {--name= : Full name} {--email= : Login e-mail} {--role=admin : admin, manager or support}')]
#[Description('Create (or promote) a staff account for the admin dashboard')]
class CreateAdmin extends Command
{
    public function handle(): int
    {
        $name = $this->option('name') ?: $this->ask('Nom complet');
        $email = mb_strtolower(trim((string) ($this->option('email') ?: $this->ask('E-mail de connexion'))));
        $role = UserRole::tryFrom((string) $this->option('role'));

        if ($role === null || ! $role->isStaff()) {
            $this->error('Rôle invalide : admin, manager ou support.');

            return self::FAILURE;
        }

        $existing = User::where('email', $email)->first();

        $password = $this->secret('Mot de passe (10 caractères minimum, lettres et chiffres)');
        $confirmation = $this->secret('Confirmez le mot de passe');

        $validator = Validator::make(
            ['name' => $name, 'email' => $email, 'password' => $password, 'password_confirmation' => $confirmation],
            [
                'name' => ['required', 'string', 'max:120'],
                'email' => ['required', 'email'],
                'password' => ['required', 'confirmed', Password::min(10)->letters()->numbers()],
            ],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        $user = $existing ?? new User;
        $user->fill(['name' => $name, 'email' => $email, 'password' => $password]);
        $user->role = $role;
        $user->is_active = true;
        $user->email_verified_at ??= now();
        $user->save();

        $this->info(($existing ? 'Compte mis à jour' : 'Compte créé')." : {$email} ({$role->label()}).");
        $this->line('Connexion : '.url('/admin/connexion'));

        return self::SUCCESS;
    }
}

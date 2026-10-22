#!/bin/sh
# Runs in the `setup` container each time the stack starts, before the app, queue and
# scheduler: installs Composer packages when composer.lock changed, makes sure APP_KEY
# is set, then migrates (and seeds the demo content when the database is brand new).
set -e

lock_hash=$(md5sum composer.lock | cut -d ' ' -f 1)
if [ ! -f vendor/autoload.php ] || [ "$(cat vendor/.lock-hash 2>/dev/null)" != "$lock_hash" ]; then
    composer install --no-interaction --prefer-dist
    echo "$lock_hash" > vendor/.lock-hash
fi

if ! grep -Eq '^APP_KEY=.+' .env; then
    php artisan key:generate --no-interaction
fi

# A cached config would keep the .env database host and ignore the container's.
php artisan config:clear --no-interaction

if php artisan migrate:status --no-interaction > /dev/null 2>&1; then
    php artisan migrate --force --no-interaction
else
    php artisan migrate --force --seed --no-interaction
fi

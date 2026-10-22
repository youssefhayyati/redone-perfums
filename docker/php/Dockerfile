# PHP runtime for local development. The code is mounted from the host (see
# docker-compose.yml), so this image only holds PHP, its extensions and Composer.
FROM php:8.5-fpm-alpine

# Match the host user on Linux so files written in the mounted project stay editable.
# Docker Desktop (Windows, macOS) maps ownership itself and can keep the defaults.
ARG UID=1000
ARG GID=1000

# gd (JPEG, PNG, WebP): ImageProcessor re-encodes every upload into WebP variants.
# pcntl: queue workers and `artisan pail`. intl, bcmath, zip: framework and Composer.
RUN apk add --no-cache git unzip freetype icu-libs libjpeg-turbo libpng libwebp libzip \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS shadow \
        freetype-dev icu-dev libjpeg-turbo-dev libpng-dev libwebp-dev libzip-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j"$(nproc)" bcmath gd intl pcntl pdo_mysql zip \
    && groupmod -o -g "$GID" www-data \
    && usermod -o -u "$UID" -g "$GID" www-data \
    && apk del .build-deps

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

RUN cp "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini"
COPY php.ini "$PHP_INI_DIR/conf.d/zz-app.ini"

ENV COMPOSER_HOME=/tmp/composer

# The vendor volume (docker-compose.yml) takes this folder's owner when first created.
RUN mkdir -p /var/www/html/vendor && chown www-data:www-data /var/www/html/vendor

WORKDIR /var/www/html

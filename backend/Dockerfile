FROM php:8.3-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
        unzip \
        git \
        libzip-dev \
    && docker-php-ext-install pdo pdo_mysql sockets \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY composer.json ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-progress

COPY . .

EXPOSE 8080 8081

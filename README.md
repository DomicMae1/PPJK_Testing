# How to running laravel project

## 1. Clone repository

```bash
git clone https://github.com/Fantocaa/tako-customer-review.git
cd tako-customer-review
```

## 2. Install Composer & NPM

```bash
composer install
```

```bash
npm install
```

## 3. Copy .env

```bash
cp .env.example .env
```

## 4. Make APP key on env

```bash
php artisan key:generate
```

## 5. Artisan migrate database

### new database (user)

```bash
php artisan migrate --database=tako-user --path=database/migrations/user
```

### exist database

```bash
php artisan migrate:fresh --database=tako-user --path=database/migrations/user
```

<!-- ### new database (tenants)

```bash
php artisan tenants:migrate
```

### exist database

```bash
php artisan tenants:migrate-fresh
``` -->

## 6. Make a Seeder

```bash
php artisan db:seed
```

## 7. Running Laravel (backend)

```bash
php artisan serve
```

## 8. Running Frontend

```bash
npm run dev
```

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

### make new database (user)

```bash
php artisan migrate --database=tako-user --path=database/migrations/user
```

### refresh database

```bash
php artisan migrate:fresh --database=tako-user --path=database/migrations/user
```

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

## 9. Running Notification

```bash
php artisan reverb:start --debug
```

## 10. If u want to update all database

### remove all database

```bash
php artisan db:drop-all
```

```bash
php artisan migrate --database=tako-user --path=database/migrations/user
```

```bash
php artisan db:seed
```

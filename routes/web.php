<?php

use App\Http\Controllers\CustomerController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
    Route::get('customer/share', [CustomerController::class, 'share'])->name('customer.share');
    Route::resource('customer', CustomerController::class);

    Route::resource('users', UserController::class);
    Route::resource('role-manager', RoleController::class);
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';

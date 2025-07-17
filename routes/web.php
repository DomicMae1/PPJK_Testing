<?php

use App\Http\Controllers\CustomerController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserNoteController;
use App\Models\CustomerAttach;
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
    Route::resource('customer-attachments', CustomerAttach::class);
    // web.php
    Route::get('/customer/{id}/pdf', [CustomerController::class, 'generatePdf'])->name('customer.pdf');

    Route::resource('users', UserController::class);
    Route::resource('role-manager', RoleController::class);
});

Route::post('customer/upload-temp', [CustomerController::class, 'upload'])->name('customer.upload');
Route::get('/form/{token}', [CustomerController::class, 'showPublicForm'])->name('customer.form.show');
Route::post('/form/{token}', [CustomerController::class, 'submitPublicForm'])->name('customer.form.submit');
require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';

<?php

use App\Http\Controllers\CustomerAttachController;
use App\Http\Controllers\CustomerLinkController;
use App\Http\Controllers\CustomersStatusController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\PerusahaanController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SecureFileController;
use App\Http\Controllers\UserController;
use App\Models\Customers_Status;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\FileController;
use App\Http\Controllers\ShippingController;
use App\Http\Controllers\NotificationController;
use App\Services\NotificationService;

Route::get('/', function () {
    // return Inertia::render('welcome');
    return redirect('shipping');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return redirect('shipping');
    });

    Route::resource('customer', CustomerController::class);
    Route::resource('shipping', ShippingController::class);
    Route::resource('users', UserController::class);
    Route::resource('role-manager', RoleController::class);
    Route::resource('perusahaan', PerusahaanController::class);

    Route::post('shipping/section-reminder', [ShippingController::class, 'sectionReminder'])->name('shipping.sectionReminder');
    Route::post('shipping/{id}/update-hs-codes', [ShippingController::class, 'updateHsCodes'])
        ->name('shipping.update-hs-codes');
    Route::post('shipping/upload-temp', [ShippingController::class, 'upload'])->name('shipping.upload');
    
    // Notification routes
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unreadCount');
    Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.markAsRead');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.markAllAsRead');
});

Route::get('/file/view/{path}', [FileController::class, 'view'])->middleware('auth')
    ->where('path', '.*') 
    ->name('file.view');

Route::get('/shipping/{path}', [FileController::class, 'view'])
    ->where('path', '.*') 
    ->name('file.view');    

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';

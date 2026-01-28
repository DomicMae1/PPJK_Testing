<?php

use App\Http\Controllers\CustomerAttachController;
use App\Http\Controllers\CustomerLinkController;
use App\Http\Controllers\CustomersStatusController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DocumentController;
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
use Illuminate\Support\Facades\Session;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;

Route::get('/', function () {
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
    Route::resource('document', DocumentController::class);

    Route::post('shipping/process-attachment', [ShippingController::class, 'processAttachment'])->name('customer.process-attachment');
    Route::post('shipping/{id}/update-hs-codes', [ShippingController::class, 'updateHsCodes'])
        ->name('shipping.update-hs-codes');
    Route::post('shipping/upload-temp', [ShippingController::class, 'upload'])->name('shipping.upload');
    Route::post('shipping/update-deadline', [ShippingController::class, 'updateSectionDeadline'])->name('shipping.updateDeadline');
    Route::post('shipping/{id}/verify', [ShippingController::class, 'verifyDocument'])->name('shipping.verify');
    Route::post('shipping/{id}/reject', [ShippingController::class, 'rejectDocument'])->name('shipping.reject');
    Route::post('shipping/batch-verify', [ShippingController::class, 'batchVerifyDocuments'])->name('shipping.batchVerify');
    
    // Notification routes
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unreadCount');
    Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.markAsRead');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.markAllAsRead');

    Route::post('document/upload-temp', [DocumentController::class, 'upload'])->name('document.upload');
});

Route::get('/file/view/{path}', [FileController::class, 'view'])->middleware('auth')
    ->where('path', '.*') 
    ->name('file.view');

Route::get('/shipping/{path}', [FileController::class, 'view'])
    ->where('path', '.*') 
    ->name('file.view');    

Route::get('lang/{locale}', function ($locale) {
    if (in_array($locale, ['en', 'id'])) {
        Session::put('locale', $locale);
    }
    return redirect()->back();
})->name('switch.language');

Route::middleware([
    'web',
    \Stancl\Tenancy\Middleware\InitializeTenancyByDomain::class, // Middleware Wajib
    \Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains::class,
])->group(function () {
    
    Route::get('/cek-tenant', function () {
        return response()->json([
            'status' => 'Tenant Aktif',
            'tenant_id' => tenant('id'), // Mengambil ID dari context tenant
            'domain' => request()->getHost(),
            'database_connected' => DB::connection()->getDatabaseName(), // Cek nama DB
            'storage_path' => storage_path(), // Cek apakah path storage berubah
        ]);
    });

});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';

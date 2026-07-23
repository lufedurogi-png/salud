<?php

use App\Http\Controllers\Api\V1\Admin\AdminAuthController;
use App\Http\Controllers\Api\V1\Admin\AdminClientesController;
use App\Http\Controllers\Api\V1\Admin\AdminMetodoPagoController;
use App\Http\Controllers\Api\V1\Admin\AdminPlanController;
use App\Http\Controllers\Api\V1\Admin\AdminStatsController;
use App\Http\Controllers\Api\V1\Admin\AdminStoreDiscountController;
use App\Http\Controllers\Api\V1\Admin\ManagerUserController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Client\ClientCheckoutController;
use App\Http\Controllers\Api\V1\Client\ClientController;
use App\Http\Controllers\Api\V1\MetodoPagoController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/token', [AuthController::class, 'generateToken']);
    });

    Route::prefix('admin/auth')->group(function () {
        Route::post('/register', [AdminAuthController::class, 'register']);
        Route::post('/token', [AdminAuthController::class, 'token']);
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/profile', [AuthController::class, 'profile']);
        Route::put('/auth/profile/update', [AuthController::class, 'updateProfile']);
        Route::put('/auth/password', [AuthController::class, 'changePassword']);
        Route::post('/auth/revoke-tokens', [AuthController::class, 'revokeTokens']);

        Route::middleware('role:customer|admin')->group(function () {
            Route::get('/metodos-pago', [MetodoPagoController::class, 'index']);
        });

        Route::middleware('role:customer')->prefix('client')->group(function () {
            Route::get('/home', [ClientController::class, 'home']);
            Route::get('/week', [ClientController::class, 'week']);
            Route::get('/routine', [ClientController::class, 'routine']);
            Route::post('/routine/{weekday}/completion', [ClientController::class, 'markRoutineDay']);
            Route::post('/routine/date/{date}/completion', [ClientController::class, 'markRoutineSession']);
            Route::put('/routine/date/{date}/comment', [ClientController::class, 'saveRoutineComment']);
            Route::put('/routine/comments/{commentId}', [ClientController::class, 'updateRoutineComment']);
            Route::delete('/routine/comments/{commentId}', [ClientController::class, 'deleteRoutineComment']);
            Route::get('/store/plans', [ClientController::class, 'storePlans']);
            Route::get('/store/discount', [ClientController::class, 'storeDiscount']);
            Route::post('/store/purchase', [ClientController::class, 'buyPlan']);
            Route::post('/store/checkout', [ClientCheckoutController::class, 'createCheckout']);
            Route::post('/store/add-days', [ClientCheckoutController::class, 'addDays']);
            Route::post('/store/paypal/capture', [ClientCheckoutController::class, 'paypalCapture']);
            Route::post('/store/mercadopago/confirm', [ClientCheckoutController::class, 'mercadoPagoConfirm']);
            Route::get('/profile', [ClientController::class, 'profile']);
            Route::post('/profile/avatar', [ClientController::class, 'uploadAvatar']);
            Route::put('/profile/alias', [ClientController::class, 'updateAlias']);
        });

        Route::middleware('role:admin')->prefix('admin')->group(function () {
            Route::get('/stats/actividad-usuarios', [AdminStatsController::class, 'actividadUsuarios']);
            Route::get('/stats/ranking', [AdminStatsController::class, 'ranking']);

            Route::get('/tipos-usuario', [ManagerUserController::class, 'getTypesUser']);
            Route::get('/permisos', [ManagerUserController::class, 'getPermissions']);
            Route::get('/usuarios', [ManagerUserController::class, 'index']);
            Route::post('/usuarios', [ManagerUserController::class, 'store']);
            Route::put('/usuarios/{usuarioId}', [ManagerUserController::class, 'update']);
            Route::delete('/usuarios/{usuarioId}', [ManagerUserController::class, 'destroy']);
            Route::put('/usuarios/{usuarioId}/rol', [ManagerUserController::class, 'setRole']);
            Route::delete('/usuarios/{usuarioId}/rol', [ManagerUserController::class, 'removeRole']);
            Route::put('/usuarios/{usuarioId}/password', [ManagerUserController::class, 'resetPassword']);
            Route::post('/usuarios/{usuarioId}/permisos', [ManagerUserController::class, 'grantPermission']);
            Route::post('/usuarios/{usuarioId}/permisos/revocar', [ManagerUserController::class, 'revokePermission']);

            Route::get('/metodos-pago', [AdminMetodoPagoController::class, 'index']);
            Route::put('/metodos-pago/{codigo}', [AdminMetodoPagoController::class, 'update']);

            Route::get('/store-discounts/search', [AdminStoreDiscountController::class, 'searchClients']);
            Route::get('/store-discounts/{userId}', [AdminStoreDiscountController::class, 'show']);
            Route::put('/store-discounts/{userId}', [AdminStoreDiscountController::class, 'upsert']);
            Route::delete('/store-discounts/{userId}', [AdminStoreDiscountController::class, 'destroy']);

            Route::get('/clientes', [AdminClientesController::class, 'index']);
            Route::put('/clientes/{userId}/profile', [AdminClientesController::class, 'updateProfile']);
            Route::put('/clientes/{userId}/plan', [AdminClientesController::class, 'updatePlan']);
            Route::put('/clientes/{userId}/routine/{weekday}', [AdminClientesController::class, 'upsertRoutineDay']);
            Route::put('/clientes/{userId}/routine-session/{date}', [AdminClientesController::class, 'upsertRoutineSession']);

            Route::get('/planes', [AdminPlanController::class, 'index']);
            Route::post('/planes', [AdminPlanController::class, 'store']);
            Route::put('/planes/{planId}', [AdminPlanController::class, 'update']);
            Route::delete('/planes/{planId}', [AdminPlanController::class, 'destroy']);
        });
    });
});

<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\MissionController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::prefix('v1')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('users/me', [UserController::class, 'me']);
        Route::put('users/me', [UserController::class, 'updateProfile']);
        Route::get('users/invite-code', [UserController::class, 'getInviteCode']);
        Route::post('users/bind-partner', [UserController::class, 'bindPartner']);
        Route::get('users/partner', [UserController::class, 'getPartner']);
        Route::get('users/by-openid/{openid}', [UserController::class, 'getByOpenid']);
        Route::apiResource('missions', MissionController::class);
        Route::post('missions/{mission}/complete', [MissionController::class, 'complete']);
        Route::post('missions/{mission}/star', [MissionController::class, 'toggleStar']);
        Route::apiResource('items', ItemController::class)->only(['index', 'show', 'store', 'destroy']);
        Route::post('items/{item}/star', [ItemController::class, 'toggleStar']);
        Route::apiResource('orders', OrderController::class)->only(['index', 'show', 'store', 'destroy']);
        Route::post('orders/{order}/use', [OrderController::class, 'use']);
        Route::post('orders/{order}/star', [OrderController::class, 'toggleStar']);
        Route::post('notifications/subscribe-status', [NotificationController::class, 'updateStatus']);
    });
});

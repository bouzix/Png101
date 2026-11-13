<?php

use App\Http\Controllers\InstallController;
use App\Http\Controllers\UpdateController;
use App\Http\Middleware\HostingOnlyMiddleware;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Hosting-Only Installer & Updater Routes
|--------------------------------------------------------------------------
| Registered outside the default "web" middleware group so /install works
| cleanly before .env, APP_KEY, sessions, or database tables exist.
| Protected by HostingOnlyMiddleware so local dev is never interrupted.
*/

Route::middleware([HostingOnlyMiddleware::class])->group(function () {
    Route::get('/install', [InstallController::class, 'index'])->name('installer.index');
    Route::post('/install/test-db', [InstallController::class, 'testDb'])->name('installer.test-db');
    Route::post('/install/run', [InstallController::class, 'run'])->name('installer.run');

    Route::get('/update', [UpdateController::class, 'index'])->name('updater.index');
    Route::post('/update/auth', [UpdateController::class, 'authenticate'])->name('updater.auth');
    Route::post('/update/logout', [UpdateController::class, 'logout'])->name('updater.logout');
    Route::post('/update/check-remote', [UpdateController::class, 'checkRemote'])->name('updater.check-remote');
    Route::post('/update/run', [UpdateController::class, 'run'])->name('updater.run');
});


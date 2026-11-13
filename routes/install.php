<?php

use App\Http\Controllers\InstallController;
use App\Http\Middleware\HostingOnlyMiddleware;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Hosting-Only Installer Routes
|--------------------------------------------------------------------------
| Registered outside the default "web" middleware group so /install works
| cleanly before .env, APP_KEY, sessions, or database tables exist.
| Protected by HostingOnlyMiddleware so local dev is never interrupted.
| Once installed, only the logged-in Super Admin can view /install;
| everyone else receives HTTP 403 Forbidden.
*/

Route::middleware([HostingOnlyMiddleware::class])->group(function () {
    Route::get('/install', [InstallController::class, 'index'])->name('installer.index');
    Route::post('/install/test-db', [InstallController::class, 'testDb'])->name('installer.test-db');
    Route::post('/install/run', [InstallController::class, 'run'])->name('installer.run');
});


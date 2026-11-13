<?php

namespace App\Http\Middleware;

use App\Services\ErrorPagesService;
use App\Services\TeamService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class MaintenanceModeMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $path = '/' . ltrim($request->path(), '/');
        $config = ErrorPagesService::get();
        $isMaintenanceActive = !empty($config['maintenance']['enabled']);

        if ($isMaintenanceActive) {
            $isExempt =
                str_starts_with($path, '/admin') ||
                str_starts_with($path, '/team') ||
                str_starts_with($path, '/api') ||
                str_starts_with($path, '/uploads') ||
                $path === '/maintenance';

            if (!$isExempt) {
                return redirect('/maintenance');
            }
        } else {
            if ($path === '/maintenance') {
                $session = TeamService::getCurrentSession($request);
                if (($session['role'] ?? null) !== 'super_admin') {
                    return redirect('/');
                }
            }
        }

        return $next($request);
    }
}


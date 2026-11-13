<?php

namespace App\Http\Middleware;

use App\Services\TeamService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminAuthMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $session = TeamService::getCurrentSession($request);

        if (empty($session['authenticated'])) {
            return redirect('/admin');
        }

        $path = '/' . ltrim($request->path(), '/');
        if (
            (str_starts_with($path, '/admin/dashboard/team') ||
             str_starts_with($path, '/admin/dashboard/settings/team')) &&
            ($session['role'] ?? null) !== 'super_admin'
        ) {
            return redirect('/admin/dashboard');
        }

        return $next($request);
    }
}


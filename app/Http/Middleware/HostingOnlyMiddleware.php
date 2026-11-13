<?php

namespace App\Http\Middleware;

use App\Support\HostingEnvironment;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class HostingOnlyMiddleware
{
    /**
     * Block access to /install and /update on local development environments
     * so they never interfere with local work.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (HostingEnvironment::isLocal($request)) {
            if ($request->expectsJson() || $request->isMethod('POST')) {
                return response()->json([
                    'ok' => false,
                    'message' => 'Installer and Updater are disabled in local development and only run when hosted.',
                ], 403);
            }

            return response()->view('installer.local-disabled', [
                'host' => $request->getHost(),
                'env' => app()->environment(),
                'path' => '/' . ltrim($request->path(), '/'),
            ], 403);
        }

        return $next($request);
    }
}


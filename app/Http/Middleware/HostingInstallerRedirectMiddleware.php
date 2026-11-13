<?php

namespace App\Http\Middleware;

use App\Support\HostingEnvironment;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class HostingInstallerRedirectMiddleware
{
    /**
     * On remote hosting ONLY, send visitors to /install before setup completes
     * instead of letting missing .env/tables throw raw 500 errors.
     * Completely inactive in local development.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (HostingEnvironment::isLocal($request)) {
            return $next($request);
        }

        if (HostingEnvironment::isInstalled()) {
            return $next($request);
        }

        if (
            $request->is('install', 'install/*', 'up')
            || $request->is('api/*')
        ) {
            return $next($request);
        }

        if (!HostingEnvironment::databaseLooksReady()) {
            return redirect('/install');
        }

        return $next($request);
    }
}


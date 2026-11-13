<?php

namespace App\Http\Middleware;

use App\Services\CodeInjectionService;
use App\Services\TeamService;
use App\Services\WebsiteInfoService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'websiteInfo' => fn () => WebsiteInfoService::get(),
            'codeInjection' => fn () => CodeInjectionService::get(),
            'auth' => fn () => TeamService::getCurrentSession($request),
        ]);
    }
}


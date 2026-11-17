<?php

namespace App\Http\Middleware;

use App\Services\CodeInjectionService;
use App\Services\ConverterToolsService;
use App\Services\EditorSettingsService;
use App\Services\ImageProcessingService;
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
            'colorPickerDefaults' => fn () => WebsiteInfoService::getColorPickerDefaults(),
            'codeInjection' => fn () => CodeInjectionService::get(),
            'auth' => fn () => TeamService::getCurrentSession($request),
            'bonusToolsNav' => fn () => ConverterToolsService::getPublicUiFlags(),
            'editorNav' => fn () => EditorSettingsService::getPublicFlags(),
            'uploadLimits' => fn () => str_starts_with($request->path(), 'admin')
                ? ImageProcessingService::getUploadLimits()
                : null,
        ]);
    }
}


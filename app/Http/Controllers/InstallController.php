<?php

namespace App\Http\Controllers;

use App\Services\InstallerService;
use App\Services\WebsiteInfoService;
use App\Support\HostingEnvironment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class InstallController extends Controller
{
    public function index(Request $request): Response
    {
        if (HostingEnvironment::isInstalled()) {
            return response()->view('installer.install', [
                'alreadyInstalled' => true,
                'installedState' => HostingEnvironment::readInstalledState(),
                'requirements' => InstallerService::getRequirements(),
                'csrfToken' => '',
                'defaults' => [],
                'appVersion' => HostingEnvironment::getAppVersion(),
            ]);
        }

        $defaults = WebsiteInfoService::defaults();

        return response()->view('installer.install', [
            'alreadyInstalled' => false,
            'installedState' => [],
            'requirements' => InstallerService::getRequirements(),
            'csrfToken' => InstallerService::issueCsrfToken('install'),
            'appVersion' => HostingEnvironment::getAppVersion(),
            'defaults' => [
                'app_name' => 'Png101',
                'app_url' => HostingEnvironment::detectAppUrl($request),
                'tagline' => $defaults['tagline'],
                'company_name' => $defaults['companyName'],
                'contact_email' => $defaults['contactEmail'],
                'dmca_email' => $defaults['dmcaEmail'],
                'db_host' => 'localhost',
                'db_port' => '3306',
                'db_database' => '',
                'db_username' => '',
            ],
        ]);
    }

    public function testDb(Request $request): JsonResponse
    {
        if (HostingEnvironment::isInstalled()) {
            return response()->json(['ok' => false, 'message' => 'Application is already installed.'], 403);
        }

        $token = $request->header('X-Installer-Token') ?: $request->input('_token');
        if (!InstallerService::verifyCsrfToken('install', is_string($token) ? $token : null)) {
            return response()->json(['ok' => false, 'message' => 'Invalid or expired security token. Please refresh the page.'], 419);
        }

        $result = InstallerService::testDatabaseConnection($request->only([
            'db_host',
            'db_port',
            'db_database',
            'db_username',
            'db_password',
        ]));

        return response()->json($result, $result['ok'] ? 200 : 422);
    }

    public function run(Request $request): JsonResponse
    {
        if (HostingEnvironment::isInstalled()) {
            return response()->json(['ok' => false, 'message' => 'Installer is locked because the application is already installed.'], 403);
        }

        $token = $request->header('X-Installer-Token') ?: $request->input('_token');
        if (!InstallerService::verifyCsrfToken('install', is_string($token) ? $token : null)) {
            return response()->json(['ok' => false, 'message' => 'Invalid or expired security token. Please refresh the page.'], 419);
        }

        $adminPassword = (string) $request->input('admin_password', '');
        $confirmPassword = (string) $request->input('admin_password_confirm', '');

        if (strlen($adminPassword) < 8) {
            return response()->json(['ok' => false, 'message' => 'Super Admin password must be at least 8 characters.'], 422);
        }

        if ($adminPassword !== $confirmPassword) {
            return response()->json(['ok' => false, 'message' => 'Super Admin password confirmation does not match.'], 422);
        }

        $result = InstallerService::runInstall($request->all(), $request);

        return response()->json($result, $result['ok'] ? 200 : 422);
    }
}


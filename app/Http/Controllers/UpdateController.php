<?php

namespace App\Http\Controllers;

use App\Services\InstallerService;
use App\Support\HostingEnvironment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class UpdateController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        if (!HostingEnvironment::isInstalled() && !HostingEnvironment::databaseLooksReady()) {
            return redirect('/install');
        }

        $authenticated = InstallerService::isAuthenticatedForUpdate($request);

        return response()->view('installer.update', [
            'authenticated' => $authenticated,
            'csrfToken' => InstallerService::issueCsrfToken('update'),
            'diagnostics' => $authenticated ? InstallerService::getUpdateDiagnostics() : null,
            'appVersion' => HostingEnvironment::getAppVersion(),
        ]);
    }

    public function authenticate(Request $request): JsonResponse
    {
        $token = $request->header('X-Updater-Token') ?: $request->input('_token');
        if (!InstallerService::verifyCsrfToken('update', is_string($token) ? $token : null)) {
            return response()->json(['ok' => false, 'message' => 'Invalid security token. Please refresh the page.'], 419);
        }

        $password = (string) $request->input('password', '');
        if (!InstallerService::verifyAdminOrUpdateSecret($password)) {
            return response()->json(['ok' => false, 'message' => 'Invalid Super Admin password or update secret.'], 401);
        }

        $authToken = InstallerService::issueUpdaterAuthToken();

        return response()->json(['ok' => true])
            ->cookie(
                InstallerService::UPDATER_COOKIE,
                $authToken,
                120,
                '/',
                null,
                $request->isSecure(),
                true,
                false,
                'lax'
            );
    }

    public function logout(): JsonResponse
    {
        InstallerService::revokeUpdaterAuthToken();

        return response()->json(['ok' => true])
            ->withoutCookie(InstallerService::UPDATER_COOKIE);
    }

    public function checkRemote(Request $request): JsonResponse
    {
        if (!InstallerService::isAuthenticatedForUpdate($request)) {
            return response()->json(['ok' => false, 'message' => 'Unauthorized'], 401);
        }

        $token = $request->header('X-Updater-Token') ?: $request->input('_token');
        if (!InstallerService::verifyCsrfToken('update', is_string($token) ? $token : null)) {
            return response()->json(['ok' => false, 'message' => 'Invalid security token. Please refresh.'], 419);
        }

        return response()->json(InstallerService::fetchGitRemoteStatus());
    }

    public function run(Request $request): JsonResponse
    {
        if (!InstallerService::isAuthenticatedForUpdate($request)) {
            return response()->json(['ok' => false, 'message' => 'Unauthorized'], 401);
        }

        $token = $request->header('X-Updater-Token') ?: $request->input('_token');
        if (!InstallerService::verifyCsrfToken('update', is_string($token) ? $token : null)) {
            return response()->json(['ok' => false, 'message' => 'Invalid security token. Please refresh.'], 419);
        }

        $result = InstallerService::runUpdate($request->only([
            'pull_git',
            'run_migrations',
            'refresh_caches',
            'regen_seo',
            'maintenance_mode',
        ]));

        return response()->json($result, $result['ok'] ? 200 : 422);
    }
}


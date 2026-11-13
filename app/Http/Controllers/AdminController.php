<?php

namespace App\Http\Controllers;

use App\Models\ApiKey;
use App\Models\Image;
use App\Models\Setting;
use App\Services\CodeInjectionService;
use App\Services\ErrorPagesService;
use App\Services\SeoGeneratorService;
use App\Services\TeamService;
use App\Services\WebsiteInfoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    private function checkPermission(Request $request, string $permission): ?Response
    {
        $session = TeamService::getCurrentSession($request);
        if (!TeamService::hasPermission($session, $permission)) {
            return Inertia::render('Errors/Forbidden');
        }
        return null;
    }

    // --- Inertia Admin Pages ---

    public function dashboard(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'upload')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Dashboard');
    }

    public function files(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'files')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Files');
    }

    public function categories(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'categories')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Categories');
    }

    public function collections(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'collections')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Collections');
    }

    public function analytics(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'analytics')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Analytics');
    }

    public function team(Request $request): Response
    {
        $session = TeamService::getCurrentSession($request);
        if (($session['role'] ?? '') !== 'super_admin') {
            return Inertia::render('Errors/Forbidden');
        }
        return Inertia::render('Admin/Team');
    }

    public function settings(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'settings')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Settings/Index');
    }

    public function apiKeys(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'settings')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Settings/ApiKeys');
    }

    public function codeInjection(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'settings')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Settings/CodeInjection');
    }

    public function dataManagement(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'settings')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Settings/DataManagement');
    }

    public function errorPages(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'settings')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Settings/ErrorPages');
    }

    public function settingsTeam(Request $request): Response
    {
        $session = TeamService::getCurrentSession($request);
        if (($session['role'] ?? '') !== 'super_admin') {
            return Inertia::render('Errors/Forbidden');
        }
        return Inertia::render('Admin/Settings/Team');
    }

    public function websiteInfo(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'settings')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Settings/WebsiteInfo');
    }

    // --- Admin API Endpoints ---

    public function getSettings(): JsonResponse
    {
        try {
            $settings = Setting::all();
            $map = [];
            foreach ($settings as $s) {
                $map[$s->key] = $s->value;
            }
            return response()->json((object) $map);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to fetch settings'], 500);
        }
    }

    public function saveSettings(Request $request): JsonResponse
    {
        try {
            $body = $request->all();
            foreach ($body as $key => $value) {
                Setting::updateOrCreate(
                    ['key' => (string) $key],
                    ['value' => (string) $value]
                );
            }
            return response()->json(['success' => true]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to save settings'], 500);
        }
    }

    public function listApiKeys(): JsonResponse
    {
        try {
            $keys = ApiKey::orderBy('createdAt', 'desc')->get();
            return response()->json($keys);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to fetch API keys'], 500);
        }
    }

    public function createApiKey(Request $request): JsonResponse
    {
        try {
            $name = trim((string) $request->input('name', ''));
            $key = trim((string) $request->input('key', ''));
            $modelVersion = trim((string) $request->input('modelVersion', 'gemini-2.5-flash'));
            $isActive = (bool) $request->input('isActive', false);

            if ($name === '' || $key === '') {
                return response()->json(['error' => 'Name and API key are required'], 400);
            }

            if ($isActive) {
                ApiKey::where('isActive', true)->update(['isActive' => false]);
            }

            $created = ApiKey::create([
                'name' => $name,
                'key' => $key,
                'modelVersion' => $modelVersion ?: 'gemini-2.5-flash',
                'isActive' => $isActive,
            ]);

            return response()->json($created, 201);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to create API key'], 500);
        }
    }

    public function updateApiKey(Request $request, string $id): JsonResponse
    {
        try {
            $apiKey = ApiKey::find($id);
            if (!$apiKey) {
                return response()->json(['error' => 'API key not found'], 404);
            }

            $isActive = $request->has('isActive') ? (bool) $request->input('isActive') : $apiKey->isActive;
            if ($isActive && !$apiKey->isActive) {
                ApiKey::where('isActive', true)->update(['isActive' => false]);
            }

            $apiKey->update([
                'name' => $request->has('name') ? trim((string) $request->input('name')) : $apiKey->name,
                'key' => $request->has('key') ? trim((string) $request->input('key')) : $apiKey->key,
                'modelVersion' => $request->has('modelVersion') ? trim((string) $request->input('modelVersion')) : $apiKey->modelVersion,
                'isActive' => $isActive,
            ]);

            return response()->json($apiKey);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to update API key'], 500);
        }
    }

    public function deleteApiKey(string $id): JsonResponse
    {
        try {
            ApiKey::where('id', $id)->delete();
            return response()->json(['success' => true]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to delete API key'], 500);
        }
    }

    public function getCodeInjection(): JsonResponse
    {
        return response()->json(CodeInjectionService::get());
    }

    public function saveCodeInjection(Request $request): JsonResponse
    {
        try {
            $saved = CodeInjectionService::save($request->all());
            return response()->json(['success' => true, 'data' => $saved]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to save code injection settings'], 500);
        }
    }

    public function getWebsiteInfo(): JsonResponse
    {
        return response()->json(WebsiteInfoService::get());
    }

    public function saveWebsiteInfo(Request $request): JsonResponse
    {
        try {
            $saved = WebsiteInfoService::save($request->all());
            return response()->json(['success' => true, 'data' => $saved]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to save website info'], 500);
        }
    }

    public function getErrorPages(): JsonResponse
    {
        return response()->json(ErrorPagesService::get());
    }

    public function saveErrorPages(Request $request): JsonResponse
    {
        try {
            $saved = ErrorPagesService::save($request->all());
            return response()->json(['success' => true, 'data' => $saved]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to save error pages'], 500);
        }
    }

    public function getSeoSettings(): JsonResponse
    {
        try {
            SeoGeneratorService::checkScheduled();
            return response()->json(SeoGeneratorService::getSettings());
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to fetch SEO settings'], 500);
        }
    }

    public function saveOrGenerateSeo(Request $request): JsonResponse
    {
        try {
            $body = $request->all();
            if (($body['action'] ?? null) === 'generate') {
                if (!empty($body['settings']) && is_array($body['settings'])) {
                    SeoGeneratorService::saveSettings($body['settings']);
                }
                $updated = SeoGeneratorService::generateAll('manual');
                return response()->json(['success' => true, 'data' => $updated]);
            }

            $saved = SeoGeneratorService::saveSettings($body);
            return response()->json(['success' => true, 'data' => $saved]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to process SEO request'], 500);
        }
    }

    public function getContrastTemplates(): JsonResponse
    {
        try {
            $settings = Setting::whereIn('key', [
                'custom_contrast_templates_light',
                'custom_contrast_templates_dark',
            ])->get()->keyBy('key');

            $lightCustoms = $this->normalizeContrastTemplates(json_decode($settings->get('custom_contrast_templates_light')?->value ?? '[]', true));
            $darkCustoms = $this->normalizeContrastTemplates(json_decode($settings->get('custom_contrast_templates_dark')?->value ?? '[]', true));

            return response()->json([
                'lightCustoms' => $lightCustoms,
                'darkCustoms' => $darkCustoms,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to fetch contrast templates'], 500);
        }
    }

    public function saveContrastTemplates(Request $request): JsonResponse
    {
        try {
            $type = $request->input('type');
            $action = $request->input('action');
            $color = strtolower(trim((string) $request->input('color', '')));
            $name = trim((string) $request->input('name', ''));

            if (!in_array($type, ['light', 'dark'], true)) {
                return response()->json(['error' => 'Invalid type (must be light or dark)'], 400);
            }

            $key = $type === 'light' ? 'custom_contrast_templates_light' : 'custom_contrast_templates_dark';
            $setting = Setting::where('key', $key)->first();
            $list = $this->normalizeContrastTemplates(json_decode($setting?->value ?? '[]', true));

            if ($action === 'add') {
                if (!preg_match('/^#[0-9a-f]{3,8}$/i', $color)) {
                    return response()->json(['error' => 'Invalid hex color'], 400);
                }
                foreach ($list as $item) {
                    if ($item['color'] === $color) {
                        return response()->json(['error' => 'A template with this color already exists', 'list' => $list], 400);
                    }
                }
                if (count($list) >= 3) {
                    return response()->json(['error' => 'Maximum of 3 custom templates allowed. Please delete one before adding a new template.'], 400);
                }
                $templateName = $name !== '' ? mb_substr($name, 0, 24) : strtoupper($color);
                $list[] = ['name' => $templateName, 'color' => $color];
            } elseif ($action === 'remove' || $action === 'delete') {
                $list = array_values(array_filter($list, fn($item) => $item['color'] !== $color));
            } else {
                return response()->json(['error' => 'Invalid action'], 400);
            }

            Setting::updateOrCreate(['key' => $key], ['value' => json_encode($list)]);

            return response()->json(['success' => true, 'list' => $list]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to update contrast templates'], 500);
        }
    }

    private function normalizeContrastTemplates($raw): array
    {
        if (!is_array($raw)) {
            return [];
        }
        $out = [];
        foreach ($raw as $item) {
            if (is_string($item)) {
                $color = strtolower(trim($item));
                $name = strtoupper($color);
            } elseif (is_array($item) && !empty($item['color'])) {
                $color = strtolower(trim((string) $item['color']));
                $name = trim((string) ($item['name'] ?? strtoupper($color)));
            } else {
                continue;
            }
            if (preg_match('/^#[0-9a-f]{3,8}$/i', $color)) {
                $out[] = ['name' => $name, 'color' => $color];
            }
            if (count($out) >= 3) {
                break;
            }
        }
        return $out;
    }

    public function getTeam(Request $request): JsonResponse
    {
        $session = TeamService::getCurrentSession($request);
        if (!$session['authenticated'] || ($session['role'] ?? '') !== 'super_admin') {
            return response()->json(['error' => 'Forbidden: Only the Super Admin can manage team members.'], 403);
        }

        return response()->json([
            'members' => TeamService::getAllMembers(),
            'availablePermissions' => TeamService::PERMISSIONS,
            'smtp' => TeamService::getSmtpConfig(),
        ]);
    }

    public function createTeamMember(Request $request): JsonResponse
    {
        $session = TeamService::getCurrentSession($request);
        if (!$session['authenticated'] || ($session['role'] ?? '') !== 'super_admin') {
            return response()->json(['error' => 'Forbidden: Only the Super Admin can add team members.'], 403);
        }

        try {
            $email = trim((string) $request->input('email', ''));
            $password = trim((string) $request->input('password', ''));
            $name = trim((string) $request->input('name', ''));
            $permissions = $request->input('permissions', []);
            $sendInvite = (bool) $request->input('sendInvite', true);

            if ($email === '') {
                return response()->json(['error' => 'Email is required.'], 400);
            }
            if (strlen($password) < 4) {
                return response()->json(['error' => 'Password must be at least 4 characters.'], 400);
            }
            if (TeamService::getMemberByEmail($email)) {
                return response()->json(['error' => 'A team member with this email already exists.'], 409);
            }

            $created = TeamService::createMember([
                'name' => $name ?: explode('@', $email)[0],
                'email' => $email,
                'passwordPlain' => $password,
                'permissions' => is_array($permissions) ? array_map('strval', $permissions) : [],
            ]);

            $loginUrl = $request->getSchemeAndHttpHost() . '/team/login';
            $emailResult = null;
            if ($sendInvite) {
                $emailResult = TeamService::sendTeamInviteEmail([
                    'name' => $created['name'],
                    'email' => $created['email'],
                    'passwordPlain' => $password,
                    'permissions' => $created['permissions'],
                    'loginUrl' => $loginUrl,
                ]);
            }

            return response()->json([
                'success' => true,
                'member' => $created,
                'loginUrl' => $loginUrl,
                'emailResult' => $emailResult,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage() ?: 'Failed to create team member.'], 500);
        }
    }

    public function updateTeam(Request $request): JsonResponse
    {
        $session = TeamService::getCurrentSession($request);
        if (!$session['authenticated'] || ($session['role'] ?? '') !== 'super_admin') {
            return response()->json(['error' => 'Forbidden: Only the Super Admin can update team settings.'], 403);
        }

        try {
            $action = $request->input('action');

            if ($action === 'save_smtp') {
                TeamService::saveSmtpConfig([
                    'host' => trim((string) $request->input('host', '')),
                    'port' => (int) $request->input('port', 587),
                    'secure' => (bool) $request->input('secure', false),
                    'user' => trim((string) $request->input('user', '')),
                    'pass' => (string) $request->input('pass', ''),
                    'fromEmail' => trim((string) $request->input('fromEmail', 'noreply@png101.com')),
                    'fromName' => trim((string) $request->input('fromName', 'Png101 Admin')),
                ]);
                return response()->json(['success' => true]);
            }

            if ($action === 'resend_invite') {
                $id = (string) $request->input('id', '');
                $password = trim((string) $request->input('password', ''));
                if ($id === '' || $password === '') {
                    return response()->json(['error' => 'Member ID and password are required to send invite.'], 400);
                }
                $updated = TeamService::updateMember($id, ['passwordPlain' => $password]);
                if (!$updated) {
                    return response()->json(['error' => 'Team member not found.'], 404);
                }

                $loginUrl = $request->getSchemeAndHttpHost() . '/team/login';
                $emailResult = TeamService::sendTeamInviteEmail([
                    'name' => $updated['name'],
                    'email' => $updated['email'],
                    'passwordPlain' => $password,
                    'permissions' => $updated['permissions'],
                    'loginUrl' => $loginUrl,
                ]);

                return response()->json([
                    'success' => true,
                    'member' => $updated,
                    'loginUrl' => $loginUrl,
                    'emailResult' => $emailResult,
                ]);
            }

            $id = (string) $request->input('id', '');
            if ($id === '') {
                return response()->json(['error' => 'Member ID is required.'], 400);
            }
            $existing = TeamService::getMemberById($id);
            if (!$existing) {
                return response()->json(['error' => 'Team member not found.'], 404);
            }

            $updateData = [];
            if ($request->has('name')) $updateData['name'] = (string) $request->input('name');
            if ($request->has('email')) $updateData['email'] = (string) $request->input('email');
            if ($request->filled('password')) $updateData['passwordPlain'] = trim((string) $request->input('password'));
            if (is_array($request->input('permissions'))) $updateData['permissions'] = array_map('strval', $request->input('permissions'));
            if ($request->has('isActive')) $updateData['isActive'] = (bool) $request->input('isActive');

            $updated = TeamService::updateMember($id, $updateData);

            return response()->json([
                'success' => true,
                'member' => $updated,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage() ?: 'Failed to update team member.'], 500);
        }
    }

    public function deleteTeamMember(Request $request): JsonResponse
    {
        $session = TeamService::getCurrentSession($request);
        if (!$session['authenticated'] || ($session['role'] ?? '') !== 'super_admin') {
            return response()->json(['error' => 'Forbidden: Only the Super Admin can delete team members.'], 403);
        }

        try {
            $id = (string) $request->query('id', '');
            if ($id === '') {
                return response()->json(['error' => 'Member ID is required.'], 400);
            }
            TeamService::deleteMember($id);
            return response()->json(['success' => true]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage() ?: 'Failed to delete team member.'], 500);
        }
    }

    public function clearDb(): JsonResponse
    {
        try {
            Image::query()->delete();
            return response()->json(['success' => true]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false], 500);
        }
    }

    public function clearUploads(): JsonResponse
    {
        try {
            $uploadDir = public_path('uploads');
            if (File::exists($uploadDir)) {
                File::cleanDirectory($uploadDir);
            }
            return response()->json(['success' => true]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'error' => 'Failed to clear uploads'], 500);
        }
    }
}

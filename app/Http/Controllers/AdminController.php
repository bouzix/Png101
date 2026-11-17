<?php

namespace App\Http\Controllers;

use App\Models\ApiKey;
use App\Models\Image;
use App\Models\SearchLog;
use App\Models\Setting;
use App\Services\CaptchaService;
use App\Services\CodeInjectionService;
use App\Services\ConverterToolsService;
use App\Services\ErrorPagesService;
use App\Services\InstallerService;
use App\Services\LegalPagesService;
use App\Services\SeoGeneratorService;
use App\Services\SliderSettingsService;
use App\Services\SystemHealthService;
use App\Services\TeamService;
use App\Services\TrashService;
use App\Services\WebsiteInfoService;
use App\Support\HostingEnvironment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Process;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    private function checkPermission(Request $request, string|array $permissions): ?Response
    {
        $session = TeamService::getCurrentSession($request);
        if (!TeamService::hasAnyPermission($session, (array) $permissions)) {
            return Inertia::render('Errors/Forbidden');
        }
        return null;
    }

    private function authorizeApi(Request $request, string|array $permissions): ?JsonResponse
    {
        $session = TeamService::getCurrentSession($request);
        if (!TeamService::hasAnyPermission($session, (array) $permissions)) {
            return response()->json(['error' => 'Forbidden: Missing required permission.'], 403);
        }
        return null;
    }

    // --- Inertia Admin Pages ---

    public function teamWorkspace(Request $request): Response
    {
        $session = TeamService::getCurrentSession($request);
        if (!$session['authenticated']) {
            return Inertia::render('Errors/Forbidden');
        }
        return Inertia::render('Admin/Workspace');
    }

    public function dashboard(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'upload_images')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Dashboard');
    }

    public function files(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, ['upload_images', 'edit_images', 'delete_images'])) {
            return $forbidden;
        }
        return Inertia::render('Admin/Files');
    }

    public function categories(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'manage_collections')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Categories');
    }

    public function collections(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'manage_collections')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Collections');
    }

    public function analytics(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'view_analytics')) {
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
        if ($forbidden = $this->checkPermission($request, 'manage_general_settings')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Settings/Index');
    }

    public function apiKeys(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'manage_api_keys')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Settings/ApiKeys');
    }

    public function codeInjection(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'manage_code_injection')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Settings/CodeInjection');
    }

    public function dataManagement(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'manage_data_seo')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Settings/DataManagement');
    }

    public function errorPages(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'manage_general_settings')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Settings/ErrorPages');
    }

    public function legalPages(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'manage_general_settings')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Settings/LegalPages', [
            'initialConfig' => LegalPagesService::get(),
            'defaults' => LegalPagesService::defaults(),
        ]);
    }

    public function getLegalPages(Request $request): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_general_settings')) {
            return $forbidden;
        }
        return response()->json([
            'legalPages' => LegalPagesService::get(),
            'defaults' => LegalPagesService::defaults(),
        ]);
    }

    public function saveLegalPages(Request $request): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_general_settings')) {
            return $forbidden;
        }
        $payload = $request->input('legalPages', $request->all());
        if (!is_array($payload)) {
            return response()->json(['error' => 'Invalid legal pages payload'], 400);
        }
        $saved = LegalPagesService::save($payload);
        return response()->json([
            'success' => true,
            'legalPages' => $saved,
        ]);
    }

    public function resetLegalPages(Request $request): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_general_settings')) {
            return $forbidden;
        }
        $pageKey = $request->input('pageKey');
        $saved = LegalPagesService::reset(is_string($pageKey) && $pageKey !== '' ? $pageKey : null);
        return response()->json([
            'success' => true,
            'legalPages' => $saved,
        ]);
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
        if ($forbidden = $this->checkPermission($request, 'manage_general_settings')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Settings/WebsiteInfo');
    }

    public function updateApp(Request $request): Response
    {
        $session = TeamService::getCurrentSession($request);
        if (($session['role'] ?? '') !== 'super_admin') {
            return Inertia::render('Errors/Forbidden');
        }
        return Inertia::render('Admin/Settings/UpdateApp');
    }

    public function tools(Request $request): Response
    {
        $session = TeamService::getCurrentSession($request);
        if (($session['role'] ?? '') !== 'super_admin') {
            return Inertia::render('Errors/Forbidden');
        }
        return Inertia::render('Admin/Tools');
    }

    public function captchaSettings(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'manage_general_settings')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Settings/Captcha');
    }

    public function sliderSettings(Request $request): Response
    {
        if ($forbidden = $this->checkPermission($request, 'manage_general_settings')) {
            return $forbidden;
        }
        return Inertia::render('Admin/Settings/Sliders', [
            'initialSliders' => SliderSettingsService::getAll(),
        ]);
    }

    public function getSliderSettings(Request $request): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_general_settings')) {
            return $forbidden;
        }
        return response()->json([
            'sliders' => SliderSettingsService::getAll(),
        ]);
    }

    public function saveSliderSettings(Request $request): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_general_settings')) {
            return $forbidden;
        }
        $sliders = $request->input('sliders', []);
        if (!is_array($sliders)) {
            return response()->json(['error' => 'Invalid sliders payload'], 400);
        }
        $saved = SliderSettingsService::save($sliders);
        return response()->json([
            'success' => true,
            'sliders' => $saved,
        ]);
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
        if ($forbidden = $this->authorizeApi($request, 'manage_general_settings')) {
            return $forbidden;
        }

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

    public function listApiKeys(Request $request): JsonResponse
    {
        $session = TeamService::getCurrentSession($request);
        $canManageKeys = TeamService::hasPermission($session, 'manage_api_keys');
        $canUseAi = TeamService::hasAnyPermission($session, ['upload_images', 'edit_images']);

        if (!$canManageKeys && !$canUseAi) {
            return response()->json(['error' => 'Forbidden: Missing permission to view API keys.'], 403);
        }

        try {
            $keys = ApiKey::orderBy('createdAt', 'desc')->get();
            if (!$canManageKeys) {
                // Return non-secret metadata only so upload/edit AI detection works without exposing raw keys
                return response()->json($keys->map(fn($k) => [
                    'id' => $k->id,
                    'name' => $k->name,
                    'modelVersion' => $k->modelVersion,
                    'isActive' => (bool) $k->isActive,
                    'createdAt' => $k->createdAt,
                ])->values());
            }
            return response()->json($keys);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to fetch API keys'], 500);
        }
    }

    public function createApiKey(Request $request): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_api_keys')) {
            return $forbidden;
        }

        try {
            $name = trim((string) $request->input('name', ''));
            $key = trim((string) $request->input('key', ''));
            $modelVersion = trim((string) $request->input('modelVersion', '2.5'));
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
                'modelVersion' => $modelVersion ?: '2.5',
                'isActive' => $isActive,
            ]);

            return response()->json($created, 201);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to create API key'], 500);
        }
    }

    public function updateApiKey(Request $request, string $id): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_api_keys')) {
            return $forbidden;
        }

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

    public function deleteApiKey(Request $request, string $id): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_api_keys')) {
            return $forbidden;
        }

        try {
            ApiKey::where('id', $id)->delete();
            return response()->json(['success' => true]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to delete API key'], 500);
        }
    }

    public function getCodeInjection(Request $request): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_code_injection')) {
            return $forbidden;
        }
        return response()->json(CodeInjectionService::get());
    }

    public function saveCodeInjection(Request $request): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_code_injection')) {
            return $forbidden;
        }

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
        if ($forbidden = $this->authorizeApi($request, 'manage_general_settings')) {
            return $forbidden;
        }

        try {
            $saved = WebsiteInfoService::save($request->all());
            return response()->json(['success' => true, 'data' => $saved]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to save website info'], 500);
        }
    }

    public function uploadBrandAsset(Request $request): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_general_settings')) {
            return $forbidden;
        }

        $type = strtolower(trim((string) $request->input('type', 'logo')));
        if (! in_array($type, ['logo', 'icon', 'favicon'], true)) {
            return response()->json(['error' => 'Invalid branding asset type'], 400);
        }

        if (! $request->hasFile('file')) {
            return response()->json(['error' => 'No image file provided'], 400);
        }

        $file = $request->file('file');
        if (! $file->isValid()) {
            return response()->json(['error' => 'Invalid file upload'], 400);
        }

        if ($file->getSize() > 5 * 1024 * 1024) {
            return response()->json(['error' => 'File must be 5 MB or smaller'], 400);
        }

        $ext = strtolower($file->getClientOriginalExtension() ?: 'png');
        if (! in_array($ext, ['png', 'jpg', 'jpeg', 'webp', 'svg', 'ico', 'gif'], true)) {
            return response()->json(['error' => 'Unsupported format. Use PNG, SVG, WebP, JPG, GIF, or ICO.'], 400);
        }

        $dir = public_path('uploads/branding');
        if (! is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }

        $filename = 'brand-' . $type . '-' . uniqid() . '-' . time() . '.' . $ext;
        $file->move($dir, $filename);
        $publicPath = '/uploads/branding/' . $filename;

        return response()->json([
            'success' => true,
            'type' => $type,
            'path' => $publicPath,
        ]);
    }

    public function getErrorPages(Request $request): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_general_settings')) {
            return $forbidden;
        }
        return response()->json(ErrorPagesService::get());
    }

    public function saveErrorPages(Request $request): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_general_settings')) {
            return $forbidden;
        }

        try {
            $saved = ErrorPagesService::save($request->all());
            return response()->json(['success' => true, 'data' => $saved]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to save error pages'], 500);
        }
    }

    public function getSeoSettings(Request $request): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_data_seo')) {
            return $forbidden;
        }

        try {
            SeoGeneratorService::checkScheduled();
            return response()->json(SeoGeneratorService::getSettings());
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to fetch SEO settings'], 500);
        }
    }

    public function saveOrGenerateSeo(Request $request): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_data_seo')) {
            return $forbidden;
        }

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

            if ($action === 'test_smtp') {
                $to = trim((string) $request->input('to', ''));
                if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
                    return response()->json(['error' => 'Please enter a valid recipient email address'], 400);
                }
                $result = TeamService::sendTestEmail($to);
                if (empty($result['sent'])) {
                    return response()->json([
                        'success' => false,
                        'error' => $result['error'] ?? 'Failed to send test email',
                    ], 422);
                }
                return response()->json(['success' => true, 'message' => "Test email sent to {$to}"]);
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

    public function teamWorkspaceData(Request $request): JsonResponse
    {
        $session = TeamService::getCurrentSession($request);
        if (!$session['authenticated']) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $timeframe = (string) $request->query('timeframe', '30d');
            if (!in_array($timeframe, ['7d', '30d', '90d', 'all'], true)) {
                $timeframe = '30d';
            }
            $since = match ($timeframe) {
                '7d' => now()->subDays(7),
                '30d' => now()->subDays(30),
                '90d' => now()->subDays(90),
                default => null,
            };

            $searchFilter = mb_strtolower(trim((string) $request->query('q', '')));

            $grouped = SearchLog::query()
                ->when($since, fn($query) => $query->where('createdAt', '>=', $since))
                ->whereRaw("TRIM(query) != ''")
                ->select([
                    DB::raw('LOWER(TRIM(query)) as normalized_query'),
                    DB::raw('MAX(query) as display_query'),
                    DB::raw('COUNT(*) as search_count'),
                    DB::raw('AVG(resultsCount) as avg_results'),
                    DB::raw('MIN(resultsCount) as min_results'),
                    DB::raw('MAX(resultsCount) as max_results'),
                    DB::raw('MAX(createdAt) as last_searched_at'),
                ])
                ->groupBy(DB::raw('LOWER(TRIM(query))'))
                ->orderByDesc('search_count')
                ->get();

            $totalSearches = (int) $grouped->sum('search_count');
            $uniqueQueries = $grouped->count();
            $zeroRowsAll = $grouped->filter(fn($r) => round((float) $r->avg_results, 2) <= 0.0);
            $lowRowsAll = $grouped->filter(function ($r) {
                $avg = (float) $r->avg_results;
                return $avg > 0.0 && $avg <= 3.0;
            });

            $zeroSearchesVolume = (int) $zeroRowsAll->sum('search_count');
            $zeroResultShare = $totalSearches > 0 ? round(($zeroSearchesVolume / $totalSearches) * 100, 1) : 0;

            $filtered = $searchFilter !== ''
                ? $grouped->filter(fn($r) => str_contains((string) $r->normalized_query, $searchFilter))
                : $grouped;

            $mapRow = function ($r) {
                $avg = round((float) $r->avg_results, 1);
                return [
                    'query' => (string) ($r->display_query ?: $r->normalized_query),
                    'normalizedQuery' => (string) $r->normalized_query,
                    'count' => (int) $r->search_count,
                    'avgResults' => $avg,
                    'minResults' => (int) $r->min_results,
                    'maxResults' => (int) $r->max_results,
                    'lastSearchedAt' => $r->last_searched_at ? (string) $r->last_searched_at : null,
                    'status' => $avg <= 0 ? 'gap' : ($avg <= 3 ? 'low' : 'healthy'),
                ];
            };

            $zeroResults = $filtered->filter(fn($r) => round((float) $r->avg_results, 2) <= 0.0)->take(100)->map($mapRow)->values();
            $lowResults = $filtered->filter(function ($r) {
                $avg = (float) $r->avg_results;
                return $avg > 0.0 && $avg <= 3.0;
            })->take(100)->map($mapRow)->values();
            $topSearches = $filtered->take(100)->map($mapRow)->values();

            // Catalog health & actionable content queue
            $draftImages = Image::where('status', 'draft')
                ->orderByDesc('createdAt')
                ->limit(25)
                ->get(['id', 'name', 'filename', 'path', 'previewPath', 'tags', 'altText', 'description', 'createdAt']);
            $draftCount = Image::where('status', 'draft')->count();

            $publishedImages = Image::where('status', 'published')
                ->withCount('categories')
                ->orderByDesc('createdAt')
                ->get(['id', 'name', 'filename', 'path', 'previewPath', 'tags', 'altText', 'description', 'createdAt']);

            $publishedCount = $publishedImages->count();
            $uncategorizedCount = 0;
            $lowSeoItems = [];
            $tagCounts = [];

            foreach ($publishedImages as $img) {
                $tags = is_array($img->tags) ? $img->tags : [];
                $tagsCount = count($tags);
                foreach ($tags as $tag) {
                    $cleanTag = mb_strtolower(trim((string) $tag));
                    if ($cleanTag !== '') {
                        $tagCounts[$cleanTag] = ($tagCounts[$cleanTag] ?? 0) + 1;
                    }
                }

                if (($img->categories_count ?? 0) === 0) {
                    $uncategorizedCount++;
                }

                $missingAlt = trim((string) ($img->altText ?? '')) === '';
                $missingDesc = trim((string) ($img->description ?? '')) === '';
                $lowTags = $tagsCount < 5;

                if ($missingAlt || $missingDesc || $lowTags) {
                    $score = ($missingAlt ? 3 : 0) + ($missingDesc ? 2 : 0) + ($lowTags ? 1 : 0);
                    $lowSeoItems[] = [
                        'id' => $img->id,
                        'name' => $img->name ?: $img->filename,
                        'filename' => $img->filename,
                        'path' => $img->path,
                        'previewPath' => $img->previewPath,
                        'missingAlt' => $missingAlt,
                        'missingDescription' => $missingDesc,
                        'tagsCount' => $tagsCount,
                        'categoriesCount' => (int) ($img->categories_count ?? 0),
                        'createdAt' => $img->createdAt,
                        '_priority' => $score,
                    ];
                }
            }

            usort($lowSeoItems, fn($a, $b) => $b['_priority'] <=> $a['_priority']);
            $lowSeoCount = count($lowSeoItems);
            $needsSeo = array_map(function ($item) {
                unset($item['_priority']);
                return $item;
            }, array_slice($lowSeoItems, 0, 25));

            arsort($tagCounts);
            $popularTags = [];
            foreach (array_slice($tagCounts, 0, 20, true) as $tagName => $count) {
                $popularTags[] = ['tag' => $tagName, 'count' => $count];
            }

            return response()->json([
                'timeframe' => $timeframe,
                'summary' => [
                    'totalSearches' => $totalSearches,
                    'uniqueQueries' => $uniqueQueries,
                    'zeroResultQueries' => $zeroRowsAll->count(),
                    'zeroResultShare' => $zeroResultShare,
                    'lowResultQueries' => $lowRowsAll->count(),
                    'publishedImages' => $publishedCount,
                    'draftImages' => $draftCount,
                    'lowSeoImages' => $lowSeoCount,
                    'uncategorizedImages' => $uncategorizedCount,
                ],
                'searchIntelligence' => [
                    'zeroResults' => $zeroResults,
                    'lowResults' => $lowResults,
                    'topSearches' => $topSearches,
                ],
                'catalogQueue' => [
                    'drafts' => $draftImages->map(fn($d) => [
                        'id' => $d->id,
                        'name' => $d->name ?: $d->filename,
                        'filename' => $d->filename,
                        'path' => $d->path,
                        'previewPath' => $d->previewPath,
                        'tagsCount' => is_array($d->tags) ? count($d->tags) : 0,
                        'createdAt' => $d->createdAt,
                    ])->values(),
                    'needsSeo' => $needsSeo,
                    'popularTags' => $popularTags,
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to load workspace intelligence'], 500);
        }
    }

    public function getUpdateStatus(Request $request): JsonResponse
    {
        $session = TeamService::getCurrentSession($request);
        if (!$session['authenticated'] || ($session['role'] ?? '') !== 'super_admin') {
            return response()->json(['error' => 'Forbidden: Super Admin only.'], 403);
        }

        return response()->json([
            'ok' => true,
            'isLocal' => HostingEnvironment::isLocal($request),
            'appVersion' => HostingEnvironment::getAppVersion(),
            'diagnostics' => InstallerService::getUpdateDiagnostics(),
        ]);
    }

    public function checkRemoteUpdate(Request $request): JsonResponse
    {
        $session = TeamService::getCurrentSession($request);
        if (!$session['authenticated'] || ($session['role'] ?? '') !== 'super_admin') {
            return response()->json(['error' => 'Forbidden: Super Admin only.'], 403);
        }

        return response()->json(InstallerService::fetchGitRemoteStatus());
    }

    public function runUpdateApp(Request $request): JsonResponse
    {
        $session = TeamService::getCurrentSession($request);
        if (!$session['authenticated'] || ($session['role'] ?? '') !== 'super_admin') {
            return response()->json(['error' => 'Forbidden: Super Admin only.'], 403);
        }

        if (HostingEnvironment::isLocal($request)) {
            return response()->json([
                'ok' => false,
                'message' => 'Applying remote deployment updates is disabled in local development so local .env and database are never overwritten.',
            ], 403);
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

    public function clearDb(Request $request): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_data_seo')) {
            return $forbidden;
        }

        try {
            Image::withTrashed()->forceDelete();
            SeoGeneratorService::refreshAuto('auto-clear-db');
            return response()->json(['success' => true, 'message' => 'Database images cleared successfully.']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'error' => 'Failed to clear database images.'], 500);
        }
    }

    public function getCaptchaSettings(Request $request): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_general_settings')) {
            return $forbidden;
        }

        return response()->json([
            'settings' => CaptchaService::getSettings(),
            'catalog' => CaptchaService::providerCatalog(),
        ]);
    }

    public function saveCaptchaSettings(Request $request): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_general_settings')) {
            return $forbidden;
        }

        try {
            $saved = CaptchaService::saveSettings($request->all());
            return response()->json([
                'success' => true,
                'settings' => $saved,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 422);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to save captcha settings.',
            ], 500);
        }
    }

    public function systemHealth(Request $request): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, ['manage_general_settings', 'manage_data_seo'])) {
            return $forbidden;
        }

        return response()->json(SystemHealthService::collect());
    }

    public function getTrashSettings(Request $request): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_general_settings')) {
            return $forbidden;
        }

        return response()->json([
            'retentionDays' => TrashService::getRetentionDays(),
            'allowedOptions' => TrashService::ALLOWED_RETENTION_DAYS,
            'trashedCount' => TrashService::hasSoftDeleteColumn() ? Image::onlyTrashed()->count() : 0,
        ]);
    }

    public function saveTrashSettings(Request $request): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_general_settings')) {
            return $forbidden;
        }

        $days = (int) $request->input('retentionDays', TrashService::DEFAULT_RETENTION_DAYS);
        $saved = TrashService::saveRetentionDays($days);
        $purgedNow = TrashService::purgeExpired();

        return response()->json([
            'success' => true,
            'retentionDays' => $saved,
            'purgedNow' => $purgedNow,
        ]);
    }

    public function getToolsSettings(Request $request): JsonResponse
    {
        $session = TeamService::getCurrentSession($request);
        if (!$session['authenticated'] || ($session['role'] ?? '') !== 'super_admin') {
            return response()->json(['error' => 'Forbidden: Super Admin only.'], 403);
        }

        return response()->json(ConverterToolsService::getAdminPayload());
    }

    public function saveToolsSettings(Request $request): JsonResponse
    {
        $session = TeamService::getCurrentSession($request);
        if (!$session['authenticated'] || ($session['role'] ?? '') !== 'super_admin') {
            return response()->json(['error' => 'Forbidden: Super Admin only.'], 403);
        }

        ConverterToolsService::saveSettings($request->only([
            'globalEnabled',
            'includeInSitemap',
            'showInPublicNav',
            'enableCatalogHandoff',
            'pairStates',
            'bgRemover',
        ]));

        SeoGeneratorService::refreshAuto('tools-updated');

        return response()->json(array_merge(
            ['success' => true],
            ConverterToolsService::getAdminPayload()
        ));
    }

    public function testBgRemoverServer(Request $request): JsonResponse
    {
        $session = TeamService::getCurrentSession($request);
        if (!$session['authenticated'] || ($session['role'] ?? '') !== 'super_admin') {
            return response()->json(['error' => 'Forbidden: Super Admin only.'], 403);
        }

        $saved = ConverterToolsService::getSettings()['bgRemover'] ?? ConverterToolsService::bgRemoverDefaults();
        $cfg = ConverterToolsService::normalizeBgRemoverSettings(
            is_array($request->input('bgRemover')) ? $request->input('bgRemover') : $request->all(),
            $saved
        );

        if ($cfg['serverAiMode'] === 'http') {
            $serviceUrl = rtrim($cfg['serverAiServiceUrl'], '/');
            $healthUrl = str_ends_with($serviceUrl, '/remove-background')
                ? substr($serviceUrl, 0, -strlen('/remove-background')) . '/health'
                : $serviceUrl;
            $verifySsl = (bool) ($cfg['serverAiVerifySsl'] ?? true);

            try {
                $res = Http::timeout(15)
                    ->withHeaders(ConverterToolsService::buildBgRemoverServiceHeaders($cfg))
                    ->withOptions(['verify' => $verifySsl])
                    ->get($healthUrl);

                if (in_array($res->status(), [401, 403], true)) {
                    return response()->json([
                        'ok' => false,
                        'mode' => 'http',
                        'target' => $healthUrl,
                        'error' => "Python VPS rejected the API key (HTTP {$res->status()}). Ensure Server AI API Key matches REMBG_API_KEY on the VPS.",
                    ], 502);
                }

                if (!$res->successful()) {
                    return response()->json([
                        'ok' => false,
                        'mode' => 'http',
                        'target' => $healthUrl,
                        'error' => "Python HTTP service responded with HTTP {$res->status()}.",
                    ], 502);
                }

                return response()->json([
                    'ok' => true,
                    'mode' => 'http',
                    'target' => $healthUrl,
                    'details' => $res->json() ?? ['status' => 'reachable'],
                ]);
            } catch (\Throwable $e) {
                return response()->json([
                    'ok' => false,
                    'mode' => 'http',
                    'target' => $healthUrl,
                    'error' => 'Could not connect to Python HTTP service: ' . $e->getMessage(),
                ], 502);
            }
        }

        $pythonExe = ConverterToolsService::resolvePythonExecutable($cfg['serverAiPythonPath'] ?? '');
        $scriptPath = base_path('python-ai' . DIRECTORY_SEPARATOR . 'remove_bg.py');
        $modelsDir = storage_path('app' . DIRECTORY_SEPARATOR . 'rembg-models');

        if (!is_file($scriptPath)) {
            return response()->json([
                'ok' => false,
                'mode' => 'cli',
                'error' => "Script missing at {$scriptPath}",
            ], 500);
        }

        try {
            $result = Process::env(ConverterToolsService::pythonProcessEnv())
                ->timeout(30)
                ->run([
                    $pythonExe,
                    $scriptPath,
                    '--check',
                    '--models-dir',
                    $modelsDir,
                ]);

            $stdout = trim($result->output());
            $stderr = trim($result->errorOutput());
            $decoded = json_decode($stdout, true);

            if (!$result->successful() || !is_array($decoded) || empty($decoded['ok'])) {
                return response()->json([
                    'ok' => false,
                    'mode' => 'cli',
                    'python' => $pythonExe,
                    'error' => $decoded['error'] ?? ($stderr !== '' ? $stderr : 'Python AI check failed.'),
                    'details' => $decoded,
                ], 422);
            }

            return response()->json([
                'ok' => true,
                'mode' => 'cli',
                'python' => $pythonExe,
                'details' => $decoded,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'mode' => 'cli',
                'python' => $pythonExe,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function clearUploads(Request $request): JsonResponse
    {
        if ($forbidden = $this->authorizeApi($request, 'manage_data_seo')) {
            return $forbidden;
        }

        try {
            $uploadDir = public_path('uploads');
            if (File::exists($uploadDir)) {
                File::cleanDirectory($uploadDir);
            }
            return response()->json(['success' => true, 'message' => 'Upload directory cleared successfully.']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'error' => 'Failed to clear uploads'], 500);
        }
    }
}

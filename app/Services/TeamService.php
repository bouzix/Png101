<?php

namespace App\Services;

use App\Models\Setting;
use App\Models\TeamMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class TeamService
{
    public const PERMISSIONS = [
        ['key' => 'upload_images', 'label' => 'Upload Images & AI Metadata', 'description' => 'Upload new PNGs, stage files, and use AI auto-metadata on the Upload page.', 'group' => 'Assets & Catalog'],
        ['key' => 'edit_images', 'label' => 'Edit Images', 'description' => 'Edit titles, tags, alt text, descriptions, and categories of staged or published images.', 'group' => 'Assets & Catalog'],
        ['key' => 'delete_images', 'label' => 'Delete Images', 'description' => 'Permanently delete staged or published images from the catalog.', 'group' => 'Assets & Catalog'],
        ['key' => 'manage_collections', 'label' => 'Manage Collections', 'description' => 'Create, edit, and delete categories/collections.', 'group' => 'Assets & Catalog'],
        ['key' => 'view_analytics', 'label' => 'View Analytics', 'description' => 'Access the Analytics dashboard, charts, and search intelligence.', 'group' => 'Analytics'],
        ['key' => 'export_analytics', 'label' => 'Export Analytics CSV', 'description' => 'Download analytics reports as CSV files.', 'group' => 'Analytics'],
        ['key' => 'manage_general_settings', 'label' => 'General Settings & Legal Pages', 'description' => 'Edit website branding, contact details, and legal/about pages.', 'group' => 'Settings'],
        ['key' => 'manage_api_keys', 'label' => 'Manage AI API Keys', 'description' => 'View, add, edit, or switch active Google Gemini API keys.', 'group' => 'Settings'],
        ['key' => 'manage_code_injection', 'label' => 'Manage Code Injection', 'description' => 'Edit custom Head, Body, and Footer HTML/scripts.', 'group' => 'Settings'],
        ['key' => 'manage_data_seo', 'label' => 'Data Management & SEO Sitemaps', 'description' => 'Export/import backups and regenerate SEO sitemaps.', 'group' => 'Settings'],
    ];

    public const SMTP_SETTING_KEY = 'smtp_config_v1';

    public static function getCurrentSession(?Request $request = null): array
    {
        $req = $request ?? request();
        $authToken = $req->cookie('auth_token') ?: session('auth_token');
        $teamMemberId = $req->cookie('team_member_id') ?: session('team_member_id');

        if ($authToken === 'authenticated') {
            return [
                'authenticated' => true,
                'role' => 'super_admin',
                'name' => 'Super Admin',
                'email' => null,
                'permissions' => ['*'],
            ];
        }

        if ($authToken === 'team_member' && $teamMemberId) {
            try {
                $member = TeamMember::find($teamMemberId);
                if ($member && $member->isActive) {
                    return [
                        'authenticated' => true,
                        'role' => 'team_member',
                        'id' => $member->id,
                        'name' => $member->name,
                        'email' => $member->email,
                        'permissions' => is_array($member->permissions) ? $member->permissions : [],
                    ];
                }
            } catch (\Throwable $e) {
                // Ignore
            }
        }

        return [
            'authenticated' => false,
            'role' => null,
            'permissions' => [],
        ];
    }

    public static function hasPermission(array $session, string $permission): bool
    {
        if (empty($session['authenticated'])) {
            return false;
        }
        if (($session['role'] ?? null) === 'super_admin') {
            return true;
        }
        $perms = $session['permissions'] ?? [];
        return in_array('*', $perms, true) || in_array($permission, $perms, true);
    }

    private static function formatMember(TeamMember $m): array
    {
        return [
            'id' => $m->id,
            'name' => $m->name,
            'email' => $m->email,
            'permissions' => is_array($m->permissions) ? $m->permissions : [],
            'isActive' => (bool) $m->isActive,
            'lastLoginAt' => $m->lastLoginAt?->toISOString(),
            'createdAt' => $m->createdAt?->toISOString(),
        ];
    }

    public static function getAllMembers(): array
    {
        return TeamMember::orderByDesc('createdAt')
            ->get()
            ->map(fn (TeamMember $m) => self::formatMember($m))
            ->all();
    }

    public static function getMemberById(string $id): ?array
    {
        $m = TeamMember::find($id);
        return $m ? self::formatMember($m) : null;
    }

    public static function getMemberByEmail(string $email): ?array
    {
        $normalized = strtolower(trim($email));
        $m = TeamMember::whereRaw('LOWER(email) = ?', [$normalized])->first();
        return $m ? self::formatMember($m) : null;
    }

    public static function createMember(array $data): array
    {
        $created = TeamMember::create([
            'name' => trim((string) ($data['name'] ?? '')),
            'email' => strtolower(trim((string) ($data['email'] ?? ''))),
            'passwordHash' => password_hash((string) ($data['passwordPlain'] ?? ''), PASSWORD_BCRYPT),
            'permissions' => array_values(array_map('strval', $data['permissions'] ?? [])),
            'isActive' => array_key_exists('isActive', $data) ? (bool) $data['isActive'] : true,
        ]);

        return self::formatMember($created);
    }

    public static function updateMember(string $id, array $data): ?array
    {
        $member = TeamMember::find($id);
        if (!$member) {
            return null;
        }

        if (array_key_exists('name', $data)) {
            $member->name = trim((string) $data['name']);
        }
        if (array_key_exists('email', $data)) {
            $newEmail = strtolower(trim((string) $data['email']));
            if ($newEmail !== strtolower($member->email)) {
                $conflict = TeamMember::whereRaw('LOWER(email) = ?', [$newEmail])
                    ->where('id', '!=', $id)
                    ->exists();
                if ($conflict) {
                    throw new \RuntimeException('A team member with this email already exists.');
                }
                $member->email = $newEmail;
            }
        }
        if (!empty($data['passwordPlain'])) {
            $member->passwordHash = password_hash((string) $data['passwordPlain'], PASSWORD_BCRYPT);
        }
        if (array_key_exists('permissions', $data) && is_array($data['permissions'])) {
            $member->permissions = array_values(array_map('strval', $data['permissions']));
        }
        if (array_key_exists('isActive', $data)) {
            $member->isActive = (bool) $data['isActive'];
        }

        $member->save();
        return self::formatMember($member);
    }

    public static function deleteMember(string $id): void
    {
        TeamMember::where('id', $id)->delete();
    }

    public static function getSmtpConfig(): array
    {
        $defaults = [
            'host' => env('MAIL_HOST', ''),
            'port' => (int) env('MAIL_PORT', 587),
            'secure' => false,
            'user' => env('MAIL_USERNAME', ''),
            'pass' => env('MAIL_PASSWORD', ''),
            'fromEmail' => env('MAIL_FROM_ADDRESS', 'noreply@png101.com'),
            'fromName' => env('MAIL_FROM_NAME', 'Png101 Admin'),
        ];

        try {
            $setting = Setting::find(self::SMTP_SETTING_KEY);
            if ($setting && $setting->value) {
                $parsed = json_decode($setting->value, true);
                if (is_array($parsed)) {
                    return [
                        'host' => $parsed['host'] ?? $defaults['host'],
                        'port' => (int) ($parsed['port'] ?? $defaults['port']),
                        'secure' => (bool) ($parsed['secure'] ?? $defaults['secure']),
                        'user' => $parsed['user'] ?? $defaults['user'],
                        'pass' => $parsed['pass'] ?? $defaults['pass'],
                        'fromEmail' => $parsed['fromEmail'] ?? $defaults['fromEmail'],
                        'fromName' => $parsed['fromName'] ?? $defaults['fromName'],
                    ];
                }
            }
        } catch (\Throwable $e) {
            // Ignore
        }

        return $defaults;
    }

    public static function saveSmtpConfig(array $config): void
    {
        Setting::updateOrCreate(
            ['key' => self::SMTP_SETTING_KEY],
            ['value' => json_encode($config)]
        );
    }

    public static function sendTeamInviteEmail(array $params): array
    {
        $smtp = self::getSmtpConfig();
        if (empty($smtp['host']) || empty($smtp['user']) || empty($smtp['pass'])) {
            return [
                'sent' => false,
                'mode' => 'manual_only',
                'error' => 'SMTP not configured',
            ];
        }

        try {
            config([
                'mail.mailers.dynamic_smtp' => [
                    'transport' => 'smtp',
                    'host' => $smtp['host'],
                    'port' => $smtp['port'] ?: 587,
                    'encryption' => !empty($smtp['secure']) ? 'ssl' : 'tls',
                    'username' => $smtp['user'],
                    'password' => $smtp['pass'],
                ],
            ]);

            $name = htmlspecialchars($params['name'] ?: $params['email'], ENT_QUOTES, 'UTF-8');
            $email = htmlspecialchars($params['email'], ENT_QUOTES, 'UTF-8');
            $pass = htmlspecialchars($params['passwordPlain'], ENT_QUOTES, 'UTF-8');
            $loginUrl = htmlspecialchars($params['loginUrl'], ENT_QUOTES, 'UTF-8');

            $permMap = collect(self::PERMISSIONS)->pluck('label', 'key')->all();
            $permListHtml = '';
            foreach ($params['permissions'] as $key) {
                $label = htmlspecialchars($permMap[$key] ?? $key, ENT_QUOTES, 'UTF-8');
                $permListHtml .= "<li style=\"margin-bottom: 4px;\">{$label}</li>";
            }

            $html = <<<HTML
<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 16px; padding: 32px; border: 1px solid #1e293b;">
    <h2 style="margin-top: 0; color: #3b82f6; font-size: 22px;">You've Been Invited to the Png101 Team</h2>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        Hi <strong>{$name}</strong>, the Super Admin has created a team account for you on Png101.
        Use the credentials below to sign in to the Team Portal:
    </p>
    <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #334155;">
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #94a3b8;">
            <strong style="color: #f8fafc;">Team Login URL:</strong><br/>
            <a href="{$loginUrl}" style="color: #60a5fa; text-decoration: none;">{$loginUrl}</a>
        </p>
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #94a3b8;">
            <strong style="color: #f8fafc;">Email:</strong> <code style="color: #38bdf8;">{$email}</code>
        </p>
        <p style="margin: 0; font-size: 13px; color: #94a3b8;">
            <strong style="color: #f8fafc;">Temporary Password:</strong> <code style="color: #34d399;">{$pass}</code>
        </p>
    </div>
    <p style="color: #94a3b8; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">
        Granted Permissions:
    </p>
    <ul style="color: #cbd5e1; font-size: 13px; padding-left: 20px; margin-top: 0;">{$permListHtml}</ul>
    <div style="margin-top: 28px;">
        <a href="{$loginUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 14px;">
            Log In to Team Dashboard →
        </a>
    </div>
</div>
HTML;

            Mail::mailer('dynamic_smtp')->html($html, function ($message) use ($smtp, $params) {
                $fromEmail = $smtp['fromEmail'] ?: $smtp['user'];
                $fromName = $smtp['fromName'] ?: 'Png101 Admin';
                $message->from($fromEmail, $fromName)
                    ->to($params['email'])
                    ->subject('Your Png101 Team Account Credentials');
            });

            return ['sent' => true, 'mode' => 'smtp'];
        } catch (\Throwable $e) {
            return [
                'sent' => false,
                'mode' => 'manual_only',
                'error' => $e->getMessage(),
            ];
        }
    }
}


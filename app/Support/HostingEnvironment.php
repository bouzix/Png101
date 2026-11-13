<?php

namespace App\Support;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

class HostingEnvironment
{
    private const LOCAL_HOSTS = [
        'localhost',
        '127.0.0.1',
        '::1',
        '0.0.0.0',
    ];

    /**
     * Determine whether the current request is running in local development.
     * Install and Update tools are strictly disabled locally so local workflows
     * and local .env / database state are never interrupted.
     */
    public static function isLocal(?Request $request = null): bool
    {
        $req = $request ?? request();
        $host = strtolower(trim((string) $req->getHost()));

        if (
            in_array($host, self::LOCAL_HOSTS, true)
            || str_ends_with($host, '.local')
            || str_ends_with($host, '.test')
            || str_ends_with($host, '.localhost')
        ) {
            return true;
        }

        $ip = (string) $req->ip();
        $serverAddr = (string) $req->server('SERVER_ADDR', '');
        $appUrlHost = strtolower((string) parse_url((string) config('app.url'), PHP_URL_HOST));

        if (app()->environment('local')) {
            if (
                in_array($ip, self::LOCAL_HOSTS, true)
                || in_array($serverAddr, self::LOCAL_HOSTS, true)
                || in_array($appUrlHost, self::LOCAL_HOSTS, true)
            ) {
                return true;
            }
        }

        return false;
    }

    public static function installedLockPath(): string
    {
        return storage_path('installed');
    }

    public static function isInstalled(): bool
    {
        return file_exists(self::installedLockPath());
    }

    public static function readInstalledState(): array
    {
        $path = self::installedLockPath();
        if (!is_file($path)) {
            return [];
        }

        $raw = @file_get_contents($path);
        if (!$raw) {
            return [];
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    public static function writeInstalledState(array $data): void
    {
        $path = self::installedLockPath();
        $dir = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        $existing = self::readInstalledState();
        $payload = array_merge($existing, $data);

        file_put_contents(
            $path,
            json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL,
            LOCK_EX
        );
    }

    public static function getAppVersion(): string
    {
        $path = base_path('version.json');
        if (is_file($path)) {
            $decoded = json_decode((string) @file_get_contents($path), true);
            if (is_array($decoded) && !empty($decoded['version'])) {
                return (string) $decoded['version'];
            }
        }

        return '1.0.0';
    }

    public static function detectAppUrl(?Request $request = null): string
    {
        $req = $request ?? request();
        $proto = strtolower((string) $req->header('X-Forwarded-Proto', ''));
        $scheme = $proto === 'https' || $req->isSecure() ? 'https' : 'http';
        $host = $req->getHttpHost();

        return $host ? "{$scheme}://{$host}" : 'https://png101.com';
    }

    /**
     * Read Git branch and HEAD commit in pure PHP (works even when shell exec is disabled).
     */
    public static function readGitInfo(): array
    {
        $gitDir = base_path('.git');
        if (!is_dir($gitDir) || !is_file($gitDir . '/HEAD')) {
            return [
                'has_git' => false,
                'branch' => null,
                'commit' => null,
                'short_commit' => null,
            ];
        }

        $head = trim((string) @file_get_contents($gitDir . '/HEAD'));
        $branch = null;
        $commit = null;

        if (str_starts_with($head, 'ref: ')) {
            $ref = trim(substr($head, 5));
            if (str_starts_with($ref, 'refs/heads/')) {
                $branch = substr($ref, strlen('refs/heads/'));
            } else {
                $branch = $ref;
            }

            $refFile = $gitDir . '/' . $ref;
            if (is_file($refFile)) {
                $commit = trim((string) @file_get_contents($refFile));
            } elseif (is_file($gitDir . '/packed-refs')) {
                $lines = @file($gitDir . '/packed-refs', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
                foreach ($lines as $line) {
                    if (!str_starts_with($line, '#') && str_ends_with($line, ' ' . $ref)) {
                        $commit = trim(explode(' ', $line)[0] ?? '');
                        break;
                    }
                }
            }
        } elseif (preg_match('/^[0-9a-f]{7,40}$/i', $head)) {
            $commit = $head;
            $branch = 'detached';
        }

        return [
            'has_git' => true,
            'branch' => $branch,
            'commit' => $commit ?: null,
            'short_commit' => $commit ? substr($commit, 0, 7) : null,
        ];
    }

    public static function canRunShell(): bool
    {
        if (!function_exists('proc_open')) {
            return false;
        }

        $disabled = array_map(
            'trim',
            explode(',', (string) ini_get('disable_functions'))
        );

        return !in_array('proc_open', $disabled, true);
    }

    public static function databaseLooksReady(): bool
    {
        if (!is_file(base_path('.env'))) {
            return false;
        }

        try {
            if (!Schema::hasTable('Setting')) {
                return false;
            }

            return \App\Models\Setting::where('key', 'admin_password')->exists();
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Build an outbound HTTP client with strict TLS verification, falling back
     * to a bundled Windows CA store when local PHP has no curl.cainfo.
     */
    public static function httpClient(int $timeout = 60): PendingRequest
    {
        $client = Http::timeout($timeout);

        if (
            PHP_OS_FAMILY === 'Windows'
            && !ini_get('curl.cainfo')
            && !ini_get('openssl.cafile')
        ) {
            $phpDir = dirname(PHP_BINARY);
            $candidates = [
                $phpDir . DIRECTORY_SEPARATOR . 'extras' . DIRECTORY_SEPARATOR . 'ssl' . DIRECTORY_SEPARATOR . 'cacert.pem',
                $phpDir . DIRECTORY_SEPARATOR . 'cacert.pem',
                'C:\\Program Files\\Git\\mingw64\\ssl\\certs\\ca-bundle.crt',
                'C:\\Program Files\\Git\\usr\\ssl\\certs\\ca-bundle.crt',
                'C:\\Program Files (x86)\\Git\\mingw64\\ssl\\certs\\ca-bundle.crt',
                'C:\\laragon\\etc\\ssl\\cacert.pem',
            ];

            foreach ($candidates as $caPath) {
                if (is_file($caPath)) {
                    return $client->withOptions(['verify' => $caPath]);
                }
            }
        }

        return $client;
    }
}


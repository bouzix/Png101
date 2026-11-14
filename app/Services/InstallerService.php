<?php

namespace App\Services;

use App\Models\ApiKey;
use App\Models\CodeInjection;
use App\Models\SeoSetting;
use App\Models\Setting;
use App\Support\HostingEnvironment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class InstallerService
{
    public const UPDATER_COOKIE = 'png101_updater_token';

    // -------------------------------------------------------------------------
    // Stateless / File-Backed Tokens (works before .env / APP_KEY / DB exist)
    // -------------------------------------------------------------------------

    private static function tokenFile(string $name): string
    {
        $dir = storage_path('framework');
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        return $dir . '/' . $name . '.json';
    }

    public static function issueCsrfToken(string $scope): string
    {
        $path = self::tokenFile("{$scope}_csrf");
        $now = time();

        if (is_file($path)) {
            $data = json_decode((string) @file_get_contents($path), true);
            if (is_array($data) && !empty($data['token']) && ($data['expires_at'] ?? 0) > ($now + 300)) {
                return (string) $data['token'];
            }
        }

        $token = bin2hex(random_bytes(32));
        @file_put_contents($path, json_encode([
            'token' => $token,
            'expires_at' => $now + 14400, // 4 hours
        ]), LOCK_EX);

        return $token;
    }

    public static function verifyCsrfToken(string $scope, ?string $token): bool
    {
        if (!$token) {
            return false;
        }

        $path = self::tokenFile("{$scope}_csrf");
        if (!is_file($path)) {
            return false;
        }

        $data = json_decode((string) @file_get_contents($path), true);
        if (!is_array($data) || empty($data['token'])) {
            return false;
        }

        if (($data['expires_at'] ?? 0) < time()) {
            return false;
        }

        return hash_equals((string) $data['token'], (string) $token);
    }

    public static function issueUpdaterAuthToken(): string
    {
        $raw = bin2hex(random_bytes(32));
        $path = self::tokenFile('update_auth');
        @file_put_contents($path, json_encode([
            'hash' => hash('sha256', $raw),
            'expires_at' => time() + 7200, // 2 hours
        ]), LOCK_EX);

        return $raw;
    }

    public static function verifyUpdaterAuthToken(?string $raw): bool
    {
        if (!$raw) {
            return false;
        }

        $path = self::tokenFile('update_auth');
        if (!is_file($path)) {
            return false;
        }

        $data = json_decode((string) @file_get_contents($path), true);
        if (!is_array($data) || empty($data['hash']) || ($data['expires_at'] ?? 0) < time()) {
            return false;
        }

        return hash_equals((string) $data['hash'], hash('sha256', $raw));
    }

    public static function revokeUpdaterAuthToken(): void
    {
        $path = self::tokenFile('update_auth');
        if (is_file($path)) {
            @unlink($path);
        }
    }

    public static function isSuperAdminRequest(Request $request): bool
    {
        $rawAuth = $request->cookie('auth_token');
        if (is_string($rawAuth) && $rawAuth !== '') {
            if ($rawAuth === 'authenticated') {
                return true;
            }
            if (config('app.key')) {
                try {
                    $decrypted = Crypt::decryptString($rawAuth);
                    // Laravel CookieValuePrefix format: "<40-char-hmac>|<value>"
                    if ($decrypted === 'authenticated' || str_ends_with($decrypted, '|authenticated')) {
                        return true;
                    }
                } catch (\Throwable $e) {
                    // Ignore decrypt failure
                }
            }
        }

        try {
            $session = TeamService::getCurrentSession($request);
            return !empty($session['authenticated']) && ($session['role'] ?? '') === 'super_admin';
        } catch (\Throwable $e) {
            return false;
        }
    }

    public static function isAuthenticatedForUpdate(Request $request): bool
    {
        // 1. Standalone updater session cookie
        $updaterCookie = $request->cookie(self::UPDATER_COOKIE);
        if (self::verifyUpdaterAuthToken(is_string($updaterCookie) ? $updaterCookie : null)) {
            return true;
        }

        // 2. Existing Super Admin session
        return self::isSuperAdminRequest($request);
    }

    public static function verifyAdminOrUpdateSecret(string $secret): bool
    {
        if ($secret === '') {
            return false;
        }

        $envSecret = (string) env('APP_UPDATE_SECRET', '');
        if ($envSecret !== '' && hash_equals($envSecret, $secret)) {
            return true;
        }

        try {
            $setting = Setting::find('admin_password');
            if ($setting && password_verify($secret, (string) $setting->value)) {
                return true;
            }
        } catch (\Throwable $e) {
            // DB may be unavailable before fixing migrations
        }

        return false;
    }

    // -------------------------------------------------------------------------
    // Server & Environment Preflight Checks
    // -------------------------------------------------------------------------

    public static function getRequirements(): array
    {
        $phpOk = version_compare(PHP_VERSION, '8.3.0', '>=');

        $extensions = [
            'pdo' => extension_loaded('pdo'),
            'pdo_mysql' => extension_loaded('pdo_mysql'),
            'mbstring' => extension_loaded('mbstring'),
            'openssl' => extension_loaded('openssl'),
            'tokenizer' => extension_loaded('tokenizer'),
            'xml' => extension_loaded('xml'),
            'ctype' => extension_loaded('ctype'),
            'json' => extension_loaded('json'),
            'bcmath' => extension_loaded('bcmath'),
            'fileinfo' => extension_loaded('fileinfo'),
            'gd' => extension_loaded('gd'),
            'curl' => extension_loaded('curl'),
            'zip' => extension_loaded('zip'),
        ];

        $requiredDirectories = [
            'storage' => storage_path(),
            'storage/framework' => storage_path('framework'),
            'storage/logs' => storage_path('logs'),
            'bootstrap/cache' => base_path('bootstrap/cache'),
            'public/uploads' => public_path('uploads'),
        ];

        $permissions = [];
        foreach ($requiredDirectories as $label => $path) {
            if (!is_dir($path)) {
                @mkdir($path, 0775, true);
            }
            $permissions[$label] = is_dir($path) && is_writable($path);
        }

        $envPath = base_path('.env');
        $permissions['.env (or project root)'] = is_file($envPath)
            ? is_writable($envPath)
            : is_writable(base_path());

        $permissions['public/ (for sitemaps)'] = is_writable(public_path());

        $vendorOk = is_file(base_path('vendor/autoload.php'));
        $buildManifestOk = is_file(public_path('build/manifest.json'));

        $blockingFailure = !$phpOk
            || in_array(false, array_intersect_key($extensions, array_flip([
                'pdo', 'pdo_mysql', 'mbstring', 'openssl', 'tokenizer', 'xml', 'ctype', 'json', 'fileinfo', 'gd',
            ])), true)
            || in_array(false, $permissions, true)
            || !$vendorOk;

        return [
            'php_version' => PHP_VERSION,
            'php_ok' => $phpOk,
            'extensions' => $extensions,
            'permissions' => $permissions,
            'vendor_ok' => $vendorOk,
            'build_manifest_ok' => $buildManifestOk,
            'all_passed' => !$blockingFailure,
        ];
    }

    // -------------------------------------------------------------------------
    // Database Testing & Configuration
    // -------------------------------------------------------------------------

    public static function testDatabaseConnection(array $db): array
    {
        $host = trim((string) ($db['db_host'] ?? 'localhost'));
        $port = (int) ($db['db_port'] ?? 3306);
        $database = trim((string) ($db['db_database'] ?? ''));
        $username = trim((string) ($db['db_username'] ?? ''));
        $password = (string) ($db['db_password'] ?? '');

        if ($host === '' || $database === '' || $username === '') {
            return [
                'ok' => false,
                'message' => 'Database host, database name, and username are required.',
            ];
        }

        try {
            $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $host, $port > 0 ? $port : 3306, $database);
            $pdo = new \PDO($dsn, $username, $password, [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_TIMEOUT => 5,
            ]);

            $version = (string) $pdo->query('SELECT VERSION()')->fetchColumn();
            $tables = $pdo->query('SHOW TABLES')->fetchAll(\PDO::FETCH_COLUMN);

            return [
                'ok' => true,
                'mysql_version' => $version,
                'existing_tables_count' => count($tables),
                'message' => sprintf('Connected successfully to MySQL %s (%d existing table(s) found).', $version, count($tables)),
            ];
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'message' => 'Connection failed: ' . $e->getMessage(),
            ];
        }
    }

    // -------------------------------------------------------------------------
    // Full Installation Execution
    // -------------------------------------------------------------------------

    public static function runInstall(array $input, Request $request): array
    {
        $steps = [];

        // 1. Validate requirements
        $reqs = self::getRequirements();
        if (!$reqs['all_passed']) {
            return [
                'ok' => false,
                'message' => 'Server requirements or directory permissions check failed.',
                'steps' => [['step' => 'Preflight check', 'status' => 'error', 'detail' => 'Fix failed PHP extensions or writable folder permissions first.']],
            ];
        }
        $steps[] = ['step' => 'Server & directory preflight', 'status' => 'ok', 'detail' => 'PHP ' . PHP_VERSION . ' and writable paths verified.'];

        // 2. Test DB before making changes
        $dbCheck = self::testDatabaseConnection($input);
        if (!$dbCheck['ok']) {
            return [
                'ok' => false,
                'message' => $dbCheck['message'],
                'steps' => array_merge($steps, [['step' => 'Database connection', 'status' => 'error', 'detail' => $dbCheck['message']]]),
            ];
        }
        $steps[] = ['step' => 'Database connection', 'status' => 'ok', 'detail' => $dbCheck['message']];

        // 3. Generate APP_KEY & write .env
        $appKey = self::resolveOrGenerateAppKey();
        $appName = trim((string) ($input['app_name'] ?? 'Png101')) ?: 'Png101';
        $appUrl = rtrim(trim((string) ($input['app_url'] ?? HostingEnvironment::detectAppUrl($request))), '/') ?: HostingEnvironment::detectAppUrl($request);
        $appDebug = !empty($input['app_debug']) ? 'true' : 'false';
        $updateSecret = trim((string) ($input['update_secret'] ?? ''));

        $envUpdates = [
            'APP_NAME' => $appName,
            'APP_ENV' => 'production',
            'APP_KEY' => $appKey,
            'APP_DEBUG' => $appDebug,
            'APP_URL' => $appUrl,
            'DB_CONNECTION' => 'mysql',
            'DB_HOST' => trim((string) ($input['db_host'] ?? 'localhost')),
            'DB_PORT' => (string) ((int) ($input['db_port'] ?? 3306) ?: 3306),
            'DB_DATABASE' => trim((string) ($input['db_database'] ?? '')),
            'DB_USERNAME' => trim((string) ($input['db_username'] ?? '')),
            'DB_PASSWORD' => (string) ($input['db_password'] ?? ''),
            'SESSION_DRIVER' => 'file',
            'CACHE_STORE' => 'file',
            'QUEUE_CONNECTION' => 'sync',
            'FILESYSTEM_DISK' => 'local',
        ];
        if ($updateSecret !== '') {
            $envUpdates['APP_UPDATE_SECRET'] = $updateSecret;
        }

        self::writeEnvFile($envUpdates);
        $steps[] = ['step' => 'Environment (.env)', 'status' => 'ok', 'detail' => '.env written with production configuration and generated APP_KEY.'];

        // 4. Rebind live DB & App configuration
        Config::set('app.name', $appName);
        Config::set('app.url', $appUrl);
        Config::set('app.key', $appKey);
        Config::set('database.default', 'mysql');
        Config::set('database.connections.mysql.host', $envUpdates['DB_HOST']);
        Config::set('database.connections.mysql.port', $envUpdates['DB_PORT']);
        Config::set('database.connections.mysql.database', $envUpdates['DB_DATABASE']);
        Config::set('database.connections.mysql.username', $envUpdates['DB_USERNAME']);
        Config::set('database.connections.mysql.password', $envUpdates['DB_PASSWORD']);
        DB::purge('mysql');
        DB::reconnect('mysql');

        // 5. Ensure upload & framework directories exist
        self::ensureDirectories();
        $steps[] = ['step' => 'Directories', 'status' => 'ok', 'detail' => 'Storage and public/uploads directories prepared.'];

        // 6. Run database migrations
        try {
            Schema::defaultStringLength(191);
            Artisan::call('migrate', ['--force' => true]);
            $migrationOutput = trim(Artisan::output());
            $steps[] = [
                'step' => 'Database migrations',
                'status' => 'ok',
                'detail' => $migrationOutput !== '' ? $migrationOutput : 'All tables migrated cleanly.',
            ];
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'message' => 'Database migration failed: ' . $e->getMessage(),
                'steps' => array_merge($steps, [['step' => 'Database migrations', 'status' => 'error', 'detail' => $e->getMessage()]]),
            ];
        }

        // 7. Seed Admin Password, Website Info & Defaults
        try {
            $adminPassword = (string) ($input['admin_password'] ?? '');
            Setting::updateOrCreate(
                ['key' => 'admin_password'],
                ['value' => password_hash($adminPassword, PASSWORD_BCRYPT)]
            );

            WebsiteInfoService::save([
                'websiteName' => $appName,
                'websiteUrl' => $appUrl,
                'tagline' => trim((string) ($input['tagline'] ?? WebsiteInfoService::defaults()['tagline'])),
                'contactEmail' => trim((string) ($input['contact_email'] ?? 'contact@png101.com')) ?: 'contact@png101.com',
                'dmcaEmail' => trim((string) ($input['dmca_email'] ?? 'dmca@png101.com')) ?: 'dmca@png101.com',
                'companyName' => trim((string) ($input['company_name'] ?? $appName)) ?: $appName,
                'country' => trim((string) ($input['country'] ?? 'United States')) ?: 'United States',
                'foundedYear' => date('Y'),
            ]);

            self::ensureSingletonDefaults();

            $geminiKey = trim((string) ($input['gemini_api_key'] ?? ''));
            if ($geminiKey !== '') {
                $existingKey = ApiKey::where('key', $geminiKey)->first();
                if (!$existingKey) {
                    ApiKey::query()->update(['isActive' => false]);
                    ApiKey::create([
                        'id' => (string) Str::uuid(),
                        'name' => 'Primary Gemini Key',
                        'key' => $geminiKey,
                        'modelVersion' => '2.5',
                        'isActive' => true,
                    ]);
                }
            }

            $steps[] = ['step' => 'Admin & site defaults', 'status' => 'ok', 'detail' => 'Super Admin credentials, Website Info, and default settings saved.'];
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'message' => 'Failed saving initial settings: ' . $e->getMessage(),
                'steps' => array_merge($steps, [['step' => 'Admin & site defaults', 'status' => 'error', 'detail' => $e->getMessage()]]),
            ];
        }

        // 8. Generate SEO sitemaps & clear caches
        try {
            $seoResult = SeoGeneratorService::generateAll('install');
            $countFiles = count($seoResult['filesGenerated'] ?? []);
            $steps[] = ['step' => 'SEO & sitemaps', 'status' => 'ok', 'detail' => "Generated {$countFiles} SEO/sitemap files in public/."];
        } catch (\Throwable $e) {
            $steps[] = ['step' => 'SEO & sitemaps', 'status' => 'warn', 'detail' => 'Skipped: ' . $e->getMessage()];
        }

        try {
            Artisan::call('optimize:clear');
            $steps[] = ['step' => 'Cache reset', 'status' => 'ok', 'detail' => 'Cleared stale framework caches.'];
        } catch (\Throwable $e) {
            $steps[] = ['step' => 'Cache reset', 'status' => 'warn', 'detail' => $e->getMessage()];
        }

        // 9. Write installation lock file
        $git = HostingEnvironment::readGitInfo();
        HostingEnvironment::writeInstalledState([
            'version' => HostingEnvironment::getAppVersion(),
            'installed_at' => now()->toISOString(),
            'updated_at' => now()->toISOString(),
            'app_url' => $appUrl,
            'php_version' => PHP_VERSION,
            'git_branch' => $git['branch'],
            'git_commit' => $git['commit'],
        ]);
        $steps[] = ['step' => 'Lock installer', 'status' => 'ok', 'detail' => 'Created storage/installed lock file.'];

        return [
            'ok' => true,
            'message' => 'Png101 installed successfully!',
            'steps' => $steps,
            'redirect_admin' => '/admin',
            'redirect_home' => '/',
        ];
    }

    // -------------------------------------------------------------------------
    // Updater Diagnostics & Execution
    // -------------------------------------------------------------------------

    public static function getUpdateDiagnostics(): array
    {
        $state = HostingEnvironment::readInstalledState();
        $git = HostingEnvironment::readGitInfo();
        $appVersion = HostingEnvironment::getAppVersion();
        $canShell = HostingEnvironment::canRunShell();
        $reqs = self::getRequirements();

        $pendingMigrations = self::getPendingMigrations();
        $newCommitDetected = !empty($git['commit'])
            && !empty($state['git_commit'])
            && $git['commit'] !== $state['git_commit'];

        $versionChanged = !empty($state['version']) && version_compare($appVersion, (string) $state['version'], '>');

        $versionMeta = [];
        $versionFile = base_path('version.json');
        if (is_file($versionFile)) {
            $decodedMeta = json_decode((string) @file_get_contents($versionFile), true);
            if (is_array($decodedMeta)) {
                $versionMeta = $decodedMeta;
            }
        }

        $recentCommits = self::getPendingUpdateChanges($state['git_commit'] ?? null, $git['commit'] ?? null);

        $dbConnected = false;
        try {
            DB::connection()->getPdo();
            $dbConnected = true;
        } catch (\Throwable $e) {
            $dbConnected = false;
        }

        return [
            'app_version' => $appVersion,
            'released_at' => $versionMeta['released_at'] ?? null,
            'release_changes' => array_values(array_filter(
                is_array($versionMeta['changes'] ?? null) ? $versionMeta['changes'] : [],
                fn ($line) => is_string($line) && trim($line) !== ''
            )),
            'recent_commits' => $recentCommits,
            'installed_version' => $state['version'] ?? $appVersion,
            'installed_at' => $state['installed_at'] ?? null,
            'updated_at' => $state['updated_at'] ?? null,
            'recorded_commit' => $state['git_commit'] ?? null,
            'recorded_short_commit' => !empty($state['git_commit']) ? substr((string) $state['git_commit'], 0, 7) : null,
            'git' => $git,
            'can_shell_git' => $canShell && $git['has_git'],
            'new_commit_detected' => $newCommitDetected,
            'version_changed' => $versionChanged,
            'pending_migrations' => $pendingMigrations,
            'has_pending_updates' => $newCommitDetected || $versionChanged || count($pendingMigrations) > 0,
            'db_connected' => $dbConnected,
            'build_manifest_ok' => $reqs['build_manifest_ok'],
            'build_manifest_mtime' => $reqs['build_manifest_ok']
                ? date('Y-m-d H:i:s', (int) filemtime(public_path('build/manifest.json')))
                : null,
            'vendor_ok' => $reqs['vendor_ok'],
        ];
    }

    private static function getPendingUpdateChanges(?string $recordedCommit, ?string $headCommit): array
    {
        $commits = [];

        if (HostingEnvironment::canRunShell() && is_dir(base_path('.git')) && !empty($headCommit)) {
            $args = ['log', '-n', '15', '--pretty=format:%h%x09%s%x09%cr'];
            if (!empty($recordedCommit) && $recordedCommit !== $headCommit && preg_match('/^[0-9a-f]{7,40}$/i', $recordedCommit)) {
                $args[] = "{$recordedCommit}..HEAD";
                $res = self::runGitCommand($args);
                if ($res['exit_code'] !== 0 || trim($res['stdout']) === '') {
                    $res = self::runGitCommand(['log', '-n', '8', '--pretty=format:%h%x09%s%x09%cr', 'HEAD']);
                }
            } else {
                $res = self::runGitCommand(['log', '-n', '5', '--pretty=format:%h%x09%s%x09%cr', 'HEAD']);
            }

            if (($res['exit_code'] ?? 1) === 0 && trim((string) ($res['stdout'] ?? '')) !== '') {
                foreach (explode("\n", trim($res['stdout'])) as $line) {
                    $parts = explode("\t", $line, 3);
                    if (!empty($parts[1])) {
                        $commits[] = [
                            'hash' => trim($parts[0]),
                            'message' => trim($parts[1]),
                            'date' => trim($parts[2] ?? ''),
                        ];
                    }
                }
                return $commits;
            }
        }

        // Pure PHP fallback reading .git/logs/HEAD when shell git is disabled (e.g. cPanel)
        $reflogPath = base_path('.git/logs/HEAD');
        if (is_file($reflogPath)) {
            $lines = @file($reflogPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
            $tail = array_reverse(array_slice($lines, -15));
            foreach ($tail as $line) {
                $tabPos = strpos($line, "\t");
                if ($tabPos === false) {
                    continue;
                }
                $meta = explode(' ', substr($line, 0, $tabPos));
                $newHash = $meta[1] ?? '';
                if (!empty($recordedCommit) && $newHash === $recordedCommit) {
                    break;
                }
                $action = trim(substr($line, $tabPos + 1));
                $message = preg_replace('/^(commit|pull[^:]*|merge[^:]*):\s*/i', '', $action);
                if ($message !== '' && !str_starts_with(strtolower($action), 'checkout:')) {
                    $commits[] = [
                        'hash' => $newHash ? substr($newHash, 0, 7) : '',
                        'message' => $message,
                        'date' => '',
                    ];
                }
                if (count($commits) >= 8) {
                    break;
                }
            }
        }

        return $commits;
    }

    public static function getPendingMigrations(): array
    {
        try {
            $migrationFiles = glob(database_path('migrations/*.php')) ?: [];
            $all = array_map(fn ($f) => pathinfo($f, PATHINFO_FILENAME), $migrationFiles);

            if (!Schema::hasTable('migrations')) {
                return array_values($all);
            }

            $ran = DB::table('migrations')->pluck('migration')->all();
            return array_values(array_diff($all, $ran));
        } catch (\Throwable $e) {
            return [];
        }
    }

    public static function fetchGitRemoteStatus(): array
    {
        if (!HostingEnvironment::canRunShell() || !is_dir(base_path('.git'))) {
            return [
                'ok' => false,
                'message' => 'Git CLI execution is disabled on this server. Pull updates from cPanel -> Git Version Control first, then click Apply Updates below.',
            ];
        }

        $branch = HostingEnvironment::readGitInfo()['branch'] ?: 'main';
        $fetch = self::runGitCommand(['fetch', 'origin', $branch]);
        if ($fetch['exit_code'] !== 0) {
            return [
                'ok' => false,
                'message' => 'git fetch failed: ' . ($fetch['stderr'] ?: $fetch['stdout']),
            ];
        }

        $behindRes = self::runGitCommand(['rev-list', '--count', "HEAD..origin/{$branch}"]);
        $behind = (int) trim($behindRes['stdout']);
        $logRes = self::runGitCommand(['log', '-n', '5', '--oneline', "HEAD..origin/{$branch}"]);

        return [
            'ok' => true,
            'branch' => $branch,
            'commits_behind' => $behind,
            'incoming_commits' => array_values(array_filter(explode("\n", trim($logRes['stdout'])))),
            'message' => $behind > 0
                ? "{$behind} new commit(s) available on origin/{$branch}."
                : "Up to date with origin/{$branch}.",
        ];
    }

    public static function runUpdate(array $options): array
    {
        $steps = [];
        $useMaintenance = !empty($options['maintenance_mode']);
        $pullGit = !empty($options['pull_git']);
        $runMigrations = !array_key_exists('run_migrations', $options) || !empty($options['run_migrations']);
        $refreshCaches = !array_key_exists('refresh_caches', $options) || !empty($options['refresh_caches']);
        $regenSeo = !array_key_exists('regen_seo', $options) || !empty($options['regen_seo']);

        $downActivated = false;

        try {
            if ($useMaintenance) {
                try {
                    Artisan::call('down');
                    $downActivated = true;
                    $steps[] = ['step' => 'Maintenance mode', 'status' => 'ok', 'detail' => 'Temporarily enabled maintenance mode during update.'];
                } catch (\Throwable $e) {
                    $steps[] = ['step' => 'Maintenance mode', 'status' => 'warn', 'detail' => $e->getMessage()];
                }
            }

            if ($pullGit) {
                if (!HostingEnvironment::canRunShell() || !is_dir(base_path('.git'))) {
                    $steps[] = [
                        'step' => 'Git pull',
                        'status' => 'warn',
                        'detail' => 'Skipped: shell git execution unavailable (use cPanel -> Git Version Control to pull).',
                    ];
                } else {
                    $branch = HostingEnvironment::readGitInfo()['branch'] ?: 'main';
                    $pull = self::runGitCommand(['pull', '--ff-only', 'origin', $branch]);
                    if ($pull['exit_code'] === 0) {
                        $steps[] = [
                            'step' => 'Git pull',
                            'status' => 'ok',
                            'detail' => trim($pull['stdout']) ?: "Pulled latest from origin/{$branch}.",
                        ];
                    } else {
                        return [
                            'ok' => false,
                            'message' => 'Git pull failed: ' . ($pull['stderr'] ?: $pull['stdout']),
                            'steps' => array_merge($steps, [[
                                'step' => 'Git pull',
                                'status' => 'error',
                                'detail' => trim($pull['stderr'] ?: $pull['stdout']),
                            ]]),
                        ];
                    }
                }
            }

            self::ensureDirectories();
            $steps[] = ['step' => 'Directories check', 'status' => 'ok', 'detail' => 'Verified storage and upload directories.'];

            if ($refreshCaches) {
                Artisan::call('optimize:clear');
                $steps[] = ['step' => 'Clear old caches', 'status' => 'ok', 'detail' => 'Cleared compiled config, routes, and views.'];
            }

            if ($runMigrations) {
                Artisan::call('migrate', ['--force' => true]);
                $out = trim(Artisan::output());
                $steps[] = [
                    'step' => 'Database migrations',
                    'status' => 'ok',
                    'detail' => $out !== '' ? $out : 'Nothing new to migrate.',
                ];
            }

            self::ensureSingletonDefaults();
            $steps[] = ['step' => 'Defaults sync', 'status' => 'ok', 'detail' => 'Ensured required singleton settings exist.'];

            if ($regenSeo) {
                try {
                    $seo = SeoGeneratorService::generateAll('update');
                    $countFiles = count($seo['filesGenerated'] ?? []);
                    $steps[] = ['step' => 'SEO & sitemaps', 'status' => 'ok', 'detail' => "Regenerated {$countFiles} SEO files."];
                } catch (\Throwable $e) {
                    $steps[] = ['step' => 'SEO & sitemaps', 'status' => 'warn', 'detail' => $e->getMessage()];
                }
            }

            if ($refreshCaches) {
                try {
                    Artisan::call('view:cache');
                    $steps[] = ['step' => 'View cache', 'status' => 'ok', 'detail' => 'Compiled Blade templates cached.'];
                } catch (\Throwable $e) {
                    $steps[] = ['step' => 'View cache', 'status' => 'warn', 'detail' => $e->getMessage()];
                }
            }

            $git = HostingEnvironment::readGitInfo();
            $version = HostingEnvironment::getAppVersion();
            HostingEnvironment::writeInstalledState([
                'version' => $version,
                'updated_at' => now()->toISOString(),
                'php_version' => PHP_VERSION,
                'git_branch' => $git['branch'],
                'git_commit' => $git['commit'],
            ]);
            $steps[] = ['step' => 'Version state', 'status' => 'ok', 'detail' => "Recorded version {$version}" . ($git['short_commit'] ? " ({$git['short_commit']})" : '') . '.'];

            return [
                'ok' => true,
                'message' => 'Application updated successfully!',
                'steps' => $steps,
                'diagnostics' => self::getUpdateDiagnostics(),
            ];
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'message' => 'Update error: ' . $e->getMessage(),
                'steps' => array_merge($steps, [['step' => 'Error', 'status' => 'error', 'detail' => $e->getMessage()]]),
            ];
        } finally {
            if ($downActivated) {
                try {
                    Artisan::call('up');
                } catch (\Throwable $e) {
                    // Ignore
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static function runGitCommand(array $args): array
    {
        $cmd = array_merge(['git'], $args);
        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = @proc_open($cmd, $descriptors, $pipes, base_path());
        if (!is_resource($process)) {
            return ['exit_code' => 1, 'stdout' => '', 'stderr' => 'Unable to spawn git process.'];
        }

        fclose($pipes[0]);
        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $exitCode = proc_close($process);

        return [
            'exit_code' => $exitCode,
            'stdout' => (string) $stdout,
            'stderr' => (string) $stderr,
        ];
    }

    private static function resolveOrGenerateAppKey(): string
    {
        $envPath = base_path('.env');
        if (is_file($envPath)) {
            $content = (string) @file_get_contents($envPath);
            if (preg_match('/^APP_KEY=(.+)$/m', $content, $m)) {
                $existing = trim($m[1], " \t\n\r\0\x0B\"'");
                if ($existing !== '') {
                    return $existing;
                }
            }
        }

        return 'base64:' . base64_encode(random_bytes(32));
    }

    public static function writeEnvFile(array $updates): void
    {
        $envPath = base_path('.env');
        $templatePath = is_file($envPath)
            ? $envPath
            : (is_file(base_path('.env.example')) ? base_path('.env.example') : null);

        $content = $templatePath ? (string) file_get_contents($templatePath) : '';

        foreach ($updates as $key => $rawValue) {
            $formatted = self::formatEnvValue((string) $rawValue);
            $line = "{$key}={$formatted}";
            $pattern = '/^' . preg_quote($key, '/') . '=.*$/m';

            if (preg_match($pattern, $content)) {
                $content = (string) preg_replace_callback($pattern, fn () => $line, $content, 1);
            } else {
                $content = rtrim($content) . "\n{$line}\n";
            }
        }

        file_put_contents($envPath, ltrim($content, "\r\n"), LOCK_EX);
    }

    private static function formatEnvValue(string $value): string
    {
        if ($value === '') {
            return '';
        }

        if (preg_match('/[\s#"\'\\\\$]/', $value)) {
            $escaped = str_replace(['\\', '"', '$'], ['\\\\', '\\"', '\\$'], $value);
            return '"' . $escaped . '"';
        }

        return $value;
    }

    public static function ensureDirectories(): void
    {
        $dirs = [
            storage_path('app'),
            storage_path('framework/cache/data'),
            storage_path('framework/sessions'),
            storage_path('framework/views'),
            storage_path('logs'),
            base_path('bootstrap/cache'),
            public_path('uploads'),
            public_path('uploads/images'),
            public_path('uploads/previews'),
            public_path('uploads/categories'),
            public_path('uploads/collections'),
            public_path('uploads/errors'),
        ];

        foreach ($dirs as $dir) {
            if (!is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }
        }
    }

    public static function ensureSingletonDefaults(): void
    {
        CodeInjection::firstOrCreate(
            ['id' => CodeInjectionService::DEFAULT_ID],
            ['headCode' => '', 'bodyCode' => '', 'footerCode' => '']
        );

        SeoSetting::firstOrCreate(
            ['id' => SeoGeneratorService::DEFAULT_ID],
            SeoGeneratorService::defaults()
        );

        if (!Setting::find(ErrorPagesService::SETTING_KEY)) {
            ErrorPagesService::save(ErrorPagesService::defaults());
        }
    }
}


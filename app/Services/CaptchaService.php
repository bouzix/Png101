<?php

namespace App\Services;

use App\Models\Setting;
use App\Support\HostingEnvironment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class CaptchaService
{
    public const SETTING_KEY = 'captcha_settings_v1';

    public const PROVIDERS = [
        'none',
        'builtin_math',
        'recaptcha_v2',
        'recaptcha_v3',
        'turnstile',
        'hcaptcha',
        'friendly',
    ];

    public const CONTEXTS = [
        'download',
        'admin_login',
        'team_login',
    ];

    public static function defaults(): array
    {
        return [
            'downloadProvider' => 'builtin_math',
            'downloadCountdownSeconds' => 3,
            'adminLoginProvider' => 'none',
            'teamLoginProvider' => 'none',
            'providers' => [
                'recaptcha_v2' => [
                    'siteKey' => '',
                    'secretKey' => '',
                ],
                'recaptcha_v3' => [
                    'siteKey' => '',
                    'secretKey' => '',
                    'minScore' => 0.5,
                ],
                'turnstile' => [
                    'siteKey' => '',
                    'secretKey' => '',
                ],
                'hcaptcha' => [
                    'siteKey' => '',
                    'secretKey' => '',
                ],
                'friendly' => [
                    'siteKey' => '',
                    'secretKey' => '',
                ],
            ],
        ];
    }

    public static function getSettings(): array
    {
        $defaults = self::defaults();
        try {
            $raw = Setting::find(self::SETTING_KEY)?->value;
            if (!$raw) {
                return $defaults;
            }
            $decoded = json_decode($raw, true);
            if (!is_array($decoded)) {
                return $defaults;
            }

            $mergedProviders = $defaults['providers'];
            foreach ($mergedProviders as $key => $providerDefaults) {
                if (!empty($decoded['providers'][$key]) && is_array($decoded['providers'][$key])) {
                    $mergedProviders[$key] = array_merge($providerDefaults, $decoded['providers'][$key]);
                }
            }

            return [
                'downloadProvider' => in_array($decoded['downloadProvider'] ?? '', self::PROVIDERS, true)
                    ? $decoded['downloadProvider']
                    : $defaults['downloadProvider'],
                'downloadCountdownSeconds' => max(0, min(30, (int) ($decoded['downloadCountdownSeconds'] ?? $defaults['downloadCountdownSeconds']))),
                'adminLoginProvider' => in_array($decoded['adminLoginProvider'] ?? '', self::PROVIDERS, true)
                    ? $decoded['adminLoginProvider']
                    : $defaults['adminLoginProvider'],
                'teamLoginProvider' => in_array($decoded['teamLoginProvider'] ?? '', self::PROVIDERS, true)
                    ? $decoded['teamLoginProvider']
                    : $defaults['teamLoginProvider'],
                'providers' => $mergedProviders,
            ];
        } catch (\Throwable $e) {
            return $defaults;
        }
    }

    public static function saveSettings(array $input): array
    {
        $current = self::getSettings();
        $providers = $current['providers'];

        if (!empty($input['providers']) && is_array($input['providers'])) {
            foreach ($providers as $key => $existing) {
                if (isset($input['providers'][$key]) && is_array($input['providers'][$key])) {
                    $incoming = $input['providers'][$key];
                    $providers[$key]['siteKey'] = trim((string) ($incoming['siteKey'] ?? $existing['siteKey']));
                    $providers[$key]['secretKey'] = trim((string) ($incoming['secretKey'] ?? $existing['secretKey']));
                    if ($key === 'recaptcha_v3') {
                        $score = (float) ($incoming['minScore'] ?? $existing['minScore'] ?? 0.5);
                        $providers[$key]['minScore'] = max(0.1, min(0.9, round($score, 2)));
                    }
                }
            }
        }

        $next = [
            'downloadProvider' => in_array($input['downloadProvider'] ?? '', self::PROVIDERS, true)
                ? $input['downloadProvider']
                : $current['downloadProvider'],
            'downloadCountdownSeconds' => isset($input['downloadCountdownSeconds'])
                ? max(0, min(30, (int) $input['downloadCountdownSeconds']))
                : $current['downloadCountdownSeconds'],
            'adminLoginProvider' => in_array($input['adminLoginProvider'] ?? '', self::PROVIDERS, true)
                ? $input['adminLoginProvider']
                : $current['adminLoginProvider'],
            'teamLoginProvider' => in_array($input['teamLoginProvider'] ?? '', self::PROVIDERS, true)
                ? $input['teamLoginProvider']
                : $current['teamLoginProvider'],
            'providers' => $providers,
        ];

        // Prevent selecting a third-party provider that is missing its Site Key or Secret Key
        foreach ([
            'downloadProvider' => 'Frontend Image Download',
            'adminLoginProvider' => 'Super Admin Login',
            'teamLoginProvider' => 'Team Member Login',
        ] as $field => $label) {
            $chosen = $next[$field];
            if (!in_array($chosen, ['none', 'builtin_math'], true)) {
                $cfg = $next['providers'][$chosen] ?? [];
                if (empty($cfg['siteKey']) || empty($cfg['secretKey'])) {
                    throw new \InvalidArgumentException(
                        "Cannot enable {$chosen} for {$label} without both Site Key and Secret Key."
                    );
                }
            }
        }

        Setting::updateOrCreate(
            ['key' => self::SETTING_KEY],
            ['value' => json_encode($next)]
        );

        return $next;
    }

    public static function getProviderForContext(string $context): string
    {
        $settings = self::getSettings();
        $provider = match ($context) {
            'admin_login' => $settings['adminLoginProvider'],
            'team_login' => $settings['teamLoginProvider'],
            default => $settings['downloadProvider'],
        };

        if (!in_array($provider, ['none', 'builtin_math'], true)) {
            $cfg = $settings['providers'][$provider] ?? [];
            if (empty($cfg['siteKey']) || empty($cfg['secretKey'])) {
                // Fail-safe: never lock out login if external keys were cleared
                return 'none';
            }
        }

        return $provider;
    }

    /**
     * Public non-secret config passed to login pages and frontend download modal.
     */
    public static function getPublicConfig(string $context): array
    {
        $settings = self::getSettings();
        $provider = self::getProviderForContext($context);
        $siteKey = $settings['providers'][$provider]['siteKey'] ?? null;

        return [
            'context' => $context,
            'provider' => $provider,
            'siteKey' => $siteKey,
            'countdownSeconds' => $context === 'download' ? (int) $settings['downloadCountdownSeconds'] : 0,
            'challenge' => $provider === 'builtin_math' ? self::generateBuiltInChallenge($context) : null,
        ];
    }

    public static function generateBuiltInChallenge(string $context = 'download'): array
    {
        $op = random_int(0, 1) === 0 ? '+' : '-';
        if ($op === '+') {
            $a = random_int(2, 18);
            $b = random_int(2, 15);
            $answer = $a + $b;
        } else {
            $a = random_int(10, 25);
            $b = random_int(2, 9);
            $answer = $a - $b;
        }

        $nonce = Str::random(24);
        $expiresAt = time() + 600; // 10 minutes
        $payload = base64_encode(json_encode([
            'n' => $nonce,
            'c' => $context,
            'a' => (string) $answer,
            'e' => $expiresAt,
        ]));
        $sig = hash_hmac('sha256', $payload, (string) config('app.key', 'png101-captcha-secret'));

        return [
            'question' => "What is {$a} {$op} {$b}?",
            'token' => "{$payload}.{$sig}",
            'expiresAt' => $expiresAt,
        ];
    }

    /**
     * Verify a captcha submission for a given context ('download', 'admin_login', 'team_login').
     */
    public static function verify(Request $request, string $context, ?string $token = null, ?string $challengeToken = null): array
    {
        $settings = self::getSettings();
        $provider = self::getProviderForContext($context);

        if ($provider === 'none') {
            return ['ok' => true, 'provider' => 'none'];
        }

        $responseToken = trim((string) ($token ?? $request->input('captchaToken', '')));
        if ($responseToken === '') {
            \Log::warning('Captcha verify failed: empty captchaToken', ['context' => $context, 'provider' => $provider]);
            return ['ok' => false, 'provider' => $provider, 'error' => 'Please complete the security captcha first.'];
        }

        if ($provider === 'builtin_math') {
            $rawChallenge = trim((string) ($challengeToken ?? $request->input('captchaChallenge', '')));
            return self::verifyBuiltInChallenge($context, $responseToken, $rawChallenge);
        }

        $cfg = $settings['providers'][$provider] ?? [];
        $secret = (string) ($cfg['secretKey'] ?? '');
        $siteKey = (string) ($cfg['siteKey'] ?? '');
        $ip = $request->ip();

        try {
            return match ($provider) {
                'recaptcha_v2' => self::verifyRecaptcha($secret, $responseToken, $ip, false, 0.5, $context),
                'recaptcha_v3' => self::verifyRecaptcha($secret, $responseToken, $ip, true, (float) ($cfg['minScore'] ?? 0.5), $context),
                'turnstile' => self::verifyTurnstile($secret, $responseToken, $ip),
                'hcaptcha' => self::verifyHcaptcha($secret, $siteKey, $responseToken, $ip),
                'friendly' => self::verifyFriendly($secret, $siteKey, $responseToken),
                default => ['ok' => false, 'provider' => $provider, 'error' => 'Unsupported captcha provider.'],
            };
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'provider' => $provider,
                'error' => 'Could not reach captcha verification server. Please try again.',
            ];
        }
    }

    private static function verifyBuiltInChallenge(string $context, string $answerInput, string $challengeToken): array
    {
        if (!str_contains($challengeToken, '.')) {
            \Log::warning('Captcha builtin_math failed: no_dot', ['context' => $context]);
            return ['ok' => false, 'provider' => 'builtin_math', 'error' => 'Invalid captcha challenge token. Please refresh the puzzle.'];
        }

        [$payload, $sig] = explode('.', $challengeToken, 2);
        $expectedSig = hash_hmac('sha256', $payload, (string) config('app.key', 'png101-captcha-secret'));
        if (!hash_equals($expectedSig, $sig)) {
            \Log::warning('Captcha builtin_math failed: sig_mismatch', ['context' => $context]);
            return ['ok' => false, 'provider' => 'builtin_math', 'error' => 'Captcha signature mismatch. Please try a new puzzle.'];
        }

        $decoded = json_decode((string) base64_decode($payload, true), true);
        if (!is_array($decoded) || empty($decoded['n']) || !isset($decoded['a']) || empty($decoded['e'])) {
            \Log::warning('Captcha builtin_math failed: malformed', ['context' => $context]);
            return ['ok' => false, 'provider' => 'builtin_math', 'error' => 'Malformed captcha puzzle. Please refresh.'];
        }

        if (($decoded['c'] ?? '') !== $context) {
            \Log::warning('Captcha builtin_math failed: context_mismatch', [
                'expected' => $context,
                'got' => $decoded['c'] ?? null,
            ]);
            return ['ok' => false, 'provider' => 'builtin_math', 'error' => 'Captcha context mismatch. Please refresh.'];
        }

        if ((int) $decoded['e'] < time()) {
            \Log::warning('Captcha builtin_math failed: expired', ['context' => $context]);
            return ['ok' => false, 'provider' => 'builtin_math', 'error' => 'Captcha expired. Please solve the new puzzle.'];
        }

        // Normalize standard & Unicode numerals (Arabic-Indic / Persian / Fullwidth) and whitespace
        $normalizedDigits = strtr($answerInput, [
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
            '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
            '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4',
            '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
            '０' => '0', '１' => '1', '２' => '2', '３' => '3', '４' => '4',
            '５' => '5', '６' => '6', '７' => '7', '８' => '8', '９' => '9',
            '−' => '-', '﹣' => '-', '－' => '-', '＋' => '+',
        ]);
        $cleanedInput = preg_replace('/\s+/', '', trim($normalizedDigits));
        if ($cleanedInput === '' || !preg_match('/^[+-]?\d+$/', $cleanedInput) || (int) $cleanedInput !== (int) $decoded['a']) {
            \Log::warning('Captcha builtin_math failed: wrong_answer', [
                'context' => $context,
                'input' => $cleanedInput,
                'expected' => (string) $decoded['a'],
            ]);
            return ['ok' => false, 'provider' => 'builtin_math', 'error' => 'Incorrect answer. Please try again.'];
        }

        // Prevent replay of solved puzzle token
        $nonceKey = 'captcha_nonce_used_' . sha1((string) $decoded['n']);
        if (!Cache::add($nonceKey, 1, 660)) {
            \Log::warning('Captcha builtin_math failed: replay', [
                'context' => $context,
                'nonce_sha1' => sha1((string) $decoded['n']),
            ]);
            return ['ok' => false, 'provider' => 'builtin_math', 'error' => 'This puzzle was already used. Please solve a fresh one.'];
        }

        return ['ok' => true, 'provider' => 'builtin_math'];
    }

    private static function verifyRecaptcha(string $secret, string $token, ?string $ip, bool $isV3, float $minScore, string $context): array
    {
        $res = HostingEnvironment::httpClient(8)->asForm()->post('https://www.google.com/recaptcha/api/siteverify', [
            'secret' => $secret,
            'response' => $token,
            'remoteip' => $ip,
        ]);

        $data = $res->json() ?: [];
        if (empty($data['success'])) {
            return ['ok' => false, 'provider' => $isV3 ? 'recaptcha_v3' : 'recaptcha_v2', 'error' => 'reCAPTCHA verification failed. Please try again.'];
        }

        if ($isV3) {
            $score = (float) ($data['score'] ?? 0.0);
            if ($score < $minScore) {
                return ['ok' => false, 'provider' => 'recaptcha_v3', 'error' => 'Security check score too low. Please try again.'];
            }
            if (!empty($data['action']) && $data['action'] !== $context) {
                return ['ok' => false, 'provider' => 'recaptcha_v3', 'error' => 'reCAPTCHA action mismatch. Please refresh.'];
            }
        }

        return ['ok' => true, 'provider' => $isV3 ? 'recaptcha_v3' : 'recaptcha_v2'];
    }

    private static function verifyTurnstile(string $secret, string $token, ?string $ip): array
    {
        $res = HostingEnvironment::httpClient(8)->asForm()->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
            'secret' => $secret,
            'response' => $token,
            'remoteip' => $ip,
        ]);

        $data = $res->json() ?: [];
        if (empty($data['success'])) {
            return ['ok' => false, 'provider' => 'turnstile', 'error' => 'Cloudflare Turnstile verification failed.'];
        }

        return ['ok' => true, 'provider' => 'turnstile'];
    }

    private static function verifyHcaptcha(string $secret, string $siteKey, string $token, ?string $ip): array
    {
        $payload = [
            'secret' => $secret,
            'response' => $token,
            'sitekey' => $siteKey,
        ];
        if ($ip) {
            $payload['remoteip'] = $ip;
        }

        $res = HostingEnvironment::httpClient(8)->asForm()->post('https://api.hcaptcha.com/siteverify', $payload);
        $data = $res->json() ?: [];
        if (empty($data['success'])) {
            return ['ok' => false, 'provider' => 'hcaptcha', 'error' => 'hCaptcha verification failed.'];
        }

        return ['ok' => true, 'provider' => 'hcaptcha'];
    }

    private static function verifyFriendly(string $secret, string $siteKey, string $solution): array
    {
        $res = HostingEnvironment::httpClient(8)->asJson()->post('https://api.friendlycaptcha.com/api/v1/siteverify', [
            'secret' => $secret,
            'sitekey' => $siteKey,
            'solution' => $solution,
        ]);

        $data = $res->json() ?: [];
        if (empty($data['success'])) {
            return ['ok' => false, 'provider' => 'friendly', 'error' => 'Friendly Captcha verification failed.'];
        }

        return ['ok' => true, 'provider' => 'friendly'];
    }

    /**
     * Issue a short-lived signed download pass after a download captcha is solved.
     */
    public static function issueDownloadPass(string $imageId): string
    {
        $nonce = Str::random(16);
        $expiresAt = time() + 180; // 3 minutes
        $payload = base64_encode(json_encode(['id' => $imageId, 'n' => $nonce, 'e' => $expiresAt]));
        $sig = hash_hmac('sha256', $payload, (string) config('app.key', 'png101-captcha-secret'));
        return "{$payload}.{$sig}";
    }

    public static function providerCatalog(): array
    {
        return [
            [
                'id' => 'none',
                'name' => 'Disabled (No Captcha)',
                'badge' => 'Off',
                'requiresKeys' => false,
                'summary' => 'No challenge is shown for this entry point.',
                'setupUrl' => null,
                'steps' => [],
            ],
            [
                'id' => 'builtin_math',
                'name' => 'Built-in Anti-Bot Math Puzzle',
                'badge' => 'Zero Keys • Offline Ready',
                'requiresKeys' => false,
                'summary' => 'Lightweight signed server-side math puzzle that works immediately on local & shared hosting with zero third-party scripts or external API calls.',
                'setupUrl' => null,
                'steps' => [
                    'No external account or API keys required.',
                    'Generates a cryptographically signed single-use challenge per session.',
                    'Works reliably even behind strict firewalls or privacy browsers.',
                ],
            ],
            [
                'id' => 'turnstile',
                'name' => 'Cloudflare Turnstile',
                'badge' => 'Recommended • Free',
                'requiresKeys' => true,
                'summary' => 'Modern privacy-friendly CAPTCHA alternative that verifies humans automatically without frustrating image grids.',
                'setupUrl' => 'https://dash.cloudflare.com/?to=/:account/turnstile',
                'steps' => [
                    'Sign in to Cloudflare Dashboard and open Turnstile from the sidebar.',
                    'Click "Add Widget", enter a name (e.g. PNG101), and add your website domain (plus "localhost" / "127.0.0.1" if testing locally).',
                    'Select Widget Mode: Managed (recommended), Non-Interactive, or Invisible.',
                    'Copy the generated Site Key and Secret Key into the fields below and click Save.',
                ],
            ],
            [
                'id' => 'recaptcha_v2',
                'name' => 'Google reCAPTCHA v2 ("I\'m not a robot")',
                'badge' => 'Classic Google',
                'requiresKeys' => true,
                'summary' => 'Familiar "I\'m not a robot" checkbox widget backed by Google risk analysis.',
                'setupUrl' => 'https://www.google.com/recaptcha/admin/create',
                'steps' => [
                    'Open the Google reCAPTCHA Admin Console and click "+" (Create).',
                    'Choose Challenge (v2) -> "I\'m not a robot" Checkbox.',
                    'Add your live domain under Domains (and "localhost" / "127.0.0.1" for local testing).',
                    'Copy the Site Key and Secret Key shown after submission and paste them below.',
                ],
            ],
            [
                'id' => 'recaptcha_v3',
                'name' => 'Google reCAPTCHA v3 (Invisible Score)',
                'badge' => 'Invisible • Score-Based',
                'requiresKeys' => true,
                'summary' => 'Runs invisibly in the background and returns a 0.0–1.0 trust score instead of an interactive puzzle.',
                'setupUrl' => 'https://www.google.com/recaptcha/admin/create',
                'steps' => [
                    'Open the Google reCAPTCHA Admin Console and create a new site.',
                    'Select Score based (v3) as the reCAPTCHA type.',
                    'Register your production domain (plus "localhost" for local tests).',
                    'Paste your v3 Site Key and Secret Key below and set the minimum score threshold (0.5 recommended).',
                ],
            ],
            [
                'id' => 'hcaptcha',
                'name' => 'hCaptcha',
                'badge' => 'Bot Mitigation',
                'requiresKeys' => true,
                'summary' => 'Privacy-focused challenge widget widely used to stop automated scraping and credential stuffing.',
                'setupUrl' => 'https://dashboard.hcaptcha.com/',
                'steps' => [
                    'Log in to the hCaptcha Dashboard and go to Sites -> New Site.',
                    'Add your hostname(s) under Hostnames and save the site configuration.',
                    'Copy the Sitekey from the Site settings page.',
                    'Copy your Account Secret Key from Settings -> Account Secret and paste both below.',
                ],
            ],
            [
                'id' => 'friendly',
                'name' => 'Friendly Captcha',
                'badge' => 'GDPR • Proof-of-Work',
                'requiresKeys' => true,
                'summary' => 'GDPR-compliant background crypto-puzzle solved automatically by the visitor\'s browser without tracking cookies.',
                'setupUrl' => 'https://app.friendlycaptcha.eu/',
                'steps' => [
                    'Sign in to Friendly Captcha Dashboard and create an Application.',
                    'Copy the Application Sitekey and generate an API Key (Secret).',
                    'Ensure your domain is allowed under your Friendly Captcha app settings.',
                    'Paste both Sitekey and API Key below and save.',
                ],
            ],
        ];
    }
}


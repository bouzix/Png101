<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="installer-token" content="{{ $csrfToken }}" />
    <title>Png101 Setup Wizard (v{{ $appVersion }})</title>
    <style>
        :root {
            color-scheme: dark;
            --bg: #08090e;
            --card: rgba(18, 20, 30, 0.94);
            --border: rgba(255, 255, 255, 0.09);
            --text: #ececf4;
            --muted: #9898ad;
            --accent: #6366f1;
            --accent-hover: #4f46e5;
            --ok: #10b981;
            --warn: #f59e0b;
            --err: #ef4444;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: radial-gradient(ellipse at top, #171936 0%, var(--bg) 60%);
            color: var(--text);
            min-height: 100vh;
            padding: 32px 16px 64px;
            line-height: 1.5;
        }
        .container { max-width: 780px; margin: 0 auto; }
        .header {
            text-align: center;
            margin-bottom: 28px;
        }
        .brand {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: #fff;
        }
        .brand-mark {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            display: grid;
            place-items: center;
            font-size: 16px;
            font-weight: 800;
        }
        .subtitle { color: var(--muted); font-size: 14px; margin-top: 6px; }
        .stepper {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
            margin-bottom: 24px;
        }
        .step-pill {
            padding: 10px 8px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border);
            text-align: center;
            font-size: 12px;
            color: var(--muted);
            font-weight: 600;
            transition: all 0.2s;
        }
        .step-pill.active {
            background: rgba(99, 102, 241, 0.16);
            border-color: rgba(99, 102, 241, 0.55);
            color: #fff;
        }
        .step-pill.done {
            background: rgba(16, 185, 129, 0.12);
            border-color: rgba(16, 185, 129, 0.4);
            color: #6ee7b7;
        }
        .card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 28px;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
        }
        h2 { font-size: 19px; font-weight: 700; margin-bottom: 6px; color: #fff; }
        .desc { font-size: 13.5px; color: var(--muted); margin-bottom: 22px; }
        .panel { display: none; }
        .panel.active { display: block; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 640px) {
            .grid-2 { grid-template-columns: 1fr; }
            .stepper { grid-template-columns: 1fr 1fr; }
        }
        .field { margin-bottom: 14px; }
        label {
            display: block;
            font-size: 12.5px;
            font-weight: 600;
            color: #c8c8d8;
            margin-bottom: 6px;
        }
        input[type="text"], input[type="password"], input[type="email"], input[type="number"], textarea {
            width: 100%;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 10px;
            padding: 10px 12px;
            color: #fff;
            font-size: 14px;
            outline: none;
            transition: border-color 0.15s;
        }
        input:focus, textarea:focus { border-color: var(--accent); }
        .hint { font-size: 12px; color: var(--muted); margin-top: 4px; }
        .callout {
            background: rgba(99, 102, 241, 0.1);
            border: 1px solid rgba(99, 102, 241, 0.28);
            border-radius: 12px;
            padding: 12px 14px;
            font-size: 13px;
            color: #c7d2fe;
            margin-bottom: 18px;
        }
        .callout.warn {
            background: rgba(245, 158, 11, 0.1);
            border-color: rgba(245, 158, 11, 0.35);
            color: #fde68a;
        }
        .callout.ok {
            background: rgba(16, 185, 129, 0.12);
            border-color: rgba(16, 185, 129, 0.35);
            color: #a7f3d0;
        }
        .callout.err {
            background: rgba(239, 68, 68, 0.12);
            border-color: rgba(239, 68, 68, 0.35);
            color: #fecaca;
        }
        .check-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
            gap: 8px;
            margin-bottom: 18px;
        }
        .check-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 9px 12px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border);
            border-radius: 10px;
            font-size: 13px;
        }
        .dot {
            font-size: 11px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 999px;
        }
        .dot-ok { background: rgba(16, 185, 129, 0.16); color: #34d399; }
        .dot-err { background: rgba(239, 68, 68, 0.16); color: #f87171; }
        .dot-warn { background: rgba(245, 158, 11, 0.16); color: #fbbf24; }
        .btn-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-top: 24px;
            padding-top: 18px;
            border-top: 1px solid var(--border);
        }
        button, .btn-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px 18px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            border: none;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.15s;
        }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary { background: var(--accent); color: #fff; }
        .btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.07);
            color: var(--text);
            border: 1px solid var(--border);
        }
        .btn-secondary:hover:not(:disabled) { background: rgba(255, 255, 255, 0.12); }
        .log-list {
            display: grid;
            gap: 8px;
            margin: 16px 0;
        }
        .log-row {
            padding: 10px 12px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border);
            font-size: 13px;
        }
        .log-row strong { color: #fff; }
        .log-detail { color: var(--muted); font-size: 12px; margin-top: 2px; white-space: pre-wrap; word-break: break-word; }
        .section-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin: 14px 0 8px; }
        .checkbox-row { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: #d4d4e4; margin-top: 6px; }
        .checkbox-row input { width: 16px; height: 16px; accent-color: var(--accent); }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <div class="brand">
            <div class="brand-mark">P</div>
            <span>Png101 Installer</span>
        </div>
        <p class="subtitle">Guided Setup Wizard for Shared Hosting &bull; v{{ $appVersion }}</p>
    </div>

    @if($alreadyInstalled)
        <div class="card">
            <h2>Png101 Is Already Installed</h2>
            <p class="desc">
                The installer lock file (<code>storage/installed</code>) is active, so setup routes are locked for security.
            </p>
            <div class="callout ok">
                <div><strong>Installed Version:</strong> v{{ $installedState['version'] ?? $appVersion }}</div>
                @if(!empty($installedState['installed_at']))
                    <div><strong>Installed At:</strong> {{ $installedState['installed_at'] }}</div>
                @endif
                @if(!empty($installedState['git_commit']))
                    <div><strong>Git Commit:</strong> <code>{{ substr($installedState['git_commit'], 0, 7) }}</code></div>
                @endif
            </div>
            <p style="font-size:13px;color:var(--muted);margin-bottom:20px;">
                Need to deploy new code from GitHub? Use the protected <a href="/update" style="color:#a5b4fc;">/update</a> manager.
                If you intentionally want to wipe setup and re-run the wizard, delete <code>storage/installed</code> from cPanel File Manager.
            </p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <a href="/" class="btn-link btn-primary">Open Website</a>
                <a href="/admin" class="btn-link btn-secondary">Admin Login</a>
                <a href="/update" class="btn-link btn-secondary">Open Updater (/update)</a>
            </div>
        </div>
    @else
        <div class="stepper" id="stepper">
            <div class="step-pill active" data-step="1">1. Server</div>
            <div class="step-pill" data-step="2">2. Site Info</div>
            <div class="step-pill" data-step="3">3. Database</div>
            <div class="step-pill" data-step="4">4. Admin &amp; AI</div>
            <div class="step-pill" data-step="5">5. Finish</div>
        </div>

        <div class="card">
            <!-- STEP 1: SERVER REQUIREMENTS -->
            <section class="panel active" id="step-1">
                <h2>Server &amp; Permissions Check</h2>
                <p class="desc">Verifying your Namecheap hosting PHP version, extensions, and writable directories.</p>

                <div class="section-label">Runtime &amp; Dependencies</div>
                <div class="check-grid">
                    <div class="check-item">
                        <span>PHP ({{ $requirements['php_version'] }})</span>
                        <span class="dot {{ $requirements['php_ok'] ? 'dot-ok' : 'dot-err' }}">
                            {{ $requirements['php_ok'] ? 'OK' : 'Need 8.3+' }}
                        </span>
                    </div>
                    <div class="check-item">
                        <span>Composer (vendor)</span>
                        <span class="dot {{ $requirements['vendor_ok'] ? 'dot-ok' : 'dot-err' }}">
                            {{ $requirements['vendor_ok'] ? 'Ready' : 'Missing' }}
                        </span>
                    </div>
                    <div class="check-item">
                        <span>Vite Frontend Build</span>
                        <span class="dot {{ $requirements['build_manifest_ok'] ? 'dot-ok' : 'dot-warn' }}">
                            {{ $requirements['build_manifest_ok'] ? 'Built' : 'Missing' }}
                        </span>
                    </div>
                </div>

                @if(!$requirements['build_manifest_ok'])
                    <div class="callout warn">
                        <strong>Notice:</strong> <code>public/build/manifest.json</code> was not found. Make sure you build frontend assets
                        (<code>npm run build</code>) and push/upload <code>public/build/</code> before opening the public site.
                    </div>
                @endif

                <div class="section-label">PHP Extensions</div>
                <div class="check-grid">
                    @foreach($requirements['extensions'] as $ext => $loaded)
                        <div class="check-item">
                            <span>{{ $ext }}</span>
                            <span class="dot {{ $loaded ? 'dot-ok' : 'dot-err' }}">{{ $loaded ? 'OK' : 'Missing' }}</span>
                        </div>
                    @endforeach
                </div>

                <div class="section-label">Directory Permissions</div>
                <div class="check-grid">
                    @foreach($requirements['permissions'] as $dir => $writable)
                        <div class="check-item">
                            <span>{{ $dir }}</span>
                            <span class="dot {{ $writable ? 'dot-ok' : 'dot-err' }}">{{ $writable ? 'Writable' : 'Fix perms' }}</span>
                        </div>
                    @endforeach
                </div>

                @if(!$requirements['all_passed'])
                    <div class="callout err">
                        One or more required checks failed. In cPanel, select PHP 8.3+, enable required extensions, or set folder permissions to <code>775</code>.
                    </div>
                @endif

                <div class="btn-row">
                    <span style="font-size:12px;color:var(--muted);">Ready for setup</span>
                    <button type="button" class="btn-primary" onclick="goStep(2)" {{ $requirements['all_passed'] ? '' : 'disabled' }}>
                        Continue &rarr;
                    </button>
                </div>
            </section>

            <!-- STEP 2: SITE & APP INFO -->
            <section class="panel" id="step-2">
                <h2>Application &amp; Website Info</h2>
                <p class="desc">Configure your site domain and brand details stored in <code>.env</code> and <code>WebsiteInfo</code>.</p>

                <div class="grid-2">
                    <div class="field">
                        <label for="app_name">Website / App Name</label>
                        <input id="app_name" type="text" value="{{ $defaults['app_name'] }}" required />
                    </div>
                    <div class="field">
                        <label for="app_url">Site URL (with https://)</label>
                        <input id="app_url" type="text" value="{{ $defaults['app_url'] }}" required />
                    </div>
                </div>

                <div class="field">
                    <label for="tagline">Site Tagline</label>
                    <input id="tagline" type="text" value="{{ $defaults['tagline'] }}" />
                </div>

                <div class="grid-2">
                    <div class="field">
                        <label for="contact_email">Contact Email</label>
                        <input id="contact_email" type="email" value="{{ $defaults['contact_email'] }}" />
                    </div>
                    <div class="field">
                        <label for="dmca_email">DMCA Email</label>
                        <input id="dmca_email" type="email" value="{{ $defaults['dmca_email'] }}" />
                    </div>
                </div>

                <div class="grid-2">
                    <div class="field">
                        <label for="company_name">Company / Brand Name</label>
                        <input id="company_name" type="text" value="{{ $defaults['company_name'] }}" />
                    </div>
                    <div class="field">
                        <label for="country">Country</label>
                        <input id="country" type="text" value="United States" />
                    </div>
                </div>

                <div class="checkbox-row">
                    <input id="app_debug" type="checkbox" />
                    <label for="app_debug" style="margin:0;cursor:pointer;">Enable Debug Mode (keep unchecked in production)</label>
                </div>

                <div class="btn-row">
                    <button type="button" class="btn-secondary" onclick="goStep(1)">&larr; Back</button>
                    <button type="button" class="btn-primary" onclick="goStep(3)">Continue &rarr;</button>
                </div>
            </section>

            <!-- STEP 3: DATABASE -->
            <section class="panel" id="step-3">
                <h2>MySQL Database Configuration</h2>
                <p class="desc">Enter the MySQL database details you created in Namecheap cPanel &rarr; MySQL&reg; Databases.</p>

                <div class="callout">
                    <strong>Namecheap Tip:</strong> Database name and username usually include your cPanel prefix
                    (e.g. <code>cpaneluser_png101</code>), and host is typically <code>localhost</code>. Make sure the user is added to the database with <strong>ALL PRIVILEGES</strong>.
                </div>

                <div class="grid-2">
                    <div class="field">
                        <label for="db_host">Database Host</label>
                        <input id="db_host" type="text" value="{{ $defaults['db_host'] }}" required />
                    </div>
                    <div class="field">
                        <label for="db_port">Port</label>
                        <input id="db_port" type="number" value="{{ $defaults['db_port'] }}" required />
                    </div>
                </div>

                <div class="field">
                    <label for="db_database">Database Name</label>
                    <input id="db_database" type="text" placeholder="e.g. cpaneluser_png101" required />
                </div>

                <div class="grid-2">
                    <div class="field">
                        <label for="db_username">Database Username</label>
                        <input id="db_username" type="text" placeholder="e.g. cpaneluser_dbuser" required />
                    </div>
                    <div class="field">
                        <label for="db_password">Database Password</label>
                        <input id="db_password" type="password" placeholder="Database password" />
                    </div>
                </div>

                <div id="db-test-result" style="display:none;"></div>

                <div class="btn-row">
                    <button type="button" class="btn-secondary" onclick="goStep(2)">&larr; Back</button>
                    <div style="display:flex;gap:10px;">
                        <button type="button" class="btn-secondary" id="test-db-btn" onclick="testDatabase()">Test Connection</button>
                        <button type="button" class="btn-primary" id="db-next-btn" onclick="goStep(4)">Continue &rarr;</button>
                    </div>
                </div>
            </section>

            <!-- STEP 4: ADMIN & AI -->
            <section class="panel" id="step-4">
                <h2>Super Admin &amp; Optional Settings</h2>
                <p class="desc">Set your Super Admin password used for <code>/admin</code> and <code>/update</code>.</p>

                <div class="grid-2">
                    <div class="field">
                        <label for="admin_password">Super Admin Password (min 8 chars)</label>
                        <input id="admin_password" type="password" placeholder="Choose a strong password" required />
                    </div>
                    <div class="field">
                        <label for="admin_password_confirm">Confirm Admin Password</label>
                        <input id="admin_password_confirm" type="password" placeholder="Repeat password" required />
                    </div>
                </div>

                <div class="field">
                    <label for="gemini_api_key">Google Gemini API Key (Optional)</label>
                    <input id="gemini_api_key" type="text" placeholder="AIza... (leave blank to add later in Admin Settings)" />
                    <div class="hint">Used for AI auto-tagging, descriptions, and collection generation.</div>
                </div>

                <div class="field">
                    <label for="update_secret">Backup Updater Secret Key (Optional)</label>
                    <input id="update_secret" type="text" placeholder="Optional fallback PIN/key stored in .env as APP_UPDATE_SECRET" />
                    <div class="hint">Normally your Super Admin password unlocks <code>/update</code>; this provides a fallback if needed.</div>
                </div>

                <div id="install-error" style="display:none;"></div>

                <div class="btn-row">
                    <button type="button" class="btn-secondary" onclick="goStep(3)">&larr; Back</button>
                    <button type="button" class="btn-primary" id="run-install-btn" onclick="runInstallation()">
                        Install Png101 Now
                    </button>
                </div>
            </section>

            <!-- STEP 5: LOG & FINISH -->
            <section class="panel" id="step-5">
                <h2 id="finish-title">Installing Png101...</h2>
                <p class="desc" id="finish-desc">Writing environment config, running migrations, and generating SEO files.</p>

                <div class="log-list" id="install-logs"></div>

                <div id="finish-actions" style="display:none;margin-top:22px;">
                    <div class="callout ok" style="margin-bottom:16px;">
                        <strong>Installation Complete!</strong> <code>/install</code> is now locked. Keep <code>/update</code> bookmarked for future GitHub deployments.
                    </div>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        <a href="/" class="btn-link btn-primary">Visit Homepage</a>
                        <a href="/admin" class="btn-link btn-secondary">Sign In to Admin</a>
                        <a href="/update" class="btn-link btn-secondary">View Updater (/update)</a>
                    </div>
                </div>
            </section>
        </div>
    @endif
</div>

@if(!$alreadyInstalled)
<script>
const csrfToken = document.querySelector('meta[name="installer-token"]').getAttribute('content');
let currentStep = 1;

function goStep(step) {
    currentStep = step;
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('step-' + step).classList.add('active');

    document.querySelectorAll('.step-pill').forEach(pill => {
        const n = Number(pill.dataset.step);
        pill.classList.remove('active', 'done');
        if (n < step) pill.classList.add('done');
        else if (n === step) pill.classList.add('active');
    });
}

function getFormPayload() {
    return {
        app_name: document.getElementById('app_name').value.trim(),
        app_url: document.getElementById('app_url').value.trim(),
        tagline: document.getElementById('tagline').value.trim(),
        contact_email: document.getElementById('contact_email').value.trim(),
        dmca_email: document.getElementById('dmca_email').value.trim(),
        company_name: document.getElementById('company_name').value.trim(),
        country: document.getElementById('country').value.trim(),
        app_debug: document.getElementById('app_debug').checked,
        db_host: document.getElementById('db_host').value.trim(),
        db_port: document.getElementById('db_port').value.trim(),
        db_database: document.getElementById('db_database').value.trim(),
        db_username: document.getElementById('db_username').value.trim(),
        db_password: document.getElementById('db_password').value,
        admin_password: document.getElementById('admin_password').value,
        admin_password_confirm: document.getElementById('admin_password_confirm').value,
        gemini_api_key: document.getElementById('gemini_api_key').value.trim(),
        update_secret: document.getElementById('update_secret').value.trim(),
    };
}

function showBox(elId, type, html) {
    const el = document.getElementById(elId);
    el.className = 'callout ' + type;
    el.innerHTML = html;
    el.style.display = 'block';
}

async function testDatabase() {
    const btn = document.getElementById('test-db-btn');
    btn.disabled = true;
    btn.textContent = 'Testing...';
    const payload = getFormPayload();

    try {
        const res = await fetch('/install/test-db', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Installer-Token': csrfToken,
            },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.ok) {
            showBox('db-test-result', 'ok', escapeHtml(data.message));
        } else {
            showBox('db-test-result', 'err', escapeHtml(data.message || 'Database test failed.'));
        }
    } catch (e) {
        showBox('db-test-result', 'err', 'Request error while testing connection.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Test Connection';
    }
}

async function runInstallation() {
    const payload = getFormPayload();
    if (!payload.admin_password || payload.admin_password.length < 8) {
        showBox('install-error', 'err', 'Super Admin password must be at least 8 characters.');
        return;
    }
    if (payload.admin_password !== payload.admin_password_confirm) {
        showBox('install-error', 'err', 'Password confirmation does not match.');
        return;
    }

    document.getElementById('install-error').style.display = 'none';
    const btn = document.getElementById('run-install-btn');
    btn.disabled = true;
    btn.textContent = 'Installing...';

    goStep(5);
    const logContainer = document.getElementById('install-logs');
    logContainer.innerHTML = '<div class="log-row"><strong>Running installer...</strong><div class="log-detail">Please wait while tables and configuration are created.</div></div>';

    try {
        const res = await fetch('/install/run', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Installer-Token': csrfToken,
            },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        renderLogs(logContainer, data.steps || []);

        if (data.ok) {
            document.getElementById('finish-title').textContent = 'Png101 Installed Successfully!';
            document.getElementById('finish-desc').textContent = 'Everything is migrated and ready for use.';
            document.getElementById('finish-actions').style.display = 'block';
        } else {
            document.getElementById('finish-title').textContent = 'Installation Needs Attention';
            document.getElementById('finish-desc').textContent = data.message || 'Please review the step error below and go back to fix it.';
            const backDiv = document.createElement('div');
            backDiv.className = 'btn-row';
            backDiv.innerHTML = '<button type="button" class="btn-secondary" onclick="goStep(3)">&larr; Back to Settings</button>';
            logContainer.appendChild(backDiv);
        }
    } catch (e) {
        logContainer.innerHTML = '<div class="callout err">Unexpected error during installation. Check PHP error logs.</div>';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Install Png101 Now';
    }
}

function renderLogs(container, steps) {
    container.innerHTML = '';
    steps.forEach(s => {
        const badgeClass = s.status === 'ok' ? 'dot-ok' : (s.status === 'warn' ? 'dot-warn' : 'dot-err');
        const label = s.status === 'ok' ? 'DONE' : (s.status === 'warn' ? 'WARN' : 'FAIL');
        const row = document.createElement('div');
        row.className = 'log-row';
        row.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                <strong>${escapeHtml(s.step)}</strong>
                <span class="dot ${badgeClass}">${label}</span>
            </div>
            <div class="log-detail">${escapeHtml(s.detail || '')}</div>
        `;
        container.appendChild(row);
    });
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}
</script>
@endif
</body>
</html>

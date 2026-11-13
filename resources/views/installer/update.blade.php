<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="updater-token" content="{{ $csrfToken }}" />
    <title>Png101 Updater (v{{ $appVersion }})</title>
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
        .container { max-width: 820px; margin: 0 auto; }
        .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }
        .brand { display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 800; color: #fff; }
        .brand-mark {
            width: 34px; height: 34px; border-radius: 10px;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            display: grid; place-items: center; font-weight: 800;
        }
        .card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 26px;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
            margin-bottom: 18px;
        }
        h2 { font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 6px; }
        .desc { font-size: 13.5px; color: var(--muted); margin-bottom: 18px; }
        .stat-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
            gap: 10px;
            margin-bottom: 18px;
        }
        .stat {
            padding: 12px 14px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border);
        }
        .stat-label { font-size: 11.5px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
        .stat-val { font-size: 15px; font-weight: 700; color: #fff; margin-top: 4px; }
        .dot {
            display: inline-block;
            font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 999px;
        }
        .dot-ok { background: rgba(16, 185, 129, 0.16); color: #34d399; }
        .dot-warn { background: rgba(245, 158, 11, 0.16); color: #fbbf24; }
        .dot-err { background: rgba(239, 68, 68, 0.16); color: #f87171; }
        .callout {
            border-radius: 12px; padding: 12px 14px; font-size: 13px; margin-bottom: 16px;
            background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.28); color: #c7d2fe;
        }
        .callout.ok { background: rgba(16, 185, 129, 0.12); border-color: rgba(16, 185, 129, 0.35); color: #a7f3d0; }
        .callout.warn { background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.35); color: #fde68a; }
        .callout.err { background: rgba(239, 68, 68, 0.12); border-color: rgba(239, 68, 68, 0.35); color: #fecaca; }
        input[type="password"] {
            width: 100%; background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 10px;
            padding: 11px 13px; color: #fff; font-size: 14px; margin-bottom: 14px;
        }
        button, .btn-link {
            display: inline-flex; align-items: center; justify-content: center; gap: 8px;
            padding: 10px 18px; border-radius: 10px; font-size: 13.5px; font-weight: 600;
            border: none; cursor: pointer; text-decoration: none; transition: all 0.15s;
        }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary { background: var(--accent); color: #fff; }
        .btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
        .btn-secondary { background: rgba(255, 255, 255, 0.07); color: var(--text); border: 1px solid var(--border); }
        .btn-secondary:hover:not(:disabled) { background: rgba(255, 255, 255, 0.12); }
        .opt-list { display: grid; gap: 10px; margin: 14px 0 20px; }
        .opt-row {
            display: flex; align-items: flex-start; gap: 10px; padding: 11px 13px;
            background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: 11px;
            cursor: pointer; font-size: 13.5px;
        }
        .opt-row input { width: 16px; height: 16px; margin-top: 2px; accent-color: var(--accent); }
        .opt-sub { font-size: 12px; color: var(--muted); }
        .log-list { display: grid; gap: 8px; margin-top: 16px; }
        .log-row {
            padding: 10px 12px; border-radius: 10px;
            background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); font-size: 13px;
        }
        .log-detail { color: var(--muted); font-size: 12px; margin-top: 2px; white-space: pre-wrap; word-break: break-word; }
        ol.steps-guide { padding-left: 18px; color: #c4c4d4; font-size: 13px; display: grid; gap: 6px; }
    </style>
</head>
<body>
<div class="container">
    <div class="topbar">
        <div class="brand">
            <div class="brand-mark">P</div>
            <span>Png101 Updater</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <a href="/" class="btn-link btn-secondary">Website</a>
            <a href="/admin/dashboard" class="btn-link btn-secondary">Admin Dashboard</a>
            @if($authenticated)
                <button type="button" class="btn-secondary" onclick="logoutUpdater()">Lock Updater</button>
            @endif
        </div>
    </div>

    @if(!$authenticated)
        <div class="card" style="max-width:480px;margin:40px auto;">
            <h2>Super Admin Authentication</h2>
            <p class="desc">Enter your Super Admin password (or backup <code>APP_UPDATE_SECRET</code>) to access deployment updates.</p>

            <div id="auth-err" style="display:none;"></div>

            <form onsubmit="unlockUpdater(event)">
                <input id="updater-password" type="password" placeholder="Super Admin Password" required autofocus />
                <button type="submit" class="btn-primary" id="unlock-btn" style="width:100%;">Unlock Updater</button>
            </form>
        </div>
    @else
        @if(!empty($diagnostics['has_pending_updates']))
            <div class="callout warn">
                <strong>New Update Ready to Apply!</strong>
                @if(!empty($diagnostics['new_commit_detected']))
                    A new Git commit (<code>{{ $diagnostics['git']['short_commit'] ?? '?' }}</code>) was pulled into hosting files since the last applied update
                    (<code>{{ $diagnostics['recorded_short_commit'] ?? 'initial' }}</code>).
                @endif
                @if(count($diagnostics['pending_migrations'] ?? []) > 0)
                    Found <strong>{{ count($diagnostics['pending_migrations']) }}</strong> pending database migration(s).
                @endif
            </div>
        @endif

        <div class="card">
            <h2>Deployment &amp; Version Status</h2>
            <p class="desc">cPanel Git &amp; Database health overview for your Png101 installation.</p>

            <div class="stat-grid">
                <div class="stat">
                    <div class="stat-label">Code Version</div>
                    <div class="stat-val">v{{ $diagnostics['app_version'] }}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Last Applied</div>
                    <div class="stat-val">
                        v{{ $diagnostics['installed_version'] }}
                        @if(!empty($diagnostics['recorded_short_commit']))
                            <span style="font-size:12px;color:var(--muted);">({{ $diagnostics['recorded_short_commit'] }})</span>
                        @endif
                    </div>
                </div>
                <div class="stat">
                    <div class="stat-label">Git HEAD on Server</div>
                    <div class="stat-val">
                        @if(!empty($diagnostics['git']['has_git']))
                            {{ $diagnostics['git']['branch'] ?? 'main' }} &bull; <code>{{ $diagnostics['git']['short_commit'] ?? 'n/a' }}</code>
                        @else
                            <span style="color:var(--muted);">No .git dir</span>
                        @endif
                    </div>
                </div>
                <div class="stat">
                    <div class="stat-label">Pending Migrations</div>
                    <div class="stat-val">
                        @if(count($diagnostics['pending_migrations']) > 0)
                            <span class="dot dot-warn">{{ count($diagnostics['pending_migrations']) }} Pending</span>
                        @else
                            <span class="dot dot-ok">Up to date</span>
                        @endif
                    </div>
                </div>
                <div class="stat">
                    <div class="stat-label">Database</div>
                    <div class="stat-val">
                        <span class="dot {{ $diagnostics['db_connected'] ? 'dot-ok' : 'dot-err' }}">
                            {{ $diagnostics['db_connected'] ? 'Connected' : 'Error' }}
                        </span>
                    </div>
                </div>
                <div class="stat">
                    <div class="stat-label">Vite Frontend Build</div>
                    <div class="stat-val">
                        <span class="dot {{ $diagnostics['build_manifest_ok'] ? 'dot-ok' : 'dot-warn' }}">
                            {{ $diagnostics['build_manifest_ok'] ? 'Ready' : 'Missing' }}
                        </span>
                    </div>
                </div>
            </div>

            @if(!$diagnostics['build_manifest_ok'])
                <div class="callout warn">
                    <code>public/build/manifest.json</code> is missing. Run <code>npm run build</code> locally before pushing to GitHub, or upload <code>public/build/</code>.
                </div>
            @endif

            @if(!empty($diagnostics['pending_migrations']))
                <div class="callout">
                    <strong>Pending migrations:</strong>
                    <code>{{ implode(', ', $diagnostics['pending_migrations']) }}</code>
                </div>
            @endif

            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button type="button" class="btn-secondary" id="check-remote-btn" onclick="checkRemote()">
                    Check GitHub Remote
                </button>
            </div>
            <div id="remote-result" style="display:none;margin-top:12px;"></div>
        </div>

        <div class="card">
            <h2>Apply Updates</h2>
            <p class="desc">After pulling updates from GitHub in Namecheap cPanel &rarr; Git&trade; Version Control, click <strong>Apply Updates Now</strong>.</p>

            <div class="opt-list">
                @if(!empty($diagnostics['can_shell_git']))
                    <label class="opt-row">
                        <input type="checkbox" id="opt_pull_git" />
                        <div>
                            <div><strong>Pull latest code from GitHub (<code>git pull --ff-only</code>)</strong></div>
                            <div class="opt-sub">Optional if you already clicked "Update from Remote" inside Namecheap cPanel.</div>
                        </div>
                    </label>
                @endif
                <label class="opt-row">
                    <input type="checkbox" id="opt_run_migrations" checked />
                    <div>
                        <div><strong>Run Database Migrations</strong></div>
                        <div class="opt-sub">Applies any new schema changes safely without touching existing data.</div>
                    </div>
                </label>
                <label class="opt-row">
                    <input type="checkbox" id="opt_refresh_caches" checked />
                    <div>
                        <div><strong>Clear &amp; Refresh Caches</strong></div>
                        <div class="opt-sub">Flushes old config, routes, and compiled Blade views after code changes.</div>
                    </div>
                </label>
                <label class="opt-row">
                    <input type="checkbox" id="opt_regen_seo" checked />
                    <div>
                        <div><strong>Regenerate Sitemaps &amp; SEO Files</strong></div>
                        <div class="opt-sub">Updates <code>sitemap*.xml</code>, <code>robots.txt</code>, and <code>llms.txt</code>.</div>
                    </div>
                </label>
                <label class="opt-row">
                    <input type="checkbox" id="opt_maintenance_mode" />
                    <div>
                        <div><strong>Briefly Enable Maintenance Mode While Updating</strong></div>
                        <div class="opt-sub">Automatically brings the site back online immediately when finished.</div>
                    </div>
                </label>
            </div>

            <button type="button" class="btn-primary" id="run-update-btn" onclick="runUpdate()">
                Apply Updates Now
            </button>

            <div id="update-result" style="display:none;margin-top:16px;"></div>
            <div class="log-list" id="update-logs"></div>
        </div>

        <div class="card">
            <h2>Recommended GitHub &rarr; Namecheap Update Workflow</h2>
            <ol class="steps-guide">
                <li>Build frontend assets locally (<code>npm run build</code>) when you change React/UI files and push to GitHub (<code>origin main</code>).</li>
                <li>In Namecheap cPanel, open <strong>Git&trade; Version Control &rarr; Manage &rarr; Pull or Deploy</strong> and click <strong>Update from Remote</strong>.</li>
                <li>Open <code>/update</code> and click <strong>Apply Updates Now</strong> to migrate the database, clear caches, and refresh SEO files.</li>
            </ol>
        </div>
    @endif
</div>

<script>
const updaterToken = document.querySelector('meta[name="updater-token"]').getAttribute('content');

async function unlockUpdater(e) {
    e.preventDefault();
    const btn = document.getElementById('unlock-btn');
    const err = document.getElementById('auth-err');
    err.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Verifying...';

    try {
        const res = await fetch('/update/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Updater-Token': updaterToken,
            },
            body: JSON.stringify({ password: document.getElementById('updater-password').value }),
        });
        const data = await res.json();
        if (data.ok) {
            window.location.reload();
        } else {
            err.className = 'callout err';
            err.textContent = data.message || 'Authentication failed.';
            err.style.display = 'block';
        }
    } catch (e) {
        err.className = 'callout err';
        err.textContent = 'Request failed.';
        err.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Unlock Updater';
    }
}

async function logoutUpdater() {
    await fetch('/update/logout', { method: 'POST', headers: { 'X-Updater-Token': updaterToken } });
    window.location.reload();
}

async function checkRemote() {
    const btn = document.getElementById('check-remote-btn');
    const box = document.getElementById('remote-result');
    btn.disabled = true;
    btn.textContent = 'Checking...';
    box.style.display = 'none';

    try {
        const res = await fetch('/update/check-remote', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'X-Updater-Token': updaterToken },
        });
        const data = await res.json();
        box.className = 'callout ' + (data.ok ? (data.commits_behind > 0 ? 'warn' : 'ok') : 'warn');
        let html = escapeHtml(data.message || 'Done');
        if (data.incoming_commits && data.incoming_commits.length) {
            html += '<div style="margin-top:8px;font-family:monospace;font-size:12px;">' +
                data.incoming_commits.map(c => escapeHtml(c)).join('<br>') + '</div>';
        }
        box.innerHTML = html;
        box.style.display = 'block';
    } catch (e) {
        box.className = 'callout err';
        box.textContent = 'Error checking remote status.';
        box.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Check GitHub Remote';
    }
}

async function runUpdate() {
    const btn = document.getElementById('run-update-btn');
    const resBox = document.getElementById('update-result');
    const logsEl = document.getElementById('update-logs');

    btn.disabled = true;
    btn.textContent = 'Applying Updates...';
    resBox.style.display = 'none';
    logsEl.innerHTML = '<div class="log-row"><strong>Executing update tasks...</strong></div>';

    const payload = {
        pull_git: Boolean(document.getElementById('opt_pull_git')?.checked),
        run_migrations: document.getElementById('opt_run_migrations').checked,
        refresh_caches: document.getElementById('opt_refresh_caches').checked,
        regen_seo: document.getElementById('opt_regen_seo').checked,
        maintenance_mode: document.getElementById('opt_maintenance_mode').checked,
    };

    try {
        const res = await fetch('/update/run', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Updater-Token': updaterToken,
            },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        resBox.className = 'callout ' + (data.ok ? 'ok' : 'err');
        resBox.textContent = data.message || (data.ok ? 'Updated!' : 'Update failed.');
        resBox.style.display = 'block';

        logsEl.innerHTML = '';
        (data.steps || []).forEach(s => {
            const cls = s.status === 'ok' ? 'dot-ok' : (s.status === 'warn' ? 'dot-warn' : 'dot-err');
            const lbl = s.status === 'ok' ? 'DONE' : (s.status === 'warn' ? 'WARN' : 'FAIL');
            const row = document.createElement('div');
            row.className = 'log-row';
            row.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                    <strong>${escapeHtml(s.step)}</strong>
                    <span class="dot ${cls}">${lbl}</span>
                </div>
                <div class="log-detail">${escapeHtml(s.detail || '')}</div>
            `;
            logsEl.appendChild(row);
        });
    } catch (e) {
        resBox.className = 'callout err';
        resBox.textContent = 'Unexpected request error during update.';
        resBox.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Apply Updates Now';
    }
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}
</script>
</body>
</html>


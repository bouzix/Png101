<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Png101 &mdash; Hosting Only</title>
    <style>
        :root { color-scheme: dark; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: radial-gradient(circle at top, #18182b 0%, #09090d 65%);
            color: #e4e4ec;
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
        }
        .card {
            max-width: 540px;
            width: 100%;
            background: rgba(20, 20, 30, 0.92);
            border: 1px solid rgba(255, 255, 255, 0.09);
            border-radius: 20px;
            padding: 36px 32px;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
        }
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            border-radius: 999px;
            background: rgba(245, 158, 11, 0.14);
            border: 1px solid rgba(245, 158, 11, 0.3);
            color: #fbbf24;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.02em;
            margin-bottom: 18px;
        }
        h1 { font-size: 24px; font-weight: 700; margin-bottom: 10px; color: #fff; }
        p { color: #a1a1b5; line-height: 1.65; font-size: 14px; margin-bottom: 16px; }
        .meta {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.07);
            border-radius: 12px;
            padding: 14px 16px;
            font-size: 13px;
            color: #c4c4d4;
            margin-bottom: 24px;
            display: grid;
            gap: 6px;
        }
        .meta code { color: #93c5fd; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
        .actions { display: flex; flex-wrap: wrap; gap: 10px; }
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 10px 18px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.15s ease;
        }
        .btn-primary { background: #6366f1; color: #fff; }
        .btn-primary:hover { background: #4f46e5; }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.07);
            color: #e4e4ec;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.12); }
    </style>
</head>
<body>
    <main class="card">
        <div class="badge">Local Development Guard &bull; HTTP 403</div>
        <h1>Hosting-Only Tool</h1>
        <p>
            <code>{{ $path }}</code> is intentionally disabled in your local development environment so it never
            interrupts your local workflow or modifies your local <code>.env</code> and database.
        </p>
        <div class="meta">
            <div>Detected host: <code>{{ $host }}</code></div>
            <div>Environment: <code>{{ $env }}</code></div>
            <div>Available when deployed to: <strong>Namecheap / Production Hosting</strong></div>
        </div>
        <div class="actions">
            <a href="/" class="btn btn-primary">Go to Homepage</a>
            <a href="/admin" class="btn btn-secondary">Open Admin Login</a>
        </div>
    </main>
</body>
</html>


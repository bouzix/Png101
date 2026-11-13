<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap" rel="stylesheet" />

    @php
        $seo = $page['props']['seo'] ?? [];
        $websiteInfo = $page['props']['websiteInfo'] ?? [];
        $codeInjection = $page['props']['codeInjection'] ?? [];
        $siteTitle = $websiteInfo['websiteName'] ?? 'Png101';
        $pageTitle = $seo['title'] ?? $siteTitle;
        $pageDesc = $seo['description'] ?? ($websiteInfo['tagline'] ?? 'Discover and download free, high-resolution transparent PNG images.');
    @endphp

    <title inertia>{{ $pageTitle }}</title>
    <meta name="description" content="{{ $pageDesc }}" />
    @if(!empty($seo['ogTitle']))
        <meta property="og:title" content="{{ $seo['ogTitle'] }}" />
    @endif
    @if(!empty($seo['ogDescription']))
        <meta property="og:description" content="{{ $seo['ogDescription'] }}" />
    @endif
    @if(!empty($seo['ogImage']))
        <meta property="og:image" content="{{ $seo['ogImage'] }}" />
    @endif
    @if(!empty($seo['jsonLd']))
        <script type="application/ld+json">{!! json_encode($seo['jsonLd'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}</script>
    @endif

    <script>
        (function() {
            try {
                var saved = localStorage.getItem('theme');
                if (saved === 'light') {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                } else {
                    document.documentElement.classList.remove('light');
                    document.documentElement.classList.add('dark');
                }
            } catch(e) {}
        })();
    </script>

    {!! $codeInjection['headCode'] ?? '' !!}

    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    @inertiaHead
</head>
<body class="antialiased min-h-screen flex flex-col">
    {!! $codeInjection['bodyCode'] ?? '' !!}
    @inertia
    {!! $codeInjection['footerCode'] ?? '' !!}
</body>
</html>


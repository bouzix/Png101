import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BOT_USER_AGENTS = /googlebot|googlebot-image|mediapartners-google|adsbot-google|bingbot|slurp|duckduckbot|baiduspider|yandex|facebookexternalhit|twitterbot|linkedinbot|applebot/i;

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Attach current path to request headers so server components (like RootLayout) can read it
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', path);

    // 1. Protect Admin Dashboard Routes
    if (path.startsWith('/admin/dashboard')) {
        const token = request.cookies.get('auth_token')?.value;
        const teamMemberId = request.cookies.get('team_member_id')?.value;

        const isSuperAdmin = token === 'authenticated';
        const isTeamMember = token === 'team_member' && Boolean(teamMemberId);

        if (!isSuperAdmin && !isTeamMember) {
            return NextResponse.redirect(new URL('/admin', request.url));
        }

        // Team management page is strictly Super Admin only
        if (
            (path.startsWith('/admin/dashboard/team') ||
                path.startsWith('/admin/dashboard/settings/team')) &&
            !isSuperAdmin
        ) {
            return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        }

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    }

    // 2. Protect /uploads/* assets
    if (path.startsWith('/uploads/')) {
        const filename = path.split('/').pop() || '';
        const isPreviewJpg = filename.startsWith('preview-') || path.endsWith('.jpg');
        const userAgent = request.headers.get('user-agent') || '';
        const isBot = BOT_USER_AGENTS.test(userAgent);

        // Allow search engine crawlers ONLY on the watermarked/checkered preview .jpg files
        if (isBot) {
            if (isPreviewJpg) {
                return NextResponse.next();
            }
            // Block bots from indexing raw transparent PNGs; redirect them to the image page
            const redirectLookupUrl = new URL('/api/uploads/redirect', request.url);
            redirectLookupUrl.searchParams.set('path', path);
            return NextResponse.redirect(redirectLookupUrl, 307);
        }

        const secFetchDest = request.headers.get('sec-fetch-dest');
        const secFetchMode = request.headers.get('sec-fetch-mode');
        const accept = request.headers.get('accept') || '';
        const referer = request.headers.get('referer') || '';
        const host = request.headers.get('host') || '';
        const isSameOriginReferer = Boolean(host && referer.includes(host));

        // If a user navigates directly to any /uploads/* URL in their browser tab (without ?download=1),
        // redirect them to the image's public page (/images/[id]-[slug])
        const isExplicitDownload = request.nextUrl.searchParams.get('download') === '1';
        const isDirectBrowserNavigation =
            !isExplicitDownload &&
            (secFetchDest === 'document' ||
                secFetchMode === 'navigate' ||
                accept.includes('text/html'));

        if (isDirectBrowserNavigation) {
            const redirectLookupUrl = new URL('/api/uploads/redirect', request.url);
            redirectLookupUrl.searchParams.set('path', path);
            return NextResponse.redirect(redirectLookupUrl, 307);
        }

        // For raw transparent PNGs (not preview .jpg), also block external hotlinking if Referer is missing/foreign
        if (!isPreviewJpg && !isSameOriginReferer && !isExplicitDownload) {
            const redirectLookupUrl = new URL('/api/uploads/redirect', request.url);
            redirectLookupUrl.searchParams.set('path', path);
            return NextResponse.redirect(redirectLookupUrl, 307);
        }

        // Add X-Robots-Tag: noindex, noimageindex on raw transparent PNGs so search engines never index the raw PNG
        const response = NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
        if (!isPreviewJpg) {
            response.headers.set('X-Robots-Tag', 'noindex, noimageindex');
        }
        return response;
    }

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - assets/
         * - needed/
         */
        '/((?!_next/static|_next/image|favicon.ico|assets/|needed/).*)',
    ],
};

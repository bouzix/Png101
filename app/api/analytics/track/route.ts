import { NextResponse } from 'next/server';
import { detectDevice } from '@/lib/device-detector';
import { detectCountry } from '@/lib/geo-detector';
import { recordDownloadEvent, recordImageView } from '@/lib/analytics';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { imageId, isCustomSize, resolution, eventType } = body;

        if (eventType === 'view' && imageId) {
            await recordImageView(imageId);
            return NextResponse.json({ success: true });
        }

        // Capture user-agent and IP address
        const userAgent = request.headers.get('user-agent');
        const ipAddress =
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            null;

        // Detect device information
        const deviceInfo = detectDevice(userAgent);

        // Detect country information (async)
        const countryInfo = await detectCountry(ipAddress);

        // Create download record with metadata
        await recordDownloadEvent({
            imageId: imageId || null,
            deviceType: deviceInfo.deviceType,
            country: countryInfo.countryCode,
            countryName: countryInfo.countryName,
            isCustomSize: Boolean(isCustomSize),
            resolution: resolution || null,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Track download error:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}

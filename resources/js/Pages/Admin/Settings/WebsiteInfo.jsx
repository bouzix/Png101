import { useEffect } from 'react';
import { router } from '@inertiajs/react';

export default function WebsiteInfoRedirectPage() {
    useEffect(() => {
        router.visit('/admin/dashboard/settings', { replace: true });
    }, []);

    return null;
}

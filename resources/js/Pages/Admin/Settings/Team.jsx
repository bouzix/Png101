import { useEffect } from 'react';
import { router } from '@inertiajs/react';

export default function RedirectOldTeamPage() {
    useEffect(() => {
        router.visit('/admin/dashboard/team', { replace: true });
    }, []);

    return null;
}

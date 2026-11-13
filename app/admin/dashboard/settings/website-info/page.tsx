import { redirect } from 'next/navigation';

export default function WebsiteInfoRedirectPage() {
    redirect('/admin/dashboard/settings');
}

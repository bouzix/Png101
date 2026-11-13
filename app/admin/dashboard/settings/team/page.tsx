import { redirect } from 'next/navigation';

export default function RedirectOldTeamPage() {
    redirect('/admin/dashboard/team');
}

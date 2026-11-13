<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Models\TeamMember;
use App\Services\TeamService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function adminLoginPage()
    {
        $session = TeamService::getCurrentSession();
        if (!empty($session['authenticated'])) {
            return redirect('/admin/dashboard');
        }
        return Inertia::render('Admin/Login');
    }

    public function teamLoginPage()
    {
        return Inertia::render('Team/Login');
    }

    public function login(Request $request)
    {
        $password = (string) $request->input('password', '');
        $setting = Setting::find('admin_password');

        if (!$setting) {
            return response()->json(['success' => false, 'error' => 'Admin password not configured'], 500);
        }

        if (password_verify($password, $setting->value)) {
            return response()->json(['success' => true])
                ->withoutCookie('team_member_id')
                ->cookie('auth_token', 'authenticated', 60 * 24 * 7, '/', null, $request->isSecure(), true);
        }

        return response()->json(['success' => false], 401);
    }

    public function teamLogin(Request $request)
    {
        $email = strtolower(trim((string) $request->input('email', '')));
        $password = (string) $request->input('password', '');

        if ($email === '' || $password === '') {
            return response()->json(['success' => false, 'error' => 'Email and password are required.'], 400);
        }

        $member = TeamMember::whereRaw('LOWER(email) = ?', [$email])->first();
        if (!$member) {
            return response()->json(['success' => false, 'error' => 'Invalid email or password.'], 401);
        }

        if (!$member->isActive) {
            return response()->json(['success' => false, 'error' => 'This team account has been deactivated by the Super Admin.'], 403);
        }

        if (!password_verify($password, $member->passwordHash)) {
            return response()->json(['success' => false, 'error' => 'Invalid email or password.'], 401);
        }

        $member->lastLoginAt = now();
        $member->save();

        $perms = is_array($member->permissions) ? $member->permissions : [];
        $redirectTo = '/admin/dashboard/workspace';

        return response()->json([
            'success' => true,
            'redirectTo' => $redirectTo,
            'member' => [
                'id' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'permissions' => $perms,
            ],
        ])
            ->cookie('auth_token', 'team_member', 60 * 24 * 7, '/', null, $request->isSecure(), true)
            ->cookie('team_member_id', $member->id, 60 * 24 * 7, '/', null, $request->isSecure(), true);
    }

    public function logout()
    {
        return response()->json(['success' => true])
            ->withoutCookie('auth_token')
            ->withoutCookie('team_member_id');
    }

    public function me(Request $request)
    {
        $session = TeamService::getCurrentSession($request);
        return response()->json(array_merge($session, [
            'availablePermissions' => TeamService::PERMISSIONS,
        ]));
    }
}


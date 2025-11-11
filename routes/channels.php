<?php

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;

// Public notifications channel - accessible to all authenticated users (both regular users and employees)
Broadcast::channel('notifications', function ($user) {
    // Allow if regular user is authenticated
    if (Auth::check()) {
        return true;
    }

    // Allow if employee is authenticated via session
    if (Session::has('employee_id')) {
        return true;
    }

    return false;
});

Broadcast::channel('employee.{employeeId}', function ($user, $employeeId) {
    return Auth::check();
});

Broadcast::channel('supervisor.{supervisorId}', function ($user, $supervisorId) {
    return Auth::check() && $user->id == $supervisorId;
});

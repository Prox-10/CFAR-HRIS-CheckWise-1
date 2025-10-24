<?php

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\FingerprintController;
use App\Http\Controllers\EmployeeController;
use App\Models\Employee;
use App\Http\Controllers\Api\EmployeeController as ApiEmployeeController;
use App\Http\Controllers\Api\AttendanceController as ApiAttendanceController;
use App\Http\Controllers\Api\AttendanceSessionController;
use App\Http\Controllers\Api\EvaluationController as ApiEvaluationController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Mark notification as read (admin only)
Route::post('/notifications/{id}/read', function ($id) {
    $notification = Notification::findOrFail($id);
    $notification->read_at = now();
    $notification->save();
    return response()->json(['success' => true]);
});


Route::post('/fingerprint/store', [FingerprintController::class, 'store']);
Route::post('/fingerprint/verify', [FingerprintController::class, 'verify']);
// Remove or comment out the identification route
// Route::post('/fingerprint/identify', [FingerprintController::class, 'identify']);
Route::post('/employee/store', [EmployeeController::class, 'store']);
Route::get('/fingerprint/all', [FingerprintController::class, 'all']);
Route::get('/employee/all', [ApiEmployeeController::class, 'index']);
Route::get('/employees/packing-plant', function () {
    $employees = Employee::where('department', 'Production')
        ->select('id', 'employeeid', 'employee_name', 'department', 'position', 'work_status')
        ->orderBy('employee_name', 'asc')
        ->get();
    return response()->json($employees);
});
Route::get('/attendance/all', [ApiAttendanceController::class, 'index']);
Route::get('/evaluation/all', [ApiEvaluationController::class, 'index'])->middleware(['web', 'auth']);

// Attendance session time settings API
Route::get('/attendance-sessions', [AttendanceSessionController::class, 'index'])->name('attendance-sessions.index');
Route::post('/attendance-sessions', [AttendanceSessionController::class, 'store']);
Route::put('/attendance-sessions/{attendanceSession}', [AttendanceSessionController::class, 'update']);

Route::get('/employee/by-employeeid', function (Request $request) {
    $employeeid = $request->query('employeeid');
    $employee = Employee::where('employeeid', $employeeid)->first();
    if ($employee) {
        return response()->json($employee);
    }
    return response()->json(null, 404);
});

Route::get('/attendance/test', function () {
    $data = \App\Models\Attendance::select('attendance_date', 'attendance_status')
        ->limit(10)
        ->get()
        ->map(function ($item) {
            return [
                'attendanceDate' => $item->attendance_date,
                'attendanceStatus' => $item->attendance_status,
            ];
        });

    return response()->json([
        'count' => \App\Models\Attendance::count(),
        'sample_data' => $data
    ]);
});

// Employee attendance API for evaluation system
Route::get('/employee-attendance/{employeeId}', function ($employeeId, Request $request) {
    $startDate = $request->query('start_date');
    $endDate = $request->query('end_date');
    
    if (!$startDate || !$endDate) {
        return response()->json([
            'success' => false,
            'message' => 'Start date and end date are required'
        ], 400);
    }
    
    try {
        // Query actual attendance data from the database
        $attendanceRecords = \App\Models\Attendance::where('employee_id', $employeeId)
            ->whereBetween('attendance_date', [$startDate, $endDate])
            ->get();
        
        // Calculate days late and absent based on attendance status
        $daysLate = 0;
        $daysAbsent = 0;
        
        foreach ($attendanceRecords as $record) {
            $status = strtolower($record->attendance_status);
            
            if ($status === 'late' || $status === 'l') {
                $daysLate++;
            } elseif ($status === 'absent' || $status === 'a' || $status === 'no time in' || $status === 'no time out') {
                $daysAbsent++;
            }
        }
        
        // For debugging, also return the raw attendance records
        $debugInfo = [
            'total_records' => $attendanceRecords->count(),
            'date_range' => [$startDate, $endDate],
            'sample_records' => $attendanceRecords->take(5)->map(function($record) {
                return [
                    'date' => $record->attendance_date,
                    'status' => $record->attendance_status,
                    'time_in' => $record->time_in,
                    'time_out' => $record->time_out
                ];
            })
        ];
        
        return response()->json([
            'success' => true,
            'attendance' => [
                'days_late' => $daysLate,
                'days_absent' => $daysAbsent,
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ]
            ],
            'debug' => $debugInfo
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error fetching attendance data: ' . $e->getMessage()
        ], 500);
    }
});

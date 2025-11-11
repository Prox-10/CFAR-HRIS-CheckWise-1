<?php

namespace App\Http\Controllers;

use App\Models\Absence;
use App\Models\Employee;
use App\Models\LeaveCredit;
use App\Models\AbsenceCredit;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;
use Exception;
use App\Events\AbsenceRequested;
use App\Events\RequestStatusUpdated;
use App\Models\Notification;

class AbsenceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = Auth::user();
        $isSupervisor = $user->isSupervisor();
        $isSuperAdmin = $user->isSuperAdmin();

        // Get user's supervised departments if supervisor
        $supervisedDepartments = $isSupervisor ? $user->getEvaluableDepartments() : [];

        // Base query for absences
        $absenceQuery = Absence::with('employee', 'approver');

        // Filter absences based on user role
        if ($isSupervisor && !empty($supervisedDepartments)) {
            $absenceQuery->whereIn('department', $supervisedDepartments);
        }

        $absences = $absenceQuery->orderBy('submitted_at', 'desc')->get();

        $absenceList = $absences->map(function ($absence) {
            $absenceCredits = AbsenceCredit::getOrCreateForEmployee($absence->employee_id);
            return [
                'id' => $absence->id,
                'full_name' => $absence->full_name,
                'employee_id_number' => $absence->employee_id_number,
                'department' => $absence->department,
                'position' => $absence->position,
                'absence_type' => $absence->absence_type,
                'from_date' => $absence->from_date->format('d M Y'),
                'to_date' => $absence->to_date->format('d M Y'),
                'is_partial_day' => $absence->is_partial_day,
                'reason' => $absence->reason,
                'status' => $absence->status,
                'submitted_at' => $absence->submitted_at->format('d M Y'),
                'approved_at' => $absence->approved_at?->format('d M Y'),
                'days' => $absence->days,
                'employee_name' => $absence->employee ? $absence->employee->employee_name : $absence->full_name,
                'picture' => $absence->employee ? $absence->employee->picture : null,
                'remaining_credits' => $absenceCredits->remaining_credits,
                'used_credits' => $absenceCredits->used_credits,
                'total_credits' => $absenceCredits->total_credits,
            ];
        })->toArray();

        // Fetch employees for the add modal dropdown - filter by supervisor role
        $employeeQuery = Employee::select('id', 'employeeid', 'employee_name', 'department', 'position');
        if ($isSupervisor && !empty($supervisedDepartments)) {
            $employeeQuery->whereIn('department', $supervisedDepartments);
        }
        $employees = $employeeQuery->get();

        // Add absence credits information for each employee
        $employeesWithCredits = $employees->map(function ($employee) {
            $absenceCredits = AbsenceCredit::getOrCreateForEmployee($employee->id);
            return [
                'id' => $employee->id,
                'employeeid' => $employee->employeeid,
                'employee_name' => $employee->employee_name,
                'department' => $employee->department,
                'position' => $employee->position,
                'remaining_credits' => $absenceCredits->remaining_credits,
                'used_credits' => $absenceCredits->used_credits,
                'total_credits' => $absenceCredits->total_credits,
            ];
        })->toArray();

        // Get monthly absence statistics for the chart
        $monthlyAbsenceStats = $this->getMonthlyAbsenceStats($supervisedDepartments);

        return Inertia::render('absence/index', [
            'absences' => $absenceList,
            'employees' => $employeesWithCredits,
            'monthlyAbsenceStats' => $monthlyAbsenceStats,
            'user_permissions' => [
                'is_supervisor' => $isSupervisor,
                'is_super_admin' => $isSuperAdmin,
                'supervised_departments' => $supervisedDepartments,
            ],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Display the employee absence index page.
     */
    public function employeeIndex()
    {
        $employee = Employee::where('employeeid', Session::get('employee_id'))->first();
        
        if (!$employee) {
            Session::forget(['employee_id', 'employee_name']);
            return redirect()->route('employeelogin');
        }

        return Inertia::render('employee-view/request-form/absence/index', [
            'employee' => [
                'id' => $employee->id,
                'employeeid' => $employee->employeeid,
                'employee_name' => $employee->employee_name,
                'firstname' => $employee->firstname,
                'lastname' => $employee->lastname,
                'department' => $employee->department,
                'position' => $employee->position,
                'picture' => $employee->picture,
            ],
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            // Log the incoming request data for debugging
            Log::info('Absence request data:', $request->all());
            
            $validated = $request->validate([
                'employee_id' => 'nullable|exists:employees,id',
                'full_name' => 'required|string|max:255',
                'employee_id_number' => 'required|string|max:255',
                'department' => 'required|string|max:255',
                'position' => 'required|string|max:255',
                'absence_type' => 'required|in:Annual Leave,Personal Leave,Maternity/Paternity,Sick Leave,Emergency Leave,Other',
                'from_date' => 'required|date',
                'to_date' => 'required|date|after_or_equal:from_date',
                'is_partial_day' => 'boolean',
                'reason' => 'required|string|min:10',
            ]);
            
            Log::info('Validated absence data:', $validated);

            $absence = Absence::create([
                'employee_id' => $validated['employee_id'],
                'full_name' => $validated['full_name'],
                'employee_id_number' => $validated['employee_id_number'],
                'department' => $validated['department'],
                'position' => $validated['position'],
                'absence_type' => $validated['absence_type'],
                'from_date' => $validated['from_date'],
                'to_date' => $validated['to_date'],
                'is_partial_day' => $validated['is_partial_day'] ?? false,
                'reason' => $validated['reason'],
                'status' => 'pending',
                'submitted_at' => now(),
            ]);

            Log::info('Absence created successfully:', ['id' => $absence->id, 'days' => $absence->days]);

            // Get employee and supervisor info for debugging
            $employee = Employee::find($validated['employee_id']);
            $supervisor = \App\Models\User::getSupervisorForDepartment($validated['department']);
            
            Log::info('Absence submission - Supervisor lookup:', [
                'employee_id' => $validated['employee_id'],
                'employee_name' => $employee ? $employee->employee_name : 'N/A',
                'department' => $validated['department'],
                'supervisor_id' => $supervisor ? $supervisor->id : 'NONE',
                'supervisor_name' => $supervisor ? $supervisor->name : 'NONE',
            ]);

            // Broadcast to managers/HR/supervisors
            try {
                Log::info('Broadcasting AbsenceRequested event...', [
                    'absence_id' => $absence->id,
                    'department' => $validated['department'],
                    'supervisor_id' => $supervisor ? $supervisor->id : null,
                ]);
                
                event(new AbsenceRequested($absence));
                
                Log::info('AbsenceRequested event broadcasted successfully');
            } catch (\Exception $broadcastError) {
                Log::error('Failed to broadcast AbsenceRequested event:', [
                    'error' => $broadcastError->getMessage(),
                    'trace' => $broadcastError->getTraceAsString(),
                ]);
            }

            // Create notification for the supervisor of the employee's department
            try {
                if ($supervisor) {
                    Notification::create([
                        'type' => 'absence_request',
                        'user_id' => $supervisor->id,
                        'data' => [
                            'absence_id' => $absence->id,
                            'employee_name' => $employee ? $employee->employee_name : $validated['full_name'],
                            'absence_type' => $absence->absence_type,
                            'from_date' => $absence->from_date,
                            'to_date' => $absence->to_date,
                            'department' => $validated['department'],
                        ],
                    ]);
                    Log::info('Notification created for supervisor:', ['supervisor_id' => $supervisor->id]);
                } else {
                    Log::warning('No supervisor found for department:', ['department' => $validated['department']]);
                }
            } catch (Exception $notificationError) {
                Log::error('Failed to create notification:', ['error' => $notificationError->getMessage()]);
                // Don't fail the entire request if notification creation fails
            }

            // Return JSON for axios requests, redirect for form submissions
            if ($request->expectsJson() || $request->wantsJson() || $request->ajax()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Absence request submitted successfully!',
                    'absence_id' => $absence->id,
                ]);
            }

            if ($request->routeIs('employee-view.absence.store')) {
                return redirect()->route('employee-view.absence')->with('success', 'Absence request submitted successfully!');
            }

            return redirect()->route('absence.index')->with('success', 'Absence request submitted successfully!');
        } catch (Exception $e) {
            Log::error('Absence creation failed:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            
            if ($request->expectsJson()) {
                return response()->json(['error' => 'Failed to submit absence request. Please try again.'], 500);
            }
            
            return redirect()->back()->with('error', 'Failed to submit absence request. Please try again.');
        }
    }

    /**
     * Display the approval page.
     */
    public function approve()
    {
        $user = Auth::user();
        $isSupervisor = $user->isSupervisor();
        $isSuperAdmin = $user->isSuperAdmin();

        // Get user's supervised departments if supervisor
        $supervisedDepartments = $isSupervisor ? $user->getEvaluableDepartments() : [];

        // Base query for absences
        $absenceQuery = Absence::with('employee', 'approver');

        // Filter absences based on user role
        if ($isSupervisor && !empty($supervisedDepartments)) {
            $absenceQuery->whereIn('department', $supervisedDepartments);
        }

        $absences = $absenceQuery->orderBy('submitted_at', 'desc')->get();

        $absenceList = $absences->transform(fn($absence) => [
            'id' => $absence->id,
            'name' => $absence->full_name,
            'department' => $absence->department,
            'type' => $absence->absence_type,
            'startDate' => $absence->from_date->format('Y-m-d'),
            'endDate' => $absence->to_date->format('Y-m-d'),
            'submittedAt' => $absence->submitted_at->format('Y-m-d'),
            'days' => $absence->days,
            'reason' => $absence->reason,
            'status' => $absence->status,
            'avatarUrl' => $absence->employee ? $absence->employee->picture : null,
        ]);

        return Inertia::render('absence/absence-approve', [
            'initialRequests' => $absenceList,
            'user_permissions' => [
                'is_supervisor' => $isSupervisor,
                'is_super_admin' => $isSuperAdmin,
                'supervised_departments' => $supervisedDepartments,
            ],
        ]);
    }

    /**
     * Display the absence credit summary page.
     */
    public function creditSummary()
    {
        $user = Auth::user();
        $isSupervisor = $user->isSupervisor();
        $isSuperAdmin = $user->isSuperAdmin();

        // Get user's supervised departments if supervisor
        $supervisedDepartments = $isSupervisor ? $user->getEvaluableDepartments() : [];

        // Fetch employees for the credit summary - filter by supervisor role
        $employeeQuery = Employee::select('id', 'employeeid', 'employee_name', 'department', 'position');
        if ($isSupervisor && !empty($supervisedDepartments)) {
            $employeeQuery->whereIn('department', $supervisedDepartments);
        }
        $employees = $employeeQuery->get();

        // Add absence credits information for each employee
        $employeesWithCredits = $employees->map(function ($employee) {
            $absenceCredits = AbsenceCredit::getOrCreateForEmployee($employee->id);
            return [
                'id' => $employee->id,
                'employeeid' => $employee->employeeid,
                'employee_name' => $employee->employee_name,
                'department' => $employee->department,
                'position' => $employee->position,
                'remaining_credits' => $absenceCredits->remaining_credits,
                'used_credits' => $absenceCredits->used_credits,
                'total_credits' => $absenceCredits->total_credits,
            ];
        })->toArray();

        // Get monthly absence statistics for the chart
        $monthlyAbsenceStats = $this->getMonthlyAbsenceStats($supervisedDepartments);

        return Inertia::render('absence/absence-credit', [
            'employees' => $employeesWithCredits,
            'monthlyAbsenceStats' => $monthlyAbsenceStats,
            'user_permissions' => [
                'is_supervisor' => $isSupervisor,
                'is_super_admin' => $isSuperAdmin,
                'supervised_departments' => $supervisedDepartments,
            ],
        ]);
    }

    /**
     * Get monthly absence statistics for chart display.
     */
    private function getMonthlyAbsenceStats($supervisedDepartments = [])
    {
        // Base query for absences
        $absenceQuery = Absence::query();

        // Filter by supervised departments if supervisor
        if (!empty($supervisedDepartments)) {
            $absenceQuery->whereIn('department', $supervisedDepartments);
        }

        // Get absences from the last 12 months
        $startDate = now()->subMonths(11)->startOfMonth();
        $endDate = now()->endOfMonth();

        $absences = $absenceQuery
            ->whereBetween('from_date', [$startDate, $endDate])
            ->where('status', 'approved')
            ->get();

        // Get total employee count for percentage calculations
        $employeeQuery = Employee::query();
        if (!empty($supervisedDepartments)) {
            $employeeQuery->whereIn('department', $supervisedDepartments);
        }
        $totalEmployees = $employeeQuery->count();

        // Group absences by month
        $monthlyData = [];
        for ($i = 11; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $monthKey = $date->format('Y-m');
            $monthName = $date->format('F');
            $year = $date->year;

            // Count absences for this month
            $monthAbsences = $absences->filter(function ($absence) use ($date) {
                return $absence->from_date->format('Y-m') === $date->format('Y-m');
            })->count();

            // Calculate percentage
            $percentage = $totalEmployees > 0 ? round(($monthAbsences / $totalEmployees) * 100, 1) : 0;

            $monthlyData[] = [
                'month' => $monthName,
                'year' => $year,
                'absences' => $monthAbsences,
                'percentage' => $percentage,
                'date' => $date->toDateString(),
            ];
        }

        return $monthlyData;
    }

    /**
     * Update the status of an absence request.
     */
    public function updateStatus(Request $request, Absence $absence)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,approved,rejected',
            'approval_comments' => 'nullable|string',
        ]);

        $oldStatus = $absence->status;
        $newStatus = $validated['status'];

        $absence->update([
            'status' => $newStatus,
            'approved_at' => in_array($newStatus, ['approved', 'rejected']) ? now() : null,
            'approved_by' => in_array($newStatus, ['approved', 'rejected']) ? Auth::id() : null,
            'approval_comments' => $validated['approval_comments'] ?? null,
        ]);

        // Handle credit management based on status changes
        $absenceCredits = AbsenceCredit::getOrCreateForEmployee($absence->employee_id);

        if ($newStatus === 'approved' && $oldStatus !== 'approved') {
            $absenceCredits->useCredits($absence->days);
        } elseif ($oldStatus === 'approved' && $newStatus !== 'approved') {
            $absenceCredits->refundCredits($absence->days);
        }

        if ($oldStatus !== $newStatus) {
            event(new RequestStatusUpdated('absence', $newStatus, (int) $absence->employee_id, $absence->id, [
                'absence_type' => $absence->absence_type,
                'from_date' => $absence->from_date->format('Y-m-d'),
                'to_date' => $absence->to_date->format('Y-m-d'),
                'approval_comments' => $validated['approval_comments'] ?? null,
            ]));
        }

        if ($request->expectsJson()) {
            return response()->json(['success' => true]);
        }

        return redirect()->route('absence.absence-approve')->with('success', 'Absence status updated successfully!');
    }

    /**
     * Display the specified resource.
     */
    public function show(Absence $absence)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Absence $absence)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Absence $absence)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Absence $absence)
    {
        try {
            $absence->delete();

            // Check if this is an AJAX request
            if (request()->expectsJson()) {
                return response()->json(['success' => true, 'message' => 'Absence request deleted successfully!']);
            }

            // For direct visits, redirect back to the absence index page
            return redirect()->route('absence.index')->with('success', 'Absence request deleted successfully!');
        } catch (Exception $e) {
            Log::error('Absence deletion failed: ' . $e->getMessage());

            // Check if this is an AJAX request
            if (request()->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Failed to delete absence request. Please try again.'], 500);
            }

            return redirect()->back()->with('error', 'Failed to delete absence request. Please try again.');
        }
    }

    public function request()
    {
        $user = Auth::user();
        $isSupervisor = $user->isSupervisor();
        $isSuperAdmin = $user->isSuperAdmin();

        // Get user's supervised departments if supervisor
        $supervisedDepartments = $isSupervisor ? $user->getEvaluableDepartments() : [];

        // Base query for absences
        $absenceQuery = Absence::with('employee', 'approver');

        // Filter absences based on user role
        if ($isSupervisor && !empty($supervisedDepartments)) {
            $absenceQuery->whereIn('department', $supervisedDepartments);
        }

        $absences = $absenceQuery->orderBy('submitted_at', 'desc')->get();

        $absenceList = $absences->transform(fn($absence) => [
            'id' => $absence->id,
            'full_name' => $absence->full_name,
            'employee_id_number' => $absence->employee_id_number,
            'department' => $absence->department,
            'position' => $absence->position,
            'absence_type' => $absence->absence_type,
            'from_date' => $absence->from_date->format('Y-m-d'),
            'to_date' => $absence->to_date->format('Y-m-d'),
            'submitted_at' => $absence->submitted_at->format('Y-m-d'),
            'days' => $absence->days,
            'reason' => $absence->reason,
            'is_partial_day' => $absence->is_partial_day,
            'status' => $absence->status,
            'picture' => $absence->employee ? $absence->employee->picture : null,
            'employee_name' => $absence->employee ? $absence->employee->employee_name : $absence->full_name,
        ]);

        return Inertia::render('absence/absence-approve', [
            'initialRequests' => $absenceList,
            'user_permissions' => [
                'is_supervisor' => $isSupervisor,
                'is_super_admin' => $isSuperAdmin,
                'supervised_departments' => $supervisedDepartments,
            ],
        ]);
    }
}

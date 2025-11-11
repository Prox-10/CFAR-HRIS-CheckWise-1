<?php

namespace App\Http\Controllers;

use App\Models\Leave;
use App\Models\Employee;
use App\Models\LeaveCredit;
use Illuminate\Http\Request;
// use Inertia\Controller;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Exception;
use App\Models\Notification;
use App\Events\LeaveRequested;
use App\Events\RequestStatusUpdated;

class LeaveController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        $user = Auth::user();
        $isSupervisor = $user->isSupervisor();
        $isSuperAdmin = $user->isSuperAdmin();

        // Get user's supervised departments if supervisor
        $supervisedDepartments = $isSupervisor ? $user->getEvaluableDepartments() : [];

        // Base query for leaves
        $leaveQuery = Leave::with('employee');

        // Filter leaves based on user role
        if ($isSupervisor && !empty($supervisedDepartments)) {
            $leaveQuery->whereHas('employee', function ($query) use ($supervisedDepartments) {
                $query->whereIn('department', $supervisedDepartments);
            });
        }

        $leave = $leaveQuery->orderBy('created_at', 'desc')->get();

        $leaveList = $leave->map(function ($leave) {
            $leaveCredits = LeaveCredit::getOrCreateForEmployee($leave->employee_id);

            return [
                'id'                  => $leave->id,
                'leave_type'          => $leave->leave_type,
                'leave_start_date'    => $leave->leave_start_date->format('d M Y'),
                'leave_end_date'      => $leave->leave_end_date->format('d M Y'),
                'leave_days'          => $leave->leave_days,
                'status'              => $leave->leave_status,
                'leave_reason'        => $leave->leave_reason,
                'leave_date_reported' => $leave->leave_date_reported->format('d M Y'),
                'leave_date_approved' => $leave->leave_date_approved,
                'leave_comments'      => $leave->leave_comments,
                'created_at'          => $leave->created_at->format('d M Y'),
                'employee_name'       => $leave->employee ? $leave->employee->employee_name : null,
                'picture'       => $leave->employee ? $leave->employee->picture : null,
                'department'       => $leave->employee ? $leave->employee->department : null,
                'employeeid'       => $leave->employee ? $leave->employee->employeeid : null,
                'position'       => $leave->employee ? $leave->employee->position : null,
                'remaining_credits'   => $leaveCredits->remaining_credits,
                'used_credits'        => $leaveCredits->used_credits,
                'total_credits'       => $leaveCredits->total_credits,
            ];
        })->toArray();

        // Fetch employees for dropdown
        $employees = Employee::select('id', 'employeeid', 'employee_name', 'department', 'position')->get();

        // Calculate leave stats (current)
        $totalLeaves = Leave::count();
        $pendingLeaves = Leave::where('leave_status', 'Pending')->count();
        $approvedLeaves = Leave::where('leave_status', 'Approved')->count();
        $rejectedLeaves = Leave::where('leave_status', 'Rejected')->count();
        $cancelledLeaves = Leave::where('leave_status', 'Cancelled')->count();
        $approvalRate = $totalLeaves > 0 ? round(($approvedLeaves / $totalLeaves) * 100, 2) : 0;

        // Add leave credits information for each employee
        $employeesWithCredits = $employees->map(function ($employee) {
            $leaveCredits = LeaveCredit::getOrCreateForEmployee($employee->id);
            return [
                'id' => $employee->id,
                'employeeid' => $employee->employeeid,
                'employee_name' => $employee->employee_name,
                'department' => $employee->department,
                'position' => $employee->position,
                'remaining_credits' => $leaveCredits->remaining_credits,
                'used_credits' => $leaveCredits->used_credits,
                'total_credits' => $leaveCredits->total_credits,
            ];
        })->toArray();

        // Previous period (previous month)
        $prevMonthStart = now()->subMonth()->startOfMonth();
        $prevMonthEnd = now()->subMonth()->endOfMonth();
        $prevTotalLeaves = Leave::whereBetween('created_at', [$prevMonthStart, $prevMonthEnd])->count();
        $prevPendingLeaves = Leave::where('leave_status', 'Pending')->whereBetween('created_at', [$prevMonthStart, $prevMonthEnd])->count();
        $prevApprovedLeaves = Leave::where('leave_status', 'Approved')->whereBetween('created_at', [$prevMonthStart, $prevMonthEnd])->count();
        $prevRejectedLeaves = Leave::where('leave_status', 'Rejected')->whereBetween('created_at', [$prevMonthStart, $prevMonthEnd])->count();
        $prevCancelledLeaves = Leave::where('leave_status', 'Cancelled')->whereBetween('created_at', [$prevMonthStart, $prevMonthEnd])->count();
        $prevApprovalRate = $prevTotalLeaves > 0 ? round(($prevApprovedLeaves / $prevTotalLeaves) * 100, 2) : 0;

        $leaveStats = [
            'totalLeaves' => $totalLeaves,
            'pendingLeaves' => $pendingLeaves,
            'approvedLeaves' => $approvedLeaves,
            'rejectedLeaves' => $rejectedLeaves,
            'cancelledLeaves' => $cancelledLeaves,
            'approvalRate' => $approvalRate,
            'prevTotalLeaves' => $prevTotalLeaves,
            'prevPendingLeaves' => $prevPendingLeaves,
            'prevApprovedLeaves' => $prevApprovedLeaves,
            'prevRejectedLeaves' => $prevRejectedLeaves,
            'prevCancelledLeaves' => $prevCancelledLeaves,
            'prevApprovalRate' => $prevApprovalRate,
        ];

        return Inertia::render('leave/index', [
            'leave'     => $leaveList,  // Pass transformed data to Inertia
            'employees' => $employeesWithCredits,  // Pass employees with credits for dropdown
            'leaveStats' => $leaveStats, // Pass leave stats for section cards
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
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            $request->validate([
                'employee_id' => 'required|exists:employees,id',
                'leave_type' => 'required|string',
                'leave_start_date' => 'required|date',
                'leave_end_date' => 'required|date|after_or_equal:leave_start_date',
                'leave_days' => 'required|integer|min:1',
                'leave_reason' => 'required|string',
                'leave_date_reported' => 'required|date',
            ]);

            // Check if employee has enough credits (credits = number of days)
            $employee = Employee::find($request->employee_id);
            $leaveCredits = LeaveCredit::getOrCreateForEmployee($employee->id);

            if ($leaveCredits->remaining_credits < $request->leave_days) {
                return redirect()->back()->with('error', 'Insufficient leave credits. Employee has ' . $leaveCredits->remaining_credits . ' credits remaining but requesting ' . $request->leave_days . ' days (' . $request->leave_days . ' credits).');
            }

            $leave = new Leave();
            $leave->employee_id = $request->employee_id;
            $leave->leave_type = $request->leave_type;
            $leave->leave_start_date = $request->leave_start_date;
            $leave->leave_end_date = $request->leave_end_date;
            $leave->leave_days = $request->leave_days;
            $leave->leave_reason = $request->leave_reason;
            $leave->leave_date_reported = $request->leave_date_reported;
            $leave->leave_status = 'Pending'; // Default status
            $leave->leave_comments = $request->leave_comments ?? '';

            $leave->save();

            Log::info('Leave created successfully:', ['id' => $leave->id, 'employee_id' => $leave->employee_id]);

            // Create notification for the supervisor of the employee's department
            $employee = Employee::find($request->employee_id);
            $supervisor = \App\Models\User::getSupervisorForDepartment($employee->department);

            Log::info('Leave submission - Supervisor lookup:', [
                'employee_id' => $request->employee_id,
                'employee_name' => $employee ? $employee->employee_name : 'N/A',
                'department' => $employee->department,
                'supervisor_id' => $supervisor ? $supervisor->id : 'NONE',
                'supervisor_name' => $supervisor ? $supervisor->name : 'NONE',
            ]);

            if ($supervisor) {
                Notification::create([
                    'type' => 'leave_request',
                    'user_id' => $supervisor->id,
                    'data' => [
                        'leave_id' => $leave->id,
                        'employee_name' => $employee ? $employee->employee_name : null,
                        'leave_type' => $leave->leave_type,
                        'leave_start_date' => $leave->leave_start_date,
                        'leave_end_date' => $leave->leave_end_date,
                        'department' => $employee->department,
                    ],
                ]);
                Log::info('Notification created for supervisor:', ['supervisor_id' => $supervisor->id]);
            } else {
                Log::warning('No supervisor found for department:', ['department' => $employee->department]);
            }

            // Broadcast to managers/HR/supervisors
            try {
                Log::info('Broadcasting LeaveRequested event...', [
                    'leave_id' => $leave->id,
                    'department' => $employee->department,
                    'supervisor_id' => $supervisor ? $supervisor->id : null,
                ]);

                event(new LeaveRequested($leave));

                Log::info('LeaveRequested event broadcasted successfully');
            } catch (\Exception $broadcastError) {
                Log::error('Failed to broadcast LeaveRequested event:', [
                    'error' => $broadcastError->getMessage(),
                    'trace' => $broadcastError->getTraceAsString(),
                ]);
            }

            // Return JSON for axios requests, redirect for form submissions
            if ($request->expectsJson() || $request->wantsJson() || $request->ajax()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Leave request submitted successfully!',
                    'leave_id' => $leave->id,
                ]);
            }

            // Redirect based on context (employee portal vs admin)
            if ($request->routeIs('employee-view.leave.store')) {
                return redirect()->route('employee-view.leave')->with('success', 'Leave request submitted successfully!');
            }

            return redirect()->route('leave.index')->with('success', 'Leave request submitted successfully!');
        } catch (Exception $e) {
            Log::error('Leave creation failed: ' . $e->getMessage());
            return redirect()->back()->with('error', 'An error occurred while creating the leave request. Please try again!');
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Leave $leave)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Leave $leave)
    {
        $leave->load('employee');
        return Inertia::render('leave/edit', [
            'leave' => [
                'id' => $leave->id,
                'leave_type' => $leave->leave_type,
                'leave_start_date' => $leave->leave_start_date,
                'leave_end_date' => $leave->leave_end_date,
                'leave_days' => $leave->leave_days,
                'leave_reason' => $leave->leave_reason,
                'leave_comments' => $leave->leave_comments,
                'leave_status' => $leave->leave_status,
                'leave_date_reported' => $leave->leave_date_reported,
                'leave_date_approved' => $leave->leave_date_approved,
                // Employee info 
                'employee' => $leave->employee ? [
                    'employeeid' => $leave->employee->employeeid,
                    'employee_name' => $leave->employee->employee_name,
                    'department' => $leave->employee->department,
                    'email' => $leave->employee->email,
                    'position' => $leave->employee->position,
                    'picture' => $leave->employee->picture,
                ] : null,
            ],
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Leave $leave)
    {
        try {
            if ($leave) {
                $oldStatus = $leave->leave_status;
                $newStatus = $request->leave_status;

                $leave->leave_start_date        = $request->leave_start_date;
                $leave->leave_end_date = $request->leave_end_date;
                $leave->leave_type       = $request->leave_type;
                $leave->leave_days        = $request->leave_days;
                $leave->leave_date_reported        = $request->leave_date_reported;

                // Set approval date - use provided date or current date if none provided
                if (!empty($request->leave_date_approved)) {
                    $leave->leave_date_approved = $request->leave_date_approved;
                } else {
                    $leave->leave_date_approved = now()->format('Y-m-d');
                }

                $leave->leave_reason        = $request->leave_reason;
                $leave->leave_comments        = $request->leave_comments;
                $leave->leave_status        = $newStatus;

                $leave->save();

                // Handle credit management based on status changes
                $leaveCredits = LeaveCredit::getOrCreateForEmployee($leave->employee_id);

                // If status changed to approved and wasn't approved before
                if ($newStatus === 'Approved' && $oldStatus !== 'Approved') {
                    $leaveCredits->useCredits($leave->leave_days); // Deduct credits equal to number of days
                }
                // If status changed from approved to something else (rejected/cancelled)
                elseif ($oldStatus === 'Approved' && $newStatus !== 'Approved') {
                    $leaveCredits->refundCredits($leave->leave_days); // Refund credits equal to number of days
                }

                // Create notification for employee if status changed
                if ($oldStatus !== $newStatus) {
                    event(new RequestStatusUpdated('leave', $newStatus, $leave->employee_id, $leave->id, [
                        'leave_type' => $leave->leave_type,
                        'leave_start_date' => $leave->leave_start_date,
                        'leave_end_date' => $leave->leave_end_date,
                    ]));
                }

                return redirect()->route('leave.index')->with('success', 'Leave updated successfully!');
            }
        } catch (Exception $e) {
            Log::error('Leave update failed: ' . $e->getMessage());
            return redirect()->back()->with('error', 'An error occurred while updating the leave. Please try again!');
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $leave = Leave::findOrFail($id);
        $leave->delete();
        return redirect()->back()->with('success', 'Leave deleted');
    }

    /**
     * Display employee's own leave requests.
     */
    public function employeeIndex()
    {
        $employee = Employee::where('employeeid', Session::get('employee_id'))->first();

        if (!$employee) {
            Session::forget(['employee_id', 'employee_name']);
            return redirect()->route('employeelogin');
        }

        // Get employee's leave requests
        $leaveRequests = Leave::where('employee_id', $employee->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($leave) use ($employee) {
                $leaveCredits = LeaveCredit::getOrCreateForEmployee($leave->employee_id);
                return [
                    'id' => $leave->id,
                    'leave_type' => $leave->leave_type,
                    'leave_start_date' => $leave->leave_start_date->format('Y-m-d'),
                    'leave_end_date' => $leave->leave_end_date->format('Y-m-d'),
                    'leave_days' => $leave->leave_days,
                    'leave_status' => $leave->leave_status,
                    'leave_reason' => $leave->leave_reason,
                    'leave_date_reported' => $leave->leave_date_reported->format('Y-m-d'),
                    'leave_date_approved' => $leave->leave_date_approved ? $leave->leave_date_approved->format('Y-m-d') : null,
                    'leave_comments' => $leave->leave_comments,
                    'created_at' => $leave->created_at->format('Y-m-d H:i:s'),
                    'employee_name' => $employee->employee_name,
                    'picture' => $employee->picture,
                    'department' => $employee->department,
                    'employeeid' => $employee->employeeid,
                    'position' => $employee->position,
                    'remaining_credits' => $leaveCredits->remaining_credits,
                    'used_credits' => $leaveCredits->used_credits,
                    'total_credits' => $leaveCredits->total_credits,
                ];
            })->toArray();

        // Calculate leave stats for the employee
        $totalLeaves = Leave::where('employee_id', $employee->id)->count();
        $pendingLeaves = Leave::where('employee_id', $employee->id)->where('leave_status', 'Pending')->count();
        $approvedLeaves = Leave::where('employee_id', $employee->id)->where('leave_status', 'Approved')->count();
        $rejectedLeaves = Leave::where('employee_id', $employee->id)->where('leave_status', 'Rejected')->count();
        $cancelledLeaves = Leave::where('employee_id', $employee->id)->where('leave_status', 'Cancelled')->count();

        $leaveStats = [
            'totalLeaves' => $totalLeaves,
            'pendingLeaves' => $pendingLeaves,
            'approvedLeaves' => $approvedLeaves,
            'rejectedLeaves' => $rejectedLeaves,
            'cancelledLeaves' => $cancelledLeaves,
        ];

        return Inertia::render('employee-view/request-form/leave/index', [
            'leaveRequests' => $leaveRequests,
            'leaveStats' => $leaveStats,
            'employee' => $employee,
        ]);
    }

    /**
     * Display leave credit summary for all employees.
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

        // Add leave credits information for each employee
        $employeesWithCredits = $employees->map(function ($employee) {
            $leaveCredits = LeaveCredit::getOrCreateForEmployee($employee->id);
            return [
                'id' => $employee->id,
                'employeeid' => $employee->employeeid,
                'employee_name' => $employee->employee_name,
                'department' => $employee->department,
                'position' => $employee->position,
                'remaining_credits' => $leaveCredits->remaining_credits,
                'used_credits' => $leaveCredits->used_credits,
                'total_credits' => $leaveCredits->total_credits,
            ];
        })->toArray();

        // Get monthly leave statistics for the chart
        $monthlyLeaveStats = $this->getMonthlyLeaveStats($supervisedDepartments);

        return Inertia::render('leave/leave-credit', [
            'employees' => $employeesWithCredits,
            'monthlyLeaveStats' => $monthlyLeaveStats,
            'user_permissions' => [
                'is_supervisor' => $isSupervisor,
                'is_super_admin' => $isSuperAdmin,
                'supervised_departments' => $supervisedDepartments,
            ],
        ]);
    }

    /**
     * Get monthly leave statistics for chart display.
     */
    private function getMonthlyLeaveStats($supervisedDepartments = [])
    {
        // Base query for leaves
        $leaveQuery = Leave::query();

        // Filter by supervised departments if supervisor
        if (!empty($supervisedDepartments)) {
            $leaveQuery->whereHas('employee', function ($query) use ($supervisedDepartments) {
                $query->whereIn('department', $supervisedDepartments);
            });
        }

        // Get leaves from the last 12 months
        $startDate = now()->subMonths(11)->startOfMonth();
        $endDate = now()->endOfMonth();

        $leaves = $leaveQuery
            ->whereBetween('leave_start_date', [$startDate, $endDate])
            ->where('leave_status', 'Approved')
            ->get();

        // Get total employee count for percentage calculations
        $employeeQuery = Employee::query();
        if (!empty($supervisedDepartments)) {
            $employeeQuery->whereIn('department', $supervisedDepartments);
        }
        $totalEmployees = $employeeQuery->count();

        // Group leaves by month
        $monthlyData = [];
        for ($i = 11; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $monthKey = $date->format('Y-m');
            $monthName = $date->format('F');
            $year = $date->year;

            // Count leaves for this month
            $monthLeaves = $leaves->filter(function ($leave) use ($date) {
                return $leave->leave_start_date->format('Y-m') === $date->format('Y-m');
            })->count();

            // Calculate percentage
            $percentage = $totalEmployees > 0 ? round(($monthLeaves / $totalEmployees) * 100, 1) : 0;

            $monthlyData[] = [
                'month' => $monthName,
                'year' => $year,
                'leaves' => $monthLeaves,
                'percentage' => $percentage,
                'date' => $date->toDateString(),
            ];
        }

        return $monthlyData;
    }
}

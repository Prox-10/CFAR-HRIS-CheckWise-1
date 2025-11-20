<?php

namespace App\Http\Controllers;

use App\Models\ResumeToWork;
use App\Models\ReturnWork;
use App\Models\Employee;
use App\Models\Notification;
use App\Models\Leave;
use App\Models\Absence;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Exception;

class ResumeToWorkController extends Controller
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

    // Base query for resume to work requests (admin created)
    $resumeQuery = ResumeToWork::with('employee', 'processedBy');

    // Filter based on user role
    if ($isSupervisor && !empty($supervisedDepartments)) {
      $resumeQuery->whereHas('employee', function ($query) use ($supervisedDepartments) {
        $query->whereIn('department', $supervisedDepartments);
      });
    }

    $resumeRequests = $resumeQuery->orderBy('created_at', 'desc')->get();

    // Also get return work requests (employee submitted)
    $returnWorkQuery = ReturnWork::with('employee');

    // Filter based on user role
    if ($isSupervisor && !empty($supervisedDepartments)) {
      $returnWorkQuery->whereHas('employee', function ($query) use ($supervisedDepartments) {
        $query->whereIn('department', $supervisedDepartments);
      });
    }

    $returnWorkRequests = $returnWorkQuery->orderBy('created_at', 'desc')->get();

    // Transform resume requests (admin created)
    $resumeList = $resumeRequests->transform(fn($resume) => [
      'id' => 'resume_' . $resume->id,
      'employee_name' => $resume->employee ? $resume->employee->employee_name : null,
      'employee_id' => $resume->employee ? $resume->employee->employeeid : null,
      'department' => $resume->employee ? $resume->employee->department : null,
      'position' => $resume->employee ? $resume->employee->position : null,
      'return_date' => $resume->return_date ? \Illuminate\Support\Carbon::parse($resume->return_date)->format('Y-m-d') : null,
      'previous_absence_reference' => $resume->previous_absence_reference,
      'comments' => $resume->comments,
      'status' => $resume->status,
      'processed_by' => $resume->processedBy ? $resume->processedBy->name : null,
      'processed_at' => $resume->processed_at ? $resume->processed_at->format('Y-m-d H:i') : null,
      'supervisor_notified' => $resume->supervisor_notified,
      'supervisor_notified_at' => $resume->supervisor_notified_at ? $resume->supervisor_notified_at->format('Y-m-d H:i') : null,
      'created_at' => $resume->created_at->format('Y-m-d H:i'),
      'source' => 'admin',
    ]);

    // Transform return work requests (employee submitted)
    $returnWorkList = $returnWorkRequests->transform(fn($returnWork) => [
      'id' => 'return_' . $returnWork->id,
      'employee_name' => $returnWork->employee ? $returnWork->employee->employee_name : null,
      'employee_id' => $returnWork->employee ? $returnWork->employee->employeeid : null,
      'department' => $returnWork->employee ? $returnWork->employee->department : null,
      'position' => $returnWork->employee ? $returnWork->employee->position : null,
      'return_date' => $returnWork->return_date ? \Illuminate\Support\Carbon::parse($returnWork->return_date)->format('Y-m-d') : null,
      'previous_absence_reference' => $returnWork->absence_type, // Map absence_type to previous_absence_reference
      'comments' => $returnWork->reason, // Map reason to comments
      'status' => in_array($returnWork->status, ['approved', 'processed']) ? 'processed' : 'pending',
      'processed_by' => $returnWork->approver ? $returnWork->approver->name : null,
      'processed_at' => $returnWork->approved_at ? $returnWork->approved_at->format('Y-m-d H:i') : null,
      'supervisor_notified' => false, // Default for return work requests
      'supervisor_notified_at' => null,
      'created_at' => $returnWork->created_at->format('Y-m-d H:i'),
      'source' => 'employee',
    ]);

    // Merge both lists and sort by created_at
    $allRequests = $resumeList->concat($returnWorkList)->sortByDesc('created_at')->values();

    // Get employees for the form
    $employeeQuery = Employee::orderBy('employee_name');

    // Filter employees based on user role
    if ($isSupervisor && !empty($supervisedDepartments)) {
      $employeeQuery->whereIn('department', $supervisedDepartments);
    }

    $employees = $employeeQuery->get()->map(fn($employee) => [
      'id' => $employee->id,
      'employee_name' => $employee->employee_name,
      'employeeid' => $employee->employeeid,
      'department' => $employee->department,
      'position' => $employee->position,
    ]);

    // Get approved leaves (both supervisor and HR approved)
    $approvedLeavesQuery = Leave::with(['employee', 'supervisorApprover', 'hrApprover'])
      ->where('supervisor_status', 'approved')
      ->where('hr_status', 'approved')
      ->where('leave_status', 'Approved');

    // Filter based on user role
    if ($isSupervisor && !empty($supervisedDepartments)) {
      $approvedLeavesQuery->whereHas('employee', function ($query) use ($supervisedDepartments) {
        $query->whereIn('department', $supervisedDepartments);
      });
    }

    $approvedLeaves = $approvedLeavesQuery->orderBy('hr_approved_at', 'desc')
      ->orderBy('leave_end_date', 'desc')
      ->get()
      ->map(function ($leave) {
        return [
          'id' => (string) $leave->id,
          'employee_name' => $leave->employee ? $leave->employee->employee_name : null,
          'employee_id' => $leave->employee ? $leave->employee->employeeid : null,
          'employee_id_db' => $leave->employee_id,
          'department' => $leave->employee ? $leave->employee->department : null,
          'position' => $leave->employee ? $leave->employee->position : null,
          'leave_type' => $leave->leave_type,
          'leave_start_date' => $leave->leave_start_date->format('Y-m-d'),
          'leave_end_date' => $leave->leave_end_date->format('Y-m-d'),
          'leave_days' => $leave->leave_days,
          'leave_reason' => $leave->leave_reason,
          'status' => $leave->leave_status,
          'picture' => $leave->employee ? $leave->employee->picture : null,
          'supervisor_status' => $leave->supervisor_status,
          'hr_status' => $leave->hr_status,
          'supervisor_approved_at' => $leave->supervisor_approved_at ? $leave->supervisor_approved_at->format('Y-m-d H:i:s') : null,
          'hr_approved_at' => $leave->hr_approved_at ? $leave->hr_approved_at->format('Y-m-d H:i:s') : null,
        ];
      })->values();

    // Get approved absences (both supervisor and HR approved)
    $approvedAbsencesQuery = Absence::with(['employee', 'supervisorApprover', 'hrApprover'])
      ->where('supervisor_status', 'approved')
      ->where('hr_status', 'approved')
      ->where('status', 'approved');

    // Filter based on user role
    if ($isSupervisor && !empty($supervisedDepartments)) {
      $approvedAbsencesQuery->whereIn('department', $supervisedDepartments);
    }

    $approvedAbsences = $approvedAbsencesQuery->orderBy('hr_approved_at', 'desc')
      ->orderBy('to_date', 'desc')
      ->get()
      ->map(function ($absence) {
        return [
          'id' => (string) $absence->id,
          'employee_name' => $absence->employee ? $absence->employee->employee_name : $absence->full_name,
          'employee_id' => $absence->employee ? $absence->employee->employeeid : $absence->employee_id_number,
          'employee_id_db' => $absence->employee_id,
          'department' => $absence->department,
          'position' => $absence->position,
          'absence_type' => $absence->absence_type,
          'from_date' => $absence->from_date->format('Y-m-d'),
          'to_date' => $absence->to_date->format('Y-m-d'),
          'days' => $absence->days,
          'reason' => $absence->reason,
          'status' => $absence->status,
          'picture' => $absence->employee ? $absence->employee->picture : null,
          'supervisor_status' => $absence->supervisor_status,
          'hr_status' => $absence->hr_status,
          'supervisor_approved_at' => $absence->supervisor_approved_at ? $absence->supervisor_approved_at->format('Y-m-d H:i:s') : null,
          'hr_approved_at' => $absence->hr_approved_at ? $absence->hr_approved_at->format('Y-m-d H:i:s') : null,
        ];
      })->values();

    return Inertia::render('resume-to-work/index', [
      'resumeRequests' => $allRequests,
      'employees' => $employees,
      'approvedLeaves' => $approvedLeaves,
      'approvedAbsences' => $approvedAbsences,
      'userRole' => [
        'is_supervisor' => $isSupervisor,
        'is_super_admin' => $isSuperAdmin,
        'supervised_departments' => $supervisedDepartments,
      ],
    ]);
  }

  /**
   * Store a newly created resource in storage.
   */
  public function store(Request $request)
  {
    try {
      $request->validate([
        'employee_id' => 'required|exists:employees,id',
        'return_date' => 'required|date',
        'previous_absence_reference' => 'nullable|string',
        'comments' => 'nullable|string',
      ]);

      $resumeToWork = ResumeToWork::create([
        'employee_id' => $request->employee_id,
        'return_date' => $request->return_date,
        'previous_absence_reference' => $request->previous_absence_reference,
        'comments' => $request->comments,
        'status' => 'pending',
      ]);

      // Create notification for the supervisor of the employee's department
      $employee = Employee::find($request->employee_id);
      $supervisor = \App\Models\User::getSupervisorForDepartment($employee->department);

      if ($supervisor) {
        Notification::create([
          'type' => 'resume_to_work',
          'user_id' => $supervisor->id,
          'data' => [
            'resume_id' => $resumeToWork->id,
            'employee_name' => $employee ? $employee->employee_name : null,
            'return_date' => $request->return_date,
            'department' => $employee->department,
          ],
        ]);
      }

      return redirect()->back()->with('success', 'Resume to work form submitted successfully!');
    } catch (Exception $e) {
      Log::error('Resume to work creation failed: ' . $e->getMessage());
      return redirect()->back()->with('error', 'Failed to submit resume to work form. Please try again.');
    }
  }

  /**
   * Process resume to work form (HR Admin action)
   */
  public function process(Request $request, $resumeToWorkId)
  {
    try {
      $user = Auth::user();

      // Only HR Admin or Super Admin can process
      if (!$user->isSuperAdmin() && !$user->hasRole('HR Admin')) {
        return redirect()->back()->with('error', 'Unauthorized action.');
      }

      // Parse the ID to determine if it's a resume or return work request
      if (str_starts_with($resumeToWorkId, 'resume_')) {
        $id = str_replace('resume_', '', $resumeToWorkId);
        $resumeToWork = ResumeToWork::findOrFail($id);
        $resumeToWork->markAsProcessed($user->id);
        $employee = $resumeToWork->employee;
        $returnDate = $resumeToWork->return_date ? \Illuminate\Support\Carbon::parse($resumeToWork->return_date)->format('Y-m-d') : null;
      } elseif (str_starts_with($resumeToWorkId, 'return_')) {
        $id = str_replace('return_', '', $resumeToWorkId);
        $returnWork = ReturnWork::findOrFail($id);
        $returnWork->update([
          'status' => 'approved',
          'approved_by' => $user->id,
          'approved_at' => now(),
        ]);
        $employee = $returnWork->employee;
        $returnDate = $returnWork->return_date ? \Illuminate\Support\Carbon::parse($returnWork->return_date)->format('Y-m-d') : null;
      } else {
        return redirect()->back()->with('error', 'Invalid request ID.');
      }

      // Create notification for supervisor
      if ($employee) {
        Notification::create([
          'type' => 'employee_returned',
          'data' => [
            'employee_name' => $employee->employee_name,
            'employee_id' => $employee->employeeid,
            'department' => $employee->department,
            'return_date' => $returnDate,
          ],
        ]);

        // Broadcast real-time notification using Laravel Echo Reverb
        try {
          broadcast(new \App\Events\ReturnWorkProcessed([
            'return_work_id' => $resumeToWorkId,
            'employee_name' => $employee->employee_name,
            'employee_id_number' => $employee->employeeid,
            'department' => $employee->department,
            'return_date' => $returnDate,
            'processed_by' => $user->name,
            'processed_at' => now()->format('Y-m-d H:i'),
          ]));

          // Also broadcast status update to employee
          if (str_starts_with($resumeToWorkId, 'return_')) {
            broadcast(new \App\Events\ReturnWorkStatusUpdated([
              'request_id' => str_replace('return_', '', $resumeToWorkId),
              'status' => 'approved',
              'employee_id' => $employee->id,
              'employee_name' => $employee->employee_name,
              'department' => $employee->department,
              'return_date' => $returnDate,
              'absence_type' => $returnWork->absence_type ?? '',
              'reason' => $returnWork->reason ?? '',
              'approved_by' => $user->name,
              'approved_at' => now()->format('Y-m-d H:i'),
            ]));
          }
        } catch (\Exception $broadcastError) {
          Log::warning('Failed to broadcast return work processed notification: ' . $broadcastError->getMessage());
        }
      }

      return redirect()->back()->with('success', 'Resume to work form processed successfully! Supervisor has been notified.');
    } catch (Exception $e) {
      Log::error('Resume to work processing failed: ' . $e->getMessage());
      return redirect()->back()->with('error', 'Failed to process resume to work form. Please try again.');
    }
  }

  /**
   * Mark supervisor as notified
   */
  public function markSupervisorNotified(ResumeToWork $resumeToWork)
  {
    try {
      $resumeToWork->markSupervisorNotified();
      return response()->json(['success' => true]);
    } catch (Exception $e) {
      Log::error('Mark supervisor notified failed: ' . $e->getMessage());
      return response()->json(['success' => false], 500);
    }
  }
}

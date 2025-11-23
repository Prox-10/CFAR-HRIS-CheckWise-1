<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyCheckingAssignment;
use App\Models\DailyCheckingPdf;
use App\Models\Employee;
use App\Models\HRDepartmentAssignment;
use App\Models\ManagerDepartmentAssignment;
use App\Models\Leave;
use App\Models\Attendance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class DailyCheckingController extends Controller
{
    /**
     * Save daily checking assignments
     */
    public function store(Request $request)
    {
        $request->validate([
            'week_start_date' => 'required|date',
            'assignments' => 'required|array',
            'prepared_by' => 'nullable|string',
            'checked_by' => 'nullable|string',
            'day_of_save' => 'nullable|date', // The actual date when saving (e.g., Nov 12, 2025)
            'pdf_base64' => 'nullable|string', // Base64 encoded PDF
        ]);

        $weekStartDate = $request->week_start_date;
        $preparedBy = $request->prepared_by;
        $checkedBy = $request->checked_by;
        // Use provided day_of_save (selected date from calendar)
        $dayOfSave = $request->day_of_save ?? now()->format('Y-m-d');

        // Calculate which day_index corresponds to the selected date (day_of_save)
        $selectedDate = new \DateTime($dayOfSave);
        $dayOfWeek = (int)$selectedDate->format('w'); // 0 = Sunday, 1 = Monday, etc.
        $daysToSubtract = $dayOfWeek === 0 ? 6 : $dayOfWeek - 1;
        $calculatedWeekStart = clone $selectedDate;
        $calculatedWeekStart->modify("-{$daysToSubtract} days");
        $calculatedWeekStartStr = $calculatedWeekStart->format('Y-m-d');

        // Calculate day_index (0-6) for the selected date
        $dayIndex = $dayOfWeek === 0 ? 6 : $dayOfWeek - 1; // Convert to 0-6 (Monday-Sunday)

        // Verify that the calculated week_start_date matches the provided week_start_date
        if ($calculatedWeekStartStr !== $weekStartDate) {
            return response()->json([
                'success' => false,
                'message' => 'Selected date does not match the week start date',
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Check for locked employees (based on configurable lock period)
            // Employees can only be assigned to a NEW position if lock period has passed
            // If lock period is 0, no employees are locked
            $lockedEmployees = [];
            $lockPeriod = $this->getLockPeriod();

            // If lock period is 0, skip lock validation (no restrictions)
            if ($lockPeriod > 0) {
                foreach ($request->assignments as $assignment) {
                    $employee = Employee::where('employee_name', $assignment['employee_name'])->first();

                    if (!$employee) {
                        continue;
                    }

                    // Check if employee has an assignment within the lock period
                    // Get the most recent assignment_date for this employee
                    $recentAssignment = DailyCheckingAssignment::where('employee_id', $employee->id)
                        ->whereNotNull('assignment_date')
                        ->orderBy('assignment_date', 'desc')
                        ->first();

                    if ($recentAssignment) {
                        $assignmentDate = \Carbon\Carbon::parse($recentAssignment->assignment_date);
                        $lockUntil = $assignmentDate->copy()->addDays($lockPeriod);
                        $today = \Carbon\Carbon::today();

                        // Check if employee is still locked (within lock period)
                        $isStillLocked = $today->lte($lockUntil);

                        if ($isStillLocked) {
                            // Check if this is a different assignment (different position, slot, or microteam)
                            // Allow same assignment (editing existing assignment)
                            $isDifferentAssignment =
                                $recentAssignment->position_field !== $assignment['position_field'] ||
                                $recentAssignment->slot_index !== $assignment['slot_index'] ||
                                $recentAssignment->microteam !== ($assignment['microteam'] ?? null);

                            if ($isDifferentAssignment) {
                                $lockedEmployees[] = [
                                    'employee_name' => $employee->employee_name,
                                    'assignment_date' => $assignmentDate->format('Y-m-d'),
                                    'lock_until' => $lockUntil->format('Y-m-d'),
                                ];
                            }
                        }
                        // If lock period has passed, employee is unlocked and can be assigned again
                    }
                }
            }

            // If there are locked employees, return error
            if (!empty($lockedEmployees)) {
                DB::rollBack();
                $lockedNames = implode(', ', array_column($lockedEmployees, 'employee_name'));
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot assign employees within 14 days of previous assignment',
                    'locked_employees' => $lockedEmployees,
                    'details' => "The following employees are locked: {$lockedNames}. They cannot be reassigned until 14 days have passed from their last assignment date.",
                ], 400);
            }

            // Delete existing assignments ONLY for the specific day_index and microteam
            // This ensures we only delete records for the selected date, not the whole week
            if (!empty($request->assignments)) {
                $microteamsToDelete = [];

                // Scan all assignments to find what needs to be deleted
                foreach ($request->assignments as $assignment) {
                    $microteam = $assignment['microteam'] ?? null;
                    if ($microteam && !in_array($microteam, $microteamsToDelete)) {
                        $microteamsToDelete[] = $microteam;
                    }
                }

                // Delete only assignments for the specific day_index and microteam
                foreach ($microteamsToDelete as $microteam) {
                    DailyCheckingAssignment::where('week_start_date', $weekStartDate)
                        ->where('day_index', $dayIndex)
                        ->where('microteam', $microteam)
                        ->delete();
                }
            }

            // Save new assignments ONLY for the selected date (specific day_index)
            foreach ($request->assignments as $assignment) {
                // Find employee by employee_name
                $employee = Employee::where('employee_name', $assignment['employee_name'])->first();

                if (!$employee) {
                    continue; // Skip if employee not found
                }

                // Get time data ONLY for the selected day_index
                $timeData = $assignment['time_data'][$dayIndex] ?? null;

                // Convert empty strings to null for time_in and time_out
                $timeIn = $timeData['time_in'] ?? null;
                $timeOut = $timeData['time_out'] ?? null;

                // If time_in or time_out is an empty string, convert to null
                $timeIn = ($timeIn === '' || $timeIn === null) ? null : $timeIn;
                $timeOut = ($timeOut === '' || $timeOut === null) ? null : $timeOut;

                // Set assignment_date to the current day_of_save when saving
                // This tracks when the employee was assigned for the 14-day lock period
                // Update assignment_date for ALL existing assignments of this employee to reset the lock period
                // This ensures the 14-day lock starts from the most recent assignment
                $assignmentDate = $dayOfSave;

                // Update all existing assignments for this employee to have the same assignment_date
                // This ensures consistent lock period calculation
                DailyCheckingAssignment::where('employee_id', $employee->id)
                    ->whereNotNull('assignment_date')
                    ->update(['assignment_date' => $assignmentDate]);

                // Save ONLY for the selected date (day_index)
                DailyCheckingAssignment::create([
                    'week_start_date' => $weekStartDate,
                    'employee_id' => $employee->id,
                    'position_field' => $assignment['position_field'],
                    'slot_index' => $assignment['slot_index'],
                    'microteam' => $assignment['microteam'] ?? null,
                    'is_add_crew' => $assignment['is_add_crew'] ?? false,
                    'day_index' => $dayIndex, // Only save for the selected date's day_index
                    'day_of_save' => $dayOfSave, // Store the selected date (e.g., 2025-11-11)
                    'assignment_date' => $assignmentDate, // Store assignment date for 14-day lock
                    'time_in' => $timeIn,
                    'time_out' => $timeOut,
                    'prepared_by' => $preparedBy,
                    'checked_by' => $checkedBy,
                ]);
            }

            // Save PDF if provided
            if ($request->has('pdf_base64') && !empty($request->pdf_base64)) {
                try {
                    // Decode base64 PDF
                    $pdfBinary = base64_decode($request->pdf_base64);

                    if ($pdfBinary !== false) {
                        // Get microteam from first assignment (all assignments should have same microteam)
                        $pdfMicroteam = null;
                        if (!empty($request->assignments) && isset($request->assignments[0]['microteam'])) {
                            $pdfMicroteam = $request->assignments[0]['microteam'];
                        }

                        // Generate filename
                        $microteamStr = $pdfMicroteam ? str_replace(' ', '_', $pdfMicroteam) : 'all';
                        $filename = 'daily_checking_' . $weekStartDate . '_' . $microteamStr . '_' . $dayOfSave . '.pdf';

                        // Store to disk
                        $disk = 'public';
                        $relativeDir = 'daily_checking_pdfs/' . date('Y/m', strtotime($dayOfSave));
                        $relativePath = $relativeDir . '/' . $filename;

                        // Ensure directory exists
                        Storage::disk($disk)->makeDirectory($relativeDir);

                        // Store PDF file
                        Storage::disk($disk)->put($relativePath, $pdfBinary, 'public');

                        // Save PDF record to database
                        DailyCheckingPdf::updateOrCreate(
                            [
                                'week_start_date' => $weekStartDate,
                                'day_of_save' => $dayOfSave,
                                'microteam' => $pdfMicroteam,
                            ],
                            [
                                'file_name' => $filename,
                                'mime_type' => 'application/pdf',
                                'disk' => $disk,
                                'path' => $relativePath,
                                'size_bytes' => strlen($pdfBinary),
                                'prepared_by' => $preparedBy,
                                'checked_by' => $checkedBy,
                            ]
                        );
                    }
                } catch (\Exception $pdfError) {
                    // Log PDF error but don't fail the entire save operation
                    Log::error('Failed to save PDF for daily checking', [
                        'error' => $pdfError->getMessage(),
                        'week_start_date' => $weekStartDate,
                        'day_of_save' => $dayOfSave,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Daily checking assignments saved successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to save assignments: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get daily checking assignments for a specific date
     * Returns employees grouped by microteam (only Regular and Probationary)
     */
    public function getForDate(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
        ]);

        $date = $request->date;
        $selectedDate = new \DateTime($date);
        $dateStr = $selectedDate->format('Y-m-d');

        // Calculate Monday of the week (for backward compatibility and reference)
        $dayOfWeek = (int)$selectedDate->format('w'); // 0 = Sunday, 1 = Monday, etc.
        $daysToSubtract = $dayOfWeek === 0 ? 6 : $dayOfWeek - 1;
        $weekStartDate = clone $selectedDate;
        $weekStartDate->modify("-{$daysToSubtract} days");
        $weekStartDateStr = $weekStartDate->format('Y-m-d');

        // Get the day index (0-6) for the selected date (for reference)
        $dayIndex = (int)$selectedDate->format('w');
        $dayIndex = $dayIndex === 0 ? 6 : $dayIndex - 1; // Convert to 0-6 (Monday-Sunday)

        // Debug logging (can be removed in production)
        Log::info('DailyChecking getForDate', [
            'requested_date' => $date,
            'calculated_week_start_date' => $weekStartDateStr,
            'calculated_day_index' => $dayIndex,
            'day_of_week' => $dayOfWeek,
            'querying_by_day_of_save' => $dateStr,
        ]);

        // Query by the actual attendance date (week_start_date + day_index)
        // day_of_save is the date when saving happened, not the attendance date
        // We need to calculate the actual attendance date from week_start_date + day_index
        // This ensures we get records for the EXACT date requested
        $allAssignments = DailyCheckingAssignment::with(['employee' => function ($query) {
            $query->withTrashed(); // Include soft-deleted employees
        }])
            ->whereRaw("DATE_ADD(week_start_date, INTERVAL day_index DAY) = ?", [$dateStr])
            ->get();

        // Debug: Log how many assignments found
        Log::info('DailyChecking assignments found', [
            'total_assignments' => $allAssignments->count(),
            'assignments_with_time' => $allAssignments->filter(function ($a) {
                return $a->time_in !== null || $a->time_out !== null;
            })->count(),
        ]);

        // Include ALL assignments regardless of time_in/time_out status
        // This allows displaying employees even if they don't have time records yet
        $assignments = $allAssignments;

        // Group employees by microteam using saved microteam field
        $microteams = [
            'MICROTEAM - 01' => [],
            'MICROTEAM - 02' => [],
            'MICROTEAM - 03' => [],
        ];

        foreach ($assignments as $assignment) {
            if (!$assignment->employee) {
                continue;
            }

            // Include all employees (regular and Add Crew) in their respective microteams
            // Add Crew is now saved with microteam, so it's included in microteams
            // Only include Regular and Probationary employees in microteams (Add Crew is handled separately)
            $workStatus = $assignment->employee->work_status;
            if (!in_array($workStatus, ['Regular', 'Probationary'])) {
                continue; // Skip Add Crew employees from microteams - they're handled separately
            }

            // Use the saved microteam field
            // Include ALL employees regardless of time_in/time_out status
            if ($assignment->microteam && isset($microteams[$assignment->microteam])) {
                $microteams[$assignment->microteam][] = [
                    'id' => $assignment->employee->id,
                    'employee_name' => $assignment->employee->employee_name,
                    'employeeid' => $assignment->employee->employeeid,
                    'work_status' => $assignment->employee->work_status,
                    'position' => $assignment->position_field,
                    'time_in' => $assignment->time_in ? (string)$assignment->time_in : null,
                    'time_out' => $assignment->time_out ? (string)$assignment->time_out : null,
                ];
            }
        }

        // Get Add Crew employees grouped by microteam
        // Microteam 1 → ADD CREW - 01, Microteam 2 → ADD CREW - 02, Microteam 3 → ADD CREW - 03
        $addCrewByMicroteam = [
            'MICROTEAM - 01' => [],
            'MICROTEAM - 02' => [],
            'MICROTEAM - 03' => [],
        ];

        foreach ($assignments as $assignment) {
            if (!$assignment->employee) {
                continue;
            }

            // Include Add Crew employees grouped by their microteam
            if ($assignment->is_add_crew || $assignment->employee->work_status === 'Add Crew') {
                $microteam = $assignment->microteam;
                if ($microteam && isset($addCrewByMicroteam[$microteam])) {
                    // Check if employee already added to avoid duplicates
                    $alreadyAdded = false;
                    foreach ($addCrewByMicroteam[$microteam] as $existing) {
                        if ($existing['employee_name'] === $assignment->employee->employee_name) {
                            $alreadyAdded = true;
                            break;
                        }
                    }

                    if (!$alreadyAdded) {
                        // Include ALL Add Crew employees regardless of time_in/time_out status
                        $addCrewByMicroteam[$microteam][] = [
                            'id' => $assignment->employee->id,
                            'employee_name' => $assignment->employee->employee_name,
                            'employeeid' => $assignment->employee->employeeid,
                            'work_status' => $assignment->employee->work_status,
                            'position' => $assignment->position_field,
                            'time_in' => $assignment->time_in ? (string)$assignment->time_in : null,
                            'time_out' => $assignment->time_out ? (string)$assignment->time_out : null,
                        ];
                    }
                }
            }
        }

        return response()->json([
            'date' => $date,
            'week_start_date' => $weekStartDateStr,
            'day_index' => $dayIndex,
            'microteams' => $microteams,
            'add_crew' => $addCrewByMicroteam, // Now returns grouped by microteam
        ]);
    }

    /**
     * Get daily checking assignments for a specific microteam and week
     * Returns assignments formatted for loading back into the form
     */
    public function getByMicroteam(Request $request)
    {
        $request->validate([
            'week_start_date' => 'required|date',
            'microteam' => 'nullable|string',
        ]);

        $weekStartDate = $request->week_start_date;
        $microteam = $request->microteam;

        // Get assignments for the microteam (if specified)
        $assignments = collect();

        if ($microteam) {
            // Get all assignments for specific microteam (including Add Crew - it's saved per microteam)
            $microteamAssignments = DailyCheckingAssignment::with(['employee' => function ($query) {
                $query->withTrashed();
            }])
                ->where('week_start_date', $weekStartDate)
                ->where('microteam', $microteam)
                ->get();

            $assignments = $assignments->merge($microteamAssignments);
        } else {
            // Get Add Crew assignments only
            $assignments = DailyCheckingAssignment::with(['employee' => function ($query) {
                $query->withTrashed();
            }])
                ->where('week_start_date', $weekStartDate)
                ->where('is_add_crew', true)
                ->get();
        }

        // Group assignments by position_field and slot_index
        $assignmentData = [];
        $timeData = [];

        // Get unique assignments (group by employee, position, slot - all days have same employee)
        $uniqueAssignments = [];
        foreach ($assignments as $assignment) {
            if (!$assignment->employee) {
                continue;
            }

            $key = "{$assignment->employee_id}_{$assignment->position_field}_{$assignment->slot_index}";
            if (!isset($uniqueAssignments[$key])) {
                $uniqueAssignments[$key] = [
                    'employee_name' => $assignment->employee->employee_name,
                    'position_field' => $assignment->position_field,
                    'slot_index' => $assignment->slot_index,
                    'times' => [],
                ];
            }

            // Store time data for each day
            $uniqueAssignments[$key]['times'][$assignment->day_index] = [
                'time_in' => $assignment->time_in ? (string)$assignment->time_in : '',
                'time_out' => $assignment->time_out ? (string)$assignment->time_out : '',
            ];
        }

        // Build assignmentData and timeData structures
        foreach ($uniqueAssignments as $assignment) {
            $positionField = $assignment['position_field'];
            $slotIndex = $assignment['slot_index'];

            // Initialize arrays if needed
            if (!isset($assignmentData[$positionField])) {
                $assignmentData[$positionField] = [];
            }
            if (!isset($timeData[$positionField])) {
                $timeData[$positionField] = [];
            }
            if (!isset($timeData[$positionField][$slotIndex])) {
                $timeData[$positionField][$slotIndex] = [];
            }

            // Set employee name at the correct slot index
            // We need to ensure the array is large enough
            while (count($assignmentData[$positionField]) <= $slotIndex) {
                $assignmentData[$positionField][] = '';
            }
            $assignmentData[$positionField][$slotIndex] = $assignment['employee_name'];

            // Set time data for all days
            for ($dayIndex = 0; $dayIndex < 7; $dayIndex++) {
                $dayTime = $assignment['times'][$dayIndex] ?? ['time_in' => '', 'time_out' => ''];
                $timeData[$positionField][$slotIndex][$dayIndex] = [
                    'time_in' => $dayTime['time_in'] ?? '',
                    'time_out' => $dayTime['time_out'] ?? '',
                ];
            }
        }

        // Get prepared_by and checked_by from any assignment (they should be the same for the week)
        $preparedBy = '';
        $checkedBy = '';
        if ($assignments->isNotEmpty()) {
            $firstAssignment = $assignments->first();
            $preparedBy = $firstAssignment->prepared_by ?? '';
            $checkedBy = $firstAssignment->checked_by ?? '';
        }

        return response()->json([
            'assignment_data' => $assignmentData,
            'time_data' => $timeData,
            'prepared_by' => $preparedBy,
            'checked_by' => $checkedBy,
        ]);
    }

    /**
     * Get locked employees (based on configurable lock period)
     * Returns list of employees who cannot be assigned to new positions
     */
    public function getLockedEmployees(Request $request)
    {
        $today = \Carbon\Carbon::today();

        // Get lock period from request or settings (default to 14 days)
        $lockPeriod = (int)($request->query('lock_period') ?? $this->getLockPeriod());

        // If lock period is 0, no employees are locked
        if ($lockPeriod === 0) {
            return response()->json([
                'locked_employees' => [],
            ]);
        }

        // Get all employees with assignments and check if they're still locked
        $allAssignments = DailyCheckingAssignment::with('employee')
            ->whereNotNull('assignment_date')
            ->get();

        // Group by employee and get the most recent assignment date
        $employeeAssignments = [];
        foreach ($allAssignments as $assignment) {
            if (!$assignment->employee) {
                continue;
            }

            $employeeName = $assignment->employee->employee_name;
            $assignmentDateObj = \Carbon\Carbon::parse($assignment->assignment_date);

            // Keep the most recent assignment date for each employee
            if (
                !isset($employeeAssignments[$employeeName]) ||
                $assignmentDateObj->gt(\Carbon\Carbon::parse($employeeAssignments[$employeeName]['assignment_date']))
            ) {
                $employeeAssignments[$employeeName] = [
                    'employee_name' => $employeeName,
                    'employee_id' => $assignment->employee_id,
                    'assignment_date' => $assignmentDateObj,
                ];
            }
        }

        // Filter to only include employees still within the lock period
        $lockedEmployees = [];
        foreach ($employeeAssignments as $employeeName => $data) {
            $assignmentDate = $data['assignment_date'];
            $lockUntil = $assignmentDate->copy()->addDays($lockPeriod);

            // Only include if still locked (today is before or equal to lock_until)
            if ($today->lte($lockUntil)) {
                $daysRemaining = max(0, $today->diffInDays($lockUntil, false));

                $lockedEmployees[$employeeName] = [
                    'employee_name' => $employeeName,
                    'employee_id' => $data['employee_id'],
                    'assignment_date' => $assignmentDate->format('Y-m-d'),
                    'lock_until' => $lockUntil->format('Y-m-d'),
                    'days_remaining' => $daysRemaining,
                ];
            }
            // If lock period has passed, employee is not included (unlocked)
        }

        return response()->json([
            'locked_employees' => array_values($lockedEmployees),
        ]);
    }

    /**
     * Get daily checking settings
     */
    public function getSettings(Request $request)
    {
        $settings = DB::table('daily_checking_settings')->first();

        if (!$settings) {
            // Return no lock (both off) if no settings exist
            return response()->json([
                'lock_period_7_days' => false,
                'lock_period_14_days' => false,
            ]);
        }

        return response()->json([
            'lock_period_7_days' => (bool)$settings->lock_period_7_days,
            'lock_period_14_days' => (bool)$settings->lock_period_14_days,
        ]);
    }

    /**
     * Save daily checking settings
     */
    public function saveSettings(Request $request)
    {
        $request->validate([
            'lock_period_7_days' => 'required|boolean',
            'lock_period_14_days' => 'required|boolean',
        ]);

        DB::table('daily_checking_settings')->updateOrInsert(
            ['id' => 1],
            [
                'lock_period_7_days' => $request->lock_period_7_days ? 1 : 0,
                'lock_period_14_days' => $request->lock_period_14_days ? 1 : 0,
                'updated_at' => now(),
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Settings saved successfully',
        ]);
    }

    /**
     * Get current lock period from settings
     * Returns 7, 14, or 0 (no lock)
     */
    private function getLockPeriod(): int
    {
        $settings = DB::table('daily_checking_settings')->first();

        if (!$settings) {
            return 0; // No lock if no settings exist
        }

        if ($settings->lock_period_7_days) {
            return 7;
        }

        if ($settings->lock_period_14_days) {
            return 14;
        }

        return 0; // No lock if both are off
    }

    /**
     * Get HR personnel for Packing Plant department
     * Returns HR from hr_department_assignments table
     */
    public function getHR(Request $request)
    {
        $department = $request->query('department', 'Packing Plant');

        $hrAssignment = HRDepartmentAssignment::where('department', $department)
            ->with('user')
            ->first();

        if (!$hrAssignment || !$hrAssignment->user) {
            return response()->json([
                'id' => null,
                'name' => 'HR Personnel',
            ]);
        }

        $hrUser = $hrAssignment->user;
        $fullName = trim(($hrUser->firstname ?? '') . ' ' . ($hrUser->lastname ?? ''));

        return response()->json([
            'id' => $hrUser->id,
            'name' => $fullName ?: 'HR Personnel',
        ]);
    }

    /**
     * Get Manager for Packing Plant department
     * Returns Manager from manager_department_assignments table
     */
    public function getManager(Request $request)
    {
        $department = $request->query('department', 'Packing Plant');

        $managerAssignment = ManagerDepartmentAssignment::where('department', $department)
            ->with('user')
            ->first();

        if (!$managerAssignment || !$managerAssignment->user) {
            return response()->json([
                'id' => null,
                'name' => 'Manager',
            ]);
        }

        $managerUser = $managerAssignment->user;
        $fullName = trim(($managerUser->firstname ?? '') . ' ' . ($managerUser->lastname ?? ''));

        return response()->json([
            'id' => $managerUser->id,
            'name' => $fullName ?: 'Manager',
        ]);
    }

    /**
     * Get approved Maternity Leave and Paternity Leave requests for a date range
     * Returns leaves grouped by date for employees from Packing Plant and Coop Area
     */
    public function getApprovedMLPL(Request $request)
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date',
            'lock_period' => 'nullable|integer', // 7 or 14 days
        ]);

        $startDate = \Carbon\Carbon::parse($request->start_date);
        $endDate = \Carbon\Carbon::parse($request->end_date);
        $lockPeriod = (int)($request->query('lock_period') ?? 0);

        // DEBUG: Log request parameters
        Log::info('ML/PL API Request', [
            'start_date' => $startDate->format('Y-m-d'),
            'end_date' => $endDate->format('Y-m-d'),
            'lock_period' => $lockPeriod,
            'today' => \Carbon\Carbon::today()->format('Y-m-d'),
        ]);

        // Get approved leaves (both supervisor and HR approved)
        // Only Maternity Leave and Paternity Leave
        $leaves = Leave::with('employee')
            ->where('supervisor_status', 'approved')
            ->where('hr_status', 'approved')
            ->whereIn('leave_type', ['Maternity Leave', 'Paternity Leave'])
            ->whereHas('employee', function ($query) {
                // Only employees from Packing Plant and Coop Area
                $query->whereIn('department', ['Packing Plant', 'Coop Area']);
            })
            ->get();

        // DEBUG: Log total leaves found
        Log::info('ML/PL Leaves Found', [
            'total_leaves' => $leaves->count(),
            'leaves_detail' => $leaves->map(function ($leave) {
                return [
                    'id' => $leave->id,
                    'employee_name' => $leave->employee?->employee_name ?? 'N/A',
                    'employee_id' => $leave->employee_id,
                    'department' => $leave->employee?->department ?? 'N/A',
                    'leave_type' => $leave->leave_type,
                    'leave_start_date' => $leave->leave_start_date instanceof \Carbon\Carbon
                        ? $leave->leave_start_date->format('Y-m-d')
                        : ($leave->leave_start_date ? \Carbon\Carbon::parse($leave->leave_start_date)->format('Y-m-d') : null),
                    'leave_end_date' => $leave->leave_end_date instanceof \Carbon\Carbon
                        ? $leave->leave_end_date->format('Y-m-d')
                        : ($leave->leave_end_date ? \Carbon\Carbon::parse($leave->leave_end_date)->format('Y-m-d') : null),
                    'supervisor_status' => $leave->supervisor_status,
                    'hr_status' => $leave->hr_status,
                ];
            })->toArray(),
        ]);

        // Filter leaves that overlap with the date range
        // and check if they're within the lock period
        $today = \Carbon\Carbon::today();
        $leavesByDate = [];
        $debugInfo = [
            'processed_leaves' => [],
            'excluded_leaves' => [],
        ];

        foreach ($leaves as $leave) {
            $leaveDebug = [
                'leave_id' => $leave->id,
                'employee_name' => $leave->employee?->employee_name ?? 'N/A',
                'employee_id' => $leave->employee_id,
                'leave_type' => $leave->leave_type,
                'leave_start' => $leave->leave_start_date instanceof \Carbon\Carbon
                    ? $leave->leave_start_date->format('Y-m-d')
                    : ($leave->leave_start_date ? \Carbon\Carbon::parse($leave->leave_start_date)->format('Y-m-d') : null),
                'leave_end' => $leave->leave_end_date instanceof \Carbon\Carbon
                    ? $leave->leave_end_date->format('Y-m-d')
                    : ($leave->leave_end_date ? \Carbon\Carbon::parse($leave->leave_end_date)->format('Y-m-d') : null),
            ];

            if (!$leave->employee) {
                $leaveDebug['excluded_reason'] = 'No employee found';
                $debugInfo['excluded_leaves'][] = $leaveDebug;
                Log::warning('ML/PL Leave excluded: No employee', $leaveDebug);
                continue;
            }

            // Leave dates are already Carbon instances from model casts
            $leaveStart = $leave->leave_start_date instanceof \Carbon\Carbon
                ? $leave->leave_start_date
                : \Carbon\Carbon::parse($leave->leave_start_date);
            $leaveEnd = $leave->leave_end_date instanceof \Carbon\Carbon
                ? $leave->leave_end_date
                : \Carbon\Carbon::parse($leave->leave_end_date);

            // Check if leave overlaps with the requested date range
            if ($leaveEnd->lt($startDate) || $leaveStart->gt($endDate)) {
                $leaveDebug['excluded_reason'] = 'Does not overlap with date range';
                $leaveDebug['date_range_check'] = [
                    'leave_end' => $leaveEnd->format('Y-m-d'),
                    'request_start' => $startDate->format('Y-m-d'),
                    'leave_start' => $leaveStart->format('Y-m-d'),
                    'request_end' => $endDate->format('Y-m-d'),
                    'end_before_start' => $leaveEnd->lt($startDate),
                    'start_after_end' => $leaveStart->gt($endDate),
                ];
                $debugInfo['excluded_leaves'][] = $leaveDebug;
                Log::info('ML/PL Leave excluded: Date range mismatch', $leaveDebug);
                continue; // Leave doesn't overlap with date range
            }

            // Check if leave is within lock period (if lock period is set)
            $isWithinLockPeriod = false;
            $hasAttendanceBeforeLeave = false;

            if ($lockPeriod > 0) {
                // Check if any date in the leave range is within lock period from today
                $currentDate = $leaveStart->copy();
                $lockPeriodDates = [];
                while ($currentDate->lte($leaveEnd)) {
                    $daysFromToday = $today->diffInDays($currentDate, false);
                    // Check if date is within lock period (within 7 or 14 days from today, future dates only)
                    if ($daysFromToday >= 0 && $daysFromToday <= $lockPeriod) {
                        $isWithinLockPeriod = true;
                        $lockPeriodDates[] = [
                            'date' => $currentDate->format('Y-m-d'),
                            'days_from_today' => $daysFromToday,
                        ];
                        break;
                    }
                    $currentDate->addDay();
                }

                $leaveDebug['lock_period_check'] = [
                    'lock_period' => $lockPeriod,
                    'is_within_lock_period' => $isWithinLockPeriod,
                    'checked_dates' => $lockPeriodDates,
                ];

                // NEW: Check if employee had attendance before the leave start date (within lock period)
                // If employee had attendance before leave, count them for all leave days even without attendance during leave
                $attendanceCheckStart = $leaveStart->copy()->subDays($lockPeriod);
                $attendanceCheckEnd = $leaveStart->copy()->subDay(); // Day before leave starts

                // Check if employee has attendance between (leave_start - lock_period) and (leave_start - 1 day)
                $attendanceRecords = Attendance::where('employee_id', $leave->employee_id)
                    ->whereBetween('attendance_date', [
                        $attendanceCheckStart->format('Y-m-d'),
                        $attendanceCheckEnd->format('Y-m-d')
                    ])
                    ->get();

                $hasAttendanceBeforeLeave = $attendanceRecords->count() > 0;

                $leaveDebug['attendance_check'] = [
                    'check_start' => $attendanceCheckStart->format('Y-m-d'),
                    'check_end' => $attendanceCheckEnd->format('Y-m-d'),
                    'has_attendance_before_leave' => $hasAttendanceBeforeLeave,
                    'attendance_count' => $attendanceRecords->count(),
                    'attendance_dates' => $attendanceRecords->map(function ($att) {
                        return $att->attendance_date->format('Y-m-d');
                    })->toArray(),
                ];

                // If leave is within lock period OR employee had attendance before leave (within lock period), include it
                if (!$isWithinLockPeriod && !$hasAttendanceBeforeLeave) {
                    $leaveDebug['excluded_reason'] = 'Beyond lock period and no attendance before leave';
                    $debugInfo['excluded_leaves'][] = $leaveDebug;
                    Log::info('ML/PL Leave excluded: Lock period and attendance check failed', $leaveDebug);
                    continue; // Leave is beyond lock period and no attendance before leave
                }
            } else {
                // If no lock period, check if employee had attendance before leave (within reasonable range, e.g., 30 days)
                $attendanceCheckStart = $leaveStart->copy()->subDays(30);
                $attendanceCheckEnd = $leaveStart->copy()->subDay();

                $attendanceRecords = Attendance::where('employee_id', $leave->employee_id)
                    ->whereBetween('attendance_date', [
                        $attendanceCheckStart->format('Y-m-d'),
                        $attendanceCheckEnd->format('Y-m-d')
                    ])
                    ->get();

                $hasAttendanceBeforeLeave = $attendanceRecords->count() > 0;

                $leaveDebug['attendance_check'] = [
                    'check_start' => $attendanceCheckStart->format('Y-m-d'),
                    'check_end' => $attendanceCheckEnd->format('Y-m-d'),
                    'has_attendance_before_leave' => $hasAttendanceBeforeLeave,
                    'attendance_count' => $attendanceRecords->count(),
                    'attendance_dates' => $attendanceRecords->map(function ($att) {
                        return $att->attendance_date->format('Y-m-d');
                    })->toArray(),
                ];
            }

            // Generate all dates in the leave range that fall within the requested date range
            $currentDate = $leaveStart->copy();
            if ($currentDate->lt($startDate)) {
                $currentDate = $startDate->copy();
            }

            $maxDate = $leaveEnd->copy();
            if ($maxDate->gt($endDate)) {
                $maxDate = $endDate->copy();
            }

            // If employee had attendance before leave, count them for ALL days in leave period
            // Even if they don't have attendance during the leave days
            // This applies if leave is within lock period OR if they had attendance before leave
            if ($hasAttendanceBeforeLeave || $isWithinLockPeriod) {
                $countedDates = [];
                while ($currentDate->lte($maxDate)) {
                    $dateStr = $currentDate->format('Y-m-d');
                    if (!isset($leavesByDate[$dateStr])) {
                        $leavesByDate[$dateStr] = [];
                    }

                    // Add employee to the date (avoid duplicates)
                    $employeeName = $leave->employee->employee_name;
                    if (!in_array($employeeName, $leavesByDate[$dateStr])) {
                        $leavesByDate[$dateStr][] = $employeeName;
                        $countedDates[] = $dateStr;
                    }

                    $currentDate->addDay();
                }

                $leaveDebug['included'] = true;
                $leaveDebug['counted_dates'] = $countedDates;
                $leaveDebug['counted_dates_count'] = count($countedDates);
                $debugInfo['processed_leaves'][] = $leaveDebug;
                Log::info('ML/PL Leave included', $leaveDebug);
            } else {
                $leaveDebug['excluded_reason'] = 'No attendance before leave and not within lock period';
                $debugInfo['excluded_leaves'][] = $leaveDebug;
                Log::info('ML/PL Leave excluded: Final check failed', $leaveDebug);
            }
        }

        // DEBUG: Log final results
        Log::info('ML/PL Final Results', [
            'total_leaves_found' => $leaves->count(),
            'processed_leaves_count' => count($debugInfo['processed_leaves']),
            'excluded_leaves_count' => count($debugInfo['excluded_leaves']),
            'leaves_by_date' => array_map(function ($employees) {
                return count($employees);
            }, $leavesByDate),
            'processed_leaves' => $debugInfo['processed_leaves'],
            'excluded_leaves' => $debugInfo['excluded_leaves'],
        ]);

        return response()->json([
            'leaves_by_date' => $leavesByDate,
            'debug' => $debugInfo, // Include debug info in response for frontend debugging
        ]);
    }
}

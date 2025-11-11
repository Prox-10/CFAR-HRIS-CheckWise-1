<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyCheckingAssignment;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
        ]);

        $weekStartDate = $request->week_start_date;
        $preparedBy = $request->prepared_by;
        $checkedBy = $request->checked_by;

        DB::beginTransaction();
        try {
            // Delete existing assignments for this week
            // Check all assignments to determine what to delete
            if (!empty($request->assignments)) {
                $microteamsToDelete = [];

                // Scan all assignments to find what needs to be deleted
                // Add Crew is now saved with microteam, so we delete by microteam
                foreach ($request->assignments as $assignment) {
                    $microteam = $assignment['microteam'] ?? null;
                    if ($microteam && !in_array($microteam, $microteamsToDelete)) {
                        $microteamsToDelete[] = $microteam;
                    }
                }

                // Delete all assignments (regular and Add Crew) for each microteam being saved
                foreach ($microteamsToDelete as $microteam) {
                    DailyCheckingAssignment::where('week_start_date', $weekStartDate)
                        ->where('microteam', $microteam)
                        ->delete();
                }
            }

            // Save new assignments
            foreach ($request->assignments as $assignment) {
                // Find employee by employee_name
                $employee = Employee::where('employee_name', $assignment['employee_name'])->first();

                if (!$employee) {
                    continue; // Skip if employee not found
                }

                // Save assignment for each day
                for ($dayIndex = 0; $dayIndex < 7; $dayIndex++) {
                    $timeData = $assignment['time_data'][$dayIndex] ?? null;

                    DailyCheckingAssignment::create([
                        'week_start_date' => $weekStartDate,
                        'employee_id' => $employee->id,
                        'position_field' => $assignment['position_field'],
                        'slot_index' => $assignment['slot_index'],
                        'microteam' => $assignment['microteam'] ?? null,
                        'is_add_crew' => $assignment['is_add_crew'] ?? false,
                        'day_index' => $dayIndex,
                        'time_in' => $timeData['time_in'] ?? null,
                        'time_out' => $timeData['time_out'] ?? null,
                        'prepared_by' => $preparedBy,
                        'checked_by' => $checkedBy,
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

        // Calculate Monday of the week
        $dayOfWeek = (int)$selectedDate->format('w'); // 0 = Sunday, 1 = Monday, etc.
        $daysToSubtract = $dayOfWeek === 0 ? 6 : $dayOfWeek - 1;
        $weekStartDate = clone $selectedDate;
        $weekStartDate->modify("-{$daysToSubtract} days");
        $weekStartDateStr = $weekStartDate->format('Y-m-d');

        // Get the day index (0-6) for the selected date
        $dayIndex = (int)$selectedDate->format('w');
        $dayIndex = $dayIndex === 0 ? 6 : $dayIndex - 1; // Convert to 0-6 (Monday-Sunday)

        // Get all assignments for this week
        $assignments = DailyCheckingAssignment::with(['employee' => function ($query) {
            $query->withTrashed(); // Include soft-deleted employees
        }])
            ->where('week_start_date', $weekStartDateStr)
            ->where('day_index', $dayIndex)
            ->get();

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
}

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
            DailyCheckingAssignment::where('week_start_date', $weekStartDate)->delete();

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

        // Group employees by microteam (only Regular and Probationary)
        $microteams = [
            'MICROTEAM - 01' => [],
            'MICROTEAM - 02' => [],
            'MICROTEAM - 03' => [],
        ];

        $microteamIndex = 0;
        $microteamKeys = array_keys($microteams);

        foreach ($assignments as $assignment) {
            if (!$assignment->employee) {
                continue;
            }

            // Only include Regular and Probationary employees
            $workStatus = $assignment->employee->work_status;
            if (!in_array($workStatus, ['Regular', 'Probationary'])) {
                continue;
            }

            // Distribute employees across microteams
            $microteamKey = $microteamKeys[$microteamIndex % count($microteamKeys)];
            $microteams[$microteamKey][] = [
                'id' => $assignment->employee->id,
                'employee_name' => $assignment->employee->employee_name,
                'employeeid' => $assignment->employee->employeeid,
                'work_status' => $assignment->employee->work_status,
                'position' => $assignment->position_field,
                'time_in' => $assignment->time_in ? (string)$assignment->time_in : null,
                'time_out' => $assignment->time_out ? (string)$assignment->time_out : null,
            ];

            $microteamIndex++;
        }

        return response()->json([
            'date' => $date,
            'week_start_date' => $weekStartDateStr,
            'day_index' => $dayIndex,
            'microteams' => $microteams,
        ]);
    }
}

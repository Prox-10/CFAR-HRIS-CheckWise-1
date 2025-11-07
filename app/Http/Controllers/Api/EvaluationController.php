<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request; 
use App\Models\Evaluation;
use App\Models\Employee;
use App\Models\EvaluationConfiguration;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class EvaluationController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();

        Log::info('API Evaluation index accessed by user:', [
            'user_id' => $user->id,
            'user_name' => $user->firstname . ' ' . $user->lastname,
            'is_super_admin' => $user->isSuperAdmin(),
            'is_supervisor' => $user->isSupervisor(),
            'can_evaluate' => $user->canEvaluate(),
            'evaluable_departments' => $user->getEvaluableDepartments(),
        ]);

        // Get employees based on user role
        $employees = $this->getEmployeesForUser($user);

        $employeeList = $employees->map(function ($employee) {
            $latestEval = $employee->evaluations()->with(['attendance', 'attitudes', 'workAttitude', 'workFunctions'])->first();
            $frequency = $employee->department 
                ? EvaluationConfiguration::getFrequencyForDepartment($employee->department)
                : 'annual';

            $employeeData = [
                'id' => $employee->id,
                'employee_id' => $employee->id,
                'ratings' => $latestEval && $latestEval->total_rating ? $latestEval->total_rating : null,
                'rating_date' => $latestEval ? $latestEval->rating_date : null,
                'work_quality' => $latestEval && $latestEval->workFunctions ? $latestEval->workFunctions->avg('work_quality') : null,
                'safety_compliance' => $latestEval && $latestEval->workAttitude ? $latestEval->workAttitude->responsible : null,
                'punctuality' => $latestEval && $latestEval->attendance ? $latestEval->attendance->rating : null,
                'teamwork' => $latestEval && $latestEval->workAttitude ? $latestEval->workAttitude->cooperation : null,
                'organization' => $latestEval && $latestEval->workAttitude ? $latestEval->workAttitude->initiative : null,
                'equipment_handling' => $latestEval && $latestEval->workAttitude ? $latestEval->workAttitude->job_knowledge : null,
                'comment' => $latestEval ? $latestEval->observations : null,
                'period' => $latestEval ? $latestEval->evaluation_period : null,
                'period_label' => $latestEval ? $latestEval->period_label : null,
                'employee_name' => $employee->employee_name,
                'picture' => $employee->picture,
                'department' => $employee->department,
                'position' => $employee->position,
                'employeeid' => $employee->employeeid,
                'evaluation_frequency' => $frequency,
            ];

            return $employeeData;
        });

        return response()->json($employeeList);
    }

    /**
     * Get employees based on user role and permissions
     */
    private function getEmployeesForUser($user)
    {
        $query = Employee::with(['evaluations' => function ($q) {
            $q->orderBy('created_at', 'desc');
        }]);

        if ($user->isSuperAdmin()) {
            // Super admin can see all employees
            Log::info('User is Super Admin - showing all employees');
            return $query->orderBy('employee_name')->get();
        } elseif ($user->isSupervisor()) {
            // Supervisor can only see employees in departments they supervise
            $evaluableDepartments = $user->getEvaluableDepartments();
            Log::info('Supervisor evaluable departments:', $evaluableDepartments);

            if (empty($evaluableDepartments)) {
                Log::warning('No departments assigned to supervisor');
                return collect(); // No departments assigned
            }

            $employees = $query->whereIn('department', $evaluableDepartments)
                ->orderBy('employee_name')
                ->get();

            Log::info('Supervisor employees found:', [
                'count' => $employees->count(),
                'departments' => $evaluableDepartments,
                'employees' => $employees->pluck('employee_name', 'department')->toArray()
            ]);

            return $employees;
        } else {
            // Other roles (Manager, HR) can only view, not evaluate
            Log::info('User is other role - showing all employees');
            return $query->orderBy('employee_name')->get();
        }
    }
}

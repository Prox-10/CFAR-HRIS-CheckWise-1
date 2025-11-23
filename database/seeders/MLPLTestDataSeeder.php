<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\Leave;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * MLPLTestDataSeeder
 * 
 * Creates test data for Maternity Leave and Paternity Leave requests.
 * 
 * Usage:
 *   php artisan db:seed --class=MLPLTestDataSeeder
 * 
 * This seeder creates:
 *   - 10 Maternity Leave requests (all approved by Supervisor and HR)
 *   - 5 Paternity Leave requests (all approved by Supervisor and HR)
 * 
 * Requirements:
 *   - Employees from Packing Plant or Coop Area departments
 *   - At least one User with Supervisor or HR role (for approval)
 * 
 * Leave dates are set within the next 14 days for testing the lock period feature.
 */
class MLPLTestDataSeeder extends Seeder
{
  /**
   * Run the database seeds.
   * Creates 10 Maternity Leave and 5 Paternity Leave requests
   * All approved by Supervisor and HR
   */
  public function run(): void
  {
    // Get employees from Packing Plant and Coop Area departments
    $packingPlantEmployees = Employee::where('department', 'Packing Plant')
      ->whereNotIn('work_status', ['Add Crew'])
      ->get();

    $coopAreaEmployees = Employee::where('department', 'Coop Area')
      ->whereNotIn('work_status', ['Add Crew'])
      ->get();

    $eligibleEmployees = $packingPlantEmployees->merge($coopAreaEmployees);

    // If no eligible employees exist, create some
    if ($eligibleEmployees->count() === 0) {
      $this->command->warn('No eligible employees found. Creating 20 test employees...');
      $eligibleEmployees = collect();

      // Create 10 Packing Plant employees
      for ($i = 0; $i < 10; $i++) {
        $eligibleEmployees->push(Employee::factory()->create([
          'department' => 'Packing Plant',
          'work_status' => 'Regular',
        ]));
      }

      // Create 10 Coop Area employees
      for ($i = 0; $i < 10; $i++) {
        $eligibleEmployees->push(Employee::factory()->create([
          'department' => 'Coop Area',
          'work_status' => 'Regular',
        ]));
      }
    }

    // Get a supervisor and HR user for approvals (or create dummy ones)
    $supervisor = User::whereHas('roles', function ($query) {
      $query->where('name', 'Supervisor');
    })->first();

    $hrUser = User::whereHas('roles', function ($query) {
      $query->where('name', 'HR');
    })->first();

    // If no supervisor/HR exists, use first user or create one
    if (!$supervisor) {
      $supervisor = User::first();
    }
    if (!$hrUser) {
      $hrUser = User::first();
    }

    $today = Carbon::today();
    $employees = $eligibleEmployees->shuffle();

    // Create 10 Maternity Leave requests using factory
    $maternityCount = 0;
    foreach ($employees as $employee) {
      if ($maternityCount >= 10) {
        break;
      }

      Leave::factory()
        ->maternityLeave()
        ->approved()
        ->withinDays(14)
        ->create([
          'employee_id' => $employee->id,
        ]);

      $maternityCount++;
    }

    // Create 5 Paternity Leave requests using factory
    $paternityCount = 0;
    foreach ($employees as $employee) {
      if ($paternityCount >= 5) {
        break;
      }

      // Skip if this employee already has a maternity leave
      if (Leave::where('employee_id', $employee->id)
        ->where('leave_type', 'Maternity Leave')
        ->exists()
      ) {
        continue;
      }

      Leave::factory()
        ->paternityLeave()
        ->approved()
        ->withinDays(14)
        ->create([
          'employee_id' => $employee->id,
        ]);

      $paternityCount++;
    }

    $this->command->info("Created {$maternityCount} Maternity Leave requests");
    $this->command->info("Created {$paternityCount} Paternity Leave requests");
  }
}

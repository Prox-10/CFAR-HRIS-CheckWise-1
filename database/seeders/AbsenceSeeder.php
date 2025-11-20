<?php

namespace Database\Seeders;

use App\Models\Absence;
use App\Models\Employee;
use Illuminate\Database\Seeder;

class AbsenceSeeder extends Seeder
{
  /**
   * Run the database seeds.
   */
  public function run(): void
  {
    $employees = Employee::all();

    // If there are no employees, create some
    if ($employees->count() === 0) {
      $employees = Employee::factory()->count(10)->create();
    }

    // Create 8 approved absences
    Absence::factory()
      ->count(8)
      ->approved()
      ->make()
      ->each(function ($absence) use ($employees) {
        $employee = $employees->random();
        $absence->employee_id = $employee->id;
        $absence->full_name = $employee->employee_name;
        $absence->employee_id_number = $employee->employeeid;
        $absence->department = $employee->department;
        $absence->position = $employee->position;
        $absence->save();
      });

    // Create 4 rejected absences
    Absence::factory()
      ->count(4)
      ->rejected()
      ->make()
      ->each(function ($absence) use ($employees) {
        $employee = $employees->random();
        $absence->employee_id = $employee->id;
        $absence->full_name = $employee->employee_name;
        $absence->employee_id_number = $employee->employeeid;
        $absence->department = $employee->department;
        $absence->position = $employee->position;
        $absence->save();
      });

    // Create 6 pending absences
    Absence::factory()
      ->count(6)
      ->pending()
      ->make()
      ->each(function ($absence) use ($employees) {
        $employee = $employees->random();
        $absence->employee_id = $employee->id;
        $absence->full_name = $employee->employee_name;
        $absence->employee_id_number = $employee->employeeid;
        $absence->department = $employee->department;
        $absence->position = $employee->position;
        $absence->save();
      });
  }
}

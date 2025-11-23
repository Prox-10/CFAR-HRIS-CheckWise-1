<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Employee;
use App\Models\User;
use Carbon\Carbon;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Leave>
 */
class LeaveFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $start = $this->faker->dateTimeBetween('-1 year', 'now');
        $end = (clone $start)->modify('+' . rand(1, 10) . ' days');
        $days = $end->diff($start)->days;

        return [
            'employee_id'         => Employee::factory(), // or use an existing employee id
            'leave_type'          => $this->faker->randomElement(['Vacation', 'Sick', 'Maternity Leave', 'Paternity Leave']),
            'leave_start_date'    => $start->format('Y-m-d'),
            'leave_end_date'      => $end->format('Y-m-d'),
            'leave_days'          => $days,
            'leave_status'        => $this->faker->randomElement(['Pending', 'Approved', 'Rejected']),
            'leave_reason'        => $this->faker->sentence(8, true), // English sentence, ~8 words
            'leave_date_reported' => $start->format('Y-m-d'),
            'leave_date_approved' => $this->faker->optional()->date('Y-m-d'),
            'leave_comments'      => $this->faker->optional()->sentence(10, true), // English sentence, ~10 words
        ];
    }

    /**
     * Indicate that the leave is a Maternity Leave
     */
    public function maternityLeave(): static
    {
        return $this->state(fn(array $attributes) => [
            'leave_type' => 'Maternity Leave',
            'leave_reason' => 'Maternity leave for childbirth and recovery',
        ]);
    }

    /**
     * Indicate that the leave is a Paternity Leave
     */
    public function paternityLeave(): static
    {
        return $this->state(fn(array $attributes) => [
            'leave_type' => 'Paternity Leave',
            'leave_reason' => 'Paternity leave to support spouse during childbirth',
        ]);
    }

    /**
     * Indicate that the leave is approved by both Supervisor and HR
     */
    public function approved(): static
    {
        $supervisor = User::whereHas('roles', function ($query) {
            $query->where('name', 'Supervisor');
        })->first() ?? User::first();

        $hrUser = User::whereHas('roles', function ($query) {
            $query->where('name', 'HR');
        })->first() ?? User::first();

        $today = Carbon::today();
        $reportedDate = $today->copy()->subDays(rand(5, 10));
        $approvedDate = $today->copy()->subDays(rand(1, 5));
        $supervisorApprovedAt = $today->copy()->subDays(rand(1, 5));
        $hrApprovedAt = $today->copy()->subDays(rand(1, 3));

        return $this->state(fn(array $attributes) => [
            'leave_status' => 'Approved',
            'leave_date_reported' => $reportedDate->format('Y-m-d'),
            'leave_date_approved' => $approvedDate->format('Y-m-d'),
            'supervisor_status' => 'approved',
            'supervisor_approved_by' => $supervisor?->id,
            'supervisor_approved_at' => $supervisorApprovedAt,
            'supervisor_comments' => 'Supervisor approved',
            'hr_status' => 'approved',
            'hr_approved_by' => $hrUser?->id,
            'hr_approved_at' => $hrApprovedAt,
            'hr_comments' => 'HR approved',
        ]);
    }

    /**
     * Set leave dates within the next N days (for testing lock period)
     */
    public function withinDays(int $days = 14): static
    {
        $today = Carbon::today();
        $startDate = $today->copy()->addDays(rand(1, $days));
        $endDate = $startDate->copy()->addDays(rand(1, 7));
        $leaveDays = $startDate->diffInDays($endDate) + 1;

        return $this->state(fn(array $attributes) => [
            'leave_start_date' => $startDate->format('Y-m-d'),
            'leave_end_date' => $endDate->format('Y-m-d'),
            'leave_days' => $leaveDays,
        ]);
    }
}

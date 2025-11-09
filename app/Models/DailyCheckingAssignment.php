<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DailyCheckingAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'week_start_date',
        'employee_id',
        'position_field',
        'slot_index',
        'day_index',
        'time_in',
        'time_out',
        'prepared_by',
        'checked_by',
    ];

    protected $casts = [
        'week_start_date' => 'date',
        'slot_index' => 'integer',
        'day_index' => 'integer',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}

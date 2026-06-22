<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('routine_completion_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // SQL Server: sin cascada en routine_day_id (routine_days ya enlaza a users).
            $table->foreignId('routine_day_id')->nullable()->constrained('routine_days');
            $table->unsignedTinyInteger('weekday');
            $table->date('completed_on');
            $table->boolean('is_completed')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'completed_on', 'weekday'], 'routine_completion_unique');
            $table->index(['user_id', 'completed_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('routine_completion_logs');
    }
};


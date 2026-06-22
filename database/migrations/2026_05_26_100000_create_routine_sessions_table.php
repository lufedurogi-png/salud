<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('routine_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('session_date');
            $table->unsignedTinyInteger('weekday');
            $table->string('focus', 120)->nullable();
            $table->text('coach_comments')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'session_date']);
        });

        Schema::create('routine_session_exercises', function (Blueprint $table) {
            $table->id();
            $table->foreignId('routine_session_id')->constrained()->cascadeOnDelete();
            $table->string('name', 160);
            $table->string('detail', 120)->nullable();
            $table->string('video_url', 255)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('routine_session_exercises');
        Schema::dropIfExists('routine_sessions');
    }
};

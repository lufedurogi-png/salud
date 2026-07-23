<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('routine_completion_logs', function (Blueprint $table) {
            $table->text('client_comment')->nullable()->after('is_completed');
        });
    }

    public function down(): void
    {
        Schema::table('routine_completion_logs', function (Blueprint $table) {
            $table->dropColumn('client_comment');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('routine_client_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('comment_date');
            $table->unsignedTinyInteger('weekday');
            $table->text('body');
            $table->timestamps();

            $table->index(['user_id', 'comment_date']);
        });

        if (Schema::hasColumn('routine_completion_logs', 'client_comment')) {
            $rows = DB::table('routine_completion_logs')
                ->whereNotNull('client_comment')
                ->where('client_comment', '!=', '')
                ->get(['user_id', 'completed_on', 'weekday', 'client_comment', 'updated_at', 'created_at']);

            foreach ($rows as $row) {
                DB::table('routine_client_comments')->insert([
                    'user_id' => $row->user_id,
                    'comment_date' => $row->completed_on,
                    'weekday' => $row->weekday,
                    'body' => $row->client_comment,
                    'created_at' => $row->updated_at ?? $row->created_at ?? now(),
                    'updated_at' => $row->updated_at ?? $row->created_at ?? now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('routine_client_comments');
    }
};

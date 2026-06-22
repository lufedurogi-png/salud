<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_plan_subscriptions', function (Blueprint $table) {
            $table->string('payment_method', 30)->nullable()->after('paid_days');
            $table->string('payment_reference', 120)->nullable()->after('payment_method');
            $table->string('payment_status', 30)->default('paid')->after('payment_reference');
            $table->json('payment_meta')->nullable()->after('payment_status');
        });
    }

    public function down(): void
    {
        Schema::table('user_plan_subscriptions', function (Blueprint $table) {
            $table->dropColumn(['payment_method', 'payment_reference', 'payment_status', 'payment_meta']);
        });
    }
};


<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('paypal_order_snapshots', function (Blueprint $table) {
            $table->string('paypal_order_id', 80)->primary();
            // SQL Server: una sola ruta de cascada vía subscription (user -> subscriptions -> snapshot).
            $table->foreignId('user_id')->constrained();
            $table->foreignId('subscription_id')->constrained('user_plan_subscriptions')->cascadeOnDelete();
            $table->json('snapshot');
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index(['user_id', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paypal_order_snapshots');
    }
};


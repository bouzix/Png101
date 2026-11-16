<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('ToolUsageLog')) {
            Schema::create('ToolUsageLog', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('toolSlug', 100);
                $table->string('eventType', 20)->default('view');
                $table->integer('filesCount')->default(1);
                $table->unsignedBigInteger('inputBytes')->default(0);
                $table->unsignedBigInteger('outputBytes')->default(0);
                $table->string('deviceType', 32)->nullable();
                $table->dateTime('createdAt')->useCurrent();

                $table->index('toolSlug');
                $table->index('eventType');
                $table->index('createdAt');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ToolUsageLog');
    }
};

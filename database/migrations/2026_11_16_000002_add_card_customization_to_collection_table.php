<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('Collection')) {
            Schema::table('Collection', function (Blueprint $table) {
                if (!Schema::hasColumn('Collection', 'cardBgImagePath')) {
                    $table->string('cardBgImagePath')->nullable()->after('heroTextColor');
                }
                if (!Schema::hasColumn('Collection', 'cardBgColor')) {
                    $table->string('cardBgColor', 32)->nullable()->after('cardBgImagePath');
                }
                if (!Schema::hasColumn('Collection', 'cardTextColor')) {
                    $table->string('cardTextColor', 32)->nullable()->after('cardBgColor');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('Collection')) {
            Schema::table('Collection', function (Blueprint $table) {
                $cols = [];
                foreach (['cardBgImagePath', 'cardBgColor', 'cardTextColor'] as $col) {
                    if (Schema::hasColumn('Collection', $col)) {
                        $cols[] = $col;
                    }
                }
                if (!empty($cols)) {
                    $table->dropColumn($cols);
                }
            });
        }
    }
};

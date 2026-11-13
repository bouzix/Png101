<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('Image')) {
            return;
        }

        Schema::table('Image', function (Blueprint $table) {
            if (!Schema::hasColumn('Image', 'thumbPath')) {
                $table->string('thumbPath')->nullable()->after('previewPath');
            }
            if (!Schema::hasColumn('Image', 'deletedAt')) {
                $table->dateTime('deletedAt')->nullable()->index('Image_deletedAt_idx');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('Image')) {
            return;
        }

        Schema::table('Image', function (Blueprint $table) {
            if (Schema::hasColumn('Image', 'deletedAt')) {
                $table->dropIndex('Image_deletedAt_idx');
                $table->dropColumn('deletedAt');
            }
            if (Schema::hasColumn('Image', 'thumbPath')) {
                $table->dropColumn('thumbPath');
            }
        });
    }
};


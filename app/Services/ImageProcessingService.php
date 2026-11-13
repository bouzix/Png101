<?php

namespace App\Services;

class ImageProcessingService
{
    /**
     * Extract dimensions [width, height] from an image file.
     */
    public static function getDimensions(string $filepath): array
    {
        $info = @getimagesize($filepath);
        if ($info && isset($info[0], $info[1])) {
            return [(int) $info[0], (int) $info[1]];
        }
        return [800, 600];
    }

    /**
     * Generate a flattened checkerboard JPG preview using PHP GD.
     */
    public static function generateCheckerboardPreview(string $sourcePath, string $destPath, int $width, int $height): bool
    {
        if (!function_exists('imagecreatetruecolor')) {
            return false;
        }

        $raw = @file_get_contents($sourcePath);
        if ($raw === false) {
            return false;
        }

        $src = @imagecreatefromstring($raw);
        if (!$src) {
            return false;
        }

        $w = max(1, $width);
        $h = max(1, $height);

        $canvas = imagecreatetruecolor($w, $h);
        $white = imagecolorallocate($canvas, 255, 255, 255);
        $grey = imagecolorallocate($canvas, 229, 229, 229);

        imagefill($canvas, 0, 0, $white);

        $squareSize = 10;
        for ($y = 0; $y < $h; $y += $squareSize) {
            $rowEven = (($y / $squareSize) % 2) === 0;
            for ($x = 0; $x < $w; $x += $squareSize) {
                $colEven = (($x / $squareSize) % 2) === 0;
                if ($rowEven !== $colEven) {
                    imagefilledrectangle(
                        $canvas,
                        $x,
                        $y,
                        min($x + $squareSize - 1, $w - 1),
                        min($y + $squareSize - 1, $h - 1),
                        $grey
                    );
                }
            }
        }

        imagealphablending($canvas, true);
        imagecopy($canvas, $src, 0, 0, 0, 0, imagesx($src), imagesy($src));

        $ok = imagejpeg($canvas, $destPath, 80);
        imagedestroy($src);
        imagedestroy($canvas);

        return (bool) $ok;
    }

    /**
     * Calculate ITU-R BT.709 perceived luminance of visible pixels.
     * Returns ['luminance' => 'dark'|'light'|'balanced', 'score' => int]
     */
    public static function calculateLuminance(string $sourcePath): array
    {
        if (!function_exists('imagecreatefromstring') || !file_exists($sourcePath)) {
            return ['luminance' => 'balanced', 'score' => 128];
        }

        $raw = @file_get_contents($sourcePath);
        if ($raw === false) {
            return ['luminance' => 'balanced', 'score' => 128];
        }

        $src = @imagecreatefromstring($raw);
        if (!$src) {
            return ['luminance' => 'balanced', 'score' => 128];
        }

        $srcW = imagesx($src);
        $srcH = imagesy($src);
        $scale = min(100 / max(1, $srcW), 100 / max(1, $srcH), 1);
        $sampleW = max(1, (int) round($srcW * $scale));
        $sampleH = max(1, (int) round($srcH * $scale));

        $sample = imagecreatetruecolor($sampleW, $sampleH);
        imagealphablending($sample, false);
        imagesavealpha($sample, true);
        $transparent = imagecolorallocatealpha($sample, 0, 0, 0, 127);
        imagefill($sample, 0, 0, $transparent);
        imagecopyresampled($sample, $src, 0, 0, 0, 0, $sampleW, $sampleH, $srcW, $srcH);

        $totalLuminance = 0.0;
        $visibleCount = 0;

        for ($y = 0; $y < $sampleH; $y++) {
            for ($x = 0; $x < $sampleW; $x++) {
                $rgba = imagecolorat($sample, $x, $y);
                // GD alpha: 0 = opaque, 127 = fully transparent
                $gdAlpha = ($rgba & 0x7F000000) >> 24;
                $opacity = 255 - (int) round(($gdAlpha / 127) * 255);
                if ($opacity > 25) {
                    $r = ($rgba >> 16) & 0xFF;
                    $g = ($rgba >> 8) & 0xFF;
                    $b = $rgba & 0xFF;
                    $lum = 0.2126 * $r + 0.7152 * $g + 0.0722 * $b;
                    $totalLuminance += $lum;
                    $visibleCount++;
                }
            }
        }

        imagedestroy($src);
        imagedestroy($sample);

        if ($visibleCount === 0) {
            return ['luminance' => 'balanced', 'score' => 128];
        }

        $avgScore = (int) round($totalLuminance / $visibleCount);
        $luminance = 'balanced';
        if ($avgScore < 55) {
            $luminance = 'dark';
        } elseif ($avgScore > 195) {
            $luminance = 'light';
        }

        return ['luminance' => $luminance, 'score' => $avgScore];
    }

    /**
     * Generate a lightweight transparent PNG thumbnail (max bounding box $maxSize px) for catalog grids.
     * Returns false cleanly when the source image is already compact so no duplicate file is stored.
     */
    public static function generateThumbnail(string $sourcePath, string $destPath, int $maxSize = 450): bool
    {
        if (!function_exists('imagecreatefromstring') || !is_file($sourcePath)) {
            return false;
        }

        try {
            $raw = @file_get_contents($sourcePath);
            if ($raw === false) {
                return false;
            }

            $src = @imagecreatefromstring($raw);
            unset($raw);
            if (!$src) {
                return false;
            }

            $origW = imagesx($src);
            $origH = imagesy($src);
            if ($origW <= 0 || $origH <= 0) {
                imagedestroy($src);
                return false;
            }

            $fileSize = @filesize($sourcePath) ?: 0;
            if ($origW <= $maxSize && $origH <= $maxSize && $fileSize > 0 && $fileSize <= 40 * 1024) {
                imagedestroy($src);
                return false;
            }

            $scale = min($maxSize / $origW, $maxSize / $origH, 1.0);
            $targetW = max(1, (int) round($origW * $scale));
            $targetH = max(1, (int) round($origH * $scale));

            $thumb = imagecreatetruecolor($targetW, $targetH);
            if (!$thumb) {
                imagedestroy($src);
                return false;
            }

            imagealphablending($thumb, false);
            imagesavealpha($thumb, true);
            $transparent = imagecolorallocatealpha($thumb, 0, 0, 0, 127);
            imagefilledrectangle($thumb, 0, 0, $targetW, $targetH, $transparent);

            imagecopyresampled($thumb, $src, 0, 0, 0, 0, $targetW, $targetH, $origW, $origH);
            $saved = @imagepng($thumb, $destPath, 7);

            imagedestroy($src);
            imagedestroy($thumb);

            if ($saved && is_file($destPath) && $fileSize > 0 && (@filesize($destPath) ?: 0) >= $fileSize) {
                @unlink($destPath);
                return false;
            }

            return (bool) $saved;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Convert a PHP ini shorthand size value (e.g. "8M", "2048K") into bytes.
     */
    public static function parseIniBytes(string|false $value): int
    {
        if ($value === false) {
            return 0;
        }
        $trimmed = trim($value);
        if ($trimmed === '' || $trimmed === '-1') {
            return 0;
        }

        $unit = strtolower(substr($trimmed, -1));
        $number = (float) $trimmed;

        return match ($unit) {
            'g' => (int) round($number * 1024 * 1024 * 1024),
            'm' => (int) round($number * 1024 * 1024),
            'k' => (int) round($number * 1024),
            default => (int) round($number),
        };
    }

    /**
     * Expose effective PHP upload size limits for client-side pre-flight checks.
     */
    public static function getUploadLimits(): array
    {
        $uploadMaxBytes = self::parseIniBytes(ini_get('upload_max_filesize'));
        $postMaxBytes = self::parseIniBytes(ini_get('post_max_size'));

        $positive = array_values(array_filter([$uploadMaxBytes, $postMaxBytes], fn ($b) => $b > 0));
        $effectiveMaxBytes = empty($positive) ? 0 : min($positive);

        $effectiveMaxLabel = $effectiveMaxBytes > 0
            ? ($effectiveMaxBytes >= 1024 * 1024
                ? number_format($effectiveMaxBytes / (1024 * 1024), 1) . ' MB'
                : number_format($effectiveMaxBytes / 1024, 0) . ' KB')
            : null;

        return [
            'uploadMaxBytes' => $uploadMaxBytes,
            'postMaxBytes' => $postMaxBytes,
            'effectiveMaxBytes' => $effectiveMaxBytes,
            'effectiveMaxLabel' => $effectiveMaxLabel,
        ];
    }
}


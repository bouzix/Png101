<?php

namespace App\Services;

use App\Models\CodeInjection;

class CodeInjectionService
{
    public const DEFAULT_ID = 'default';

    public static function get(): array
    {
        try {
            $record = CodeInjection::find(self::DEFAULT_ID);
            if ($record) {
                return [
                    'id' => self::DEFAULT_ID,
                    'headCode' => $record->headCode ?? '',
                    'bodyCode' => $record->bodyCode ?? '',
                    'footerCode' => $record->footerCode ?? '',
                    'updatedAt' => $record->updatedAt?->toISOString(),
                ];
            }
        } catch (\Throwable $e) {
            // Ignore if DB not ready
        }

        return [
            'id' => self::DEFAULT_ID,
            'headCode' => '',
            'bodyCode' => '',
            'footerCode' => '',
        ];
    }

    public static function save(array $data): array
    {
        $record = CodeInjection::updateOrCreate(
            ['id' => self::DEFAULT_ID],
            [
                'headCode' => $data['headCode'] ?? '',
                'bodyCode' => $data['bodyCode'] ?? '',
                'footerCode' => $data['footerCode'] ?? '',
            ]
        );

        return [
            'id' => self::DEFAULT_ID,
            'headCode' => $record->headCode ?? '',
            'bodyCode' => $record->bodyCode ?? '',
            'footerCode' => $record->footerCode ?? '',
            'updatedAt' => $record->updatedAt?->toISOString(),
        ];
    }
}


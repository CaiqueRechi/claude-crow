<?php

final class DownloadController
{
    private const STORAGE = __DIR__ . '/../../storage/public';

    public function download(): string
    {
        $baseDirectory = realpath(self::STORAGE);
        $requestedPath = realpath($baseDirectory . DIRECTORY_SEPARATOR . (string) ($_GET['file'] ?? ''));

        if ($requestedPath === false || !str_starts_with($requestedPath, $baseDirectory . DIRECTORY_SEPARATOR)) {
            http_response_code(404);

            return '';
        }

        return file_get_contents($requestedPath);
    }
}

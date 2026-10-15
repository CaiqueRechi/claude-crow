<?php

// Intentionally vulnerable test fixture: user-supplied path joined to the storage directory.
final class DownloadController
{
    private const STORAGE = __DIR__ . '/../../storage/public/';

    public function download(): string
    {
        return file_get_contents(self::STORAGE . $_GET['file']);
    }
}

<?php

// Intentionally vulnerable test fixture: archive entries written using their own paths.
final class ImportArchive
{
    public function extract(string $uploadedZip, string $destination): void
    {
        $archive = new ZipArchive();
        $archive->open($uploadedZip);

        for ($index = 0; $index < $archive->numFiles; $index++) {
            $entryName = $archive->getNameIndex($index);
            file_put_contents($destination . '/' . $entryName, $archive->getFromIndex($index));
        }

        $archive->close();
    }
}

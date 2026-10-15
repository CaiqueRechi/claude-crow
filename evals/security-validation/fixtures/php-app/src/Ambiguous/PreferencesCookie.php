<?php

// Test fixture: native unserialize on a cookie, with no gadget class in this project.
final class PreferencesCookie
{
    public function read(): array
    {
        $preferences = unserialize($_COOKIE['preferences'] ?? 'a:0:{}');

        return is_array($preferences) ? $preferences : [];
    }
}

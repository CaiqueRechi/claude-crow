<?php

final class PingController
{
    public function ping(): string
    {
        $host = (string) ($_GET['host'] ?? '');
        if (filter_var($host, FILTER_VALIDATE_IP) === false) {
            http_response_code(422);

            return '';
        }

        // An array command runs the binary directly, without a shell in between.
        $process = proc_open(['ping', '-c', '1', $host], [1 => ['pipe', 'w']], $pipes);
        $output = stream_get_contents($pipes[1]);
        proc_close($process);

        return (string) $output;
    }
}

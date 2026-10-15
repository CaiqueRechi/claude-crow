<?php

// Intentionally vulnerable test fixture: a request value reaches a shell command.
final class NetworkDiagnostics
{
    /** @param array<string, string> $query the request's query string */
    public function __construct(private array $query)
    {
    }

    public function reachability(): string
    {
        return $this->runDiagnostic('ping -c 1 ' . $this->query['host']);
    }

    private function runDiagnostic(string $commandLine): string
    {
        return (string) shell_exec($commandLine);
    }
}

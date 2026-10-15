<?php

// Intentionally vulnerable test fixture: SQL built by concatenation.
final class UserSearch
{
    public function __construct(private PDO $connection)
    {
    }

    public function byEmail(): array
    {
        $email = $_GET['email'];
        $statement = $this->connection->query("SELECT id, name FROM users WHERE email = '" . $email . "'");

        return $statement->fetchAll();
    }
}

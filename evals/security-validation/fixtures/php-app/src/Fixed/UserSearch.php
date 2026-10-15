<?php

final class UserSearch
{
    public function __construct(private PDO $connection)
    {
    }

    public function byEmail(): array
    {
        $statement = $this->connection->prepare('SELECT id, name FROM users WHERE email = :email');
        $statement->execute(['email' => (string) ($_GET['email'] ?? '')]);

        return $statement->fetchAll();
    }
}

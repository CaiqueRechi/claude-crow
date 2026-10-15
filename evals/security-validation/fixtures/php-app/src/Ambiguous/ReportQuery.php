<?php

// Test fixture: dynamic SQL whose only variable part is a constant; the value is bound.
final class ReportQuery
{
    private const TABLE = 'monthly_sales';

    public function __construct(private PDO $connection)
    {
    }

    public function forMonth(): array
    {
        $statement = $this->connection->prepare('SELECT total FROM ' . self::TABLE . ' WHERE month = :month');
        $statement->execute(['month' => (string) ($_GET['month'] ?? '')]);

        return $statement->fetchAll();
    }
}

<?php

// Test fixture: SQL produced by a vendor package that is not in this repository.
final class LegacyFilter
{
    public function __construct(private PDO $connection)
    {
    }

    public function apply(\Vendor\Criteria\Builder $criteria): array
    {
        $criteria->where('status', $_GET['status']);

        return $this->connection->query($criteria->toSql())->fetchAll();
    }
}

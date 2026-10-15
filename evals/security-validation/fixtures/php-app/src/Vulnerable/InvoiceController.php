<?php

// Intentionally vulnerable test fixture: invoice fetched by id with no owner check.
final class InvoiceController
{
    public function __construct(private PDO $connection, private int $authenticatedCustomerId)
    {
    }

    public function show(): array
    {
        $statement = $this->connection->prepare('SELECT * FROM invoices WHERE id = :id');
        $statement->execute(['id' => (int) $_GET['id']]);

        return $statement->fetch() ?: [];
    }
}

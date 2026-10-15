<?php

final class InvoiceController
{
    public function __construct(private PDO $connection, private int $authenticatedCustomerId)
    {
    }

    public function show(): array
    {
        $statement = $this->connection->prepare('SELECT * FROM invoices WHERE id = :id AND customer_id = :customerId');
        $statement->execute(['id' => (int) $_GET['id'], 'customerId' => $this->authenticatedCustomerId]);

        $invoice = $statement->fetch();
        if ($invoice === false) {
            http_response_code(404);

            return [];
        }

        return $invoice;
    }
}

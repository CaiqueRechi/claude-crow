<h1>Olá, <?= htmlspecialchars((string) ($_GET['name'] ?? ''), ENT_QUOTES, 'UTF-8') ?></h1>

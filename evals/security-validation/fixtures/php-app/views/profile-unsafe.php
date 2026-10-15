<?php // Intentionally vulnerable test fixture: request value echoed raw into HTML. ?>
<h1>Olá, <?= $_GET['name'] ?></h1>

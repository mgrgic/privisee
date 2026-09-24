<?php

require dirname(__DIR__) . '/vendor/autoload.php';

use PrivIsee\Database;

$pdo = Database::connection();
$stmt = $pdo->prepare('DELETE FROM shares WHERE expires_at < (NOW() - INTERVAL 1 MONTH)');
$stmt->execute();

echo date(DATE_ATOM) . " housekeeping: deleted {$stmt->rowCount()} expired share(s)\n";

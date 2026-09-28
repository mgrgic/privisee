<?php

require dirname(__DIR__) . '/src/autoload.php';

use PrivIsee\Database;
use PrivIsee\Support\Env;

Env::load(dirname(__DIR__) . '/.env');

$pdo = Database::connection();
$stmt = $pdo->prepare('DELETE FROM shares WHERE expires_at < (NOW() - INTERVAL 1 MONTH)');
$stmt->execute();

echo date(DATE_ATOM) . " housekeeping: deleted {$stmt->rowCount()} expired share(s)\n";

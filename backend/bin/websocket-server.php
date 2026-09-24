<?php

require dirname(__DIR__) . '/vendor/autoload.php';

use PrivIsee\WebSocket\LocationServer;
use Ratchet\Http\HttpServer;
use Ratchet\Server\IoServer;
use Ratchet\WebSocket\WsServer;

$port = (int) (getenv('WS_PORT') ?: 8081);

$server = IoServer::factory(
    new HttpServer(new WsServer(new LocationServer())),
    $port,
    '0.0.0.0'
);

echo "privIsee WebSocket server listening on 0.0.0.0:{$port}\n";
$server->run();

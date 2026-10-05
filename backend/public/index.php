<?php

require dirname(__DIR__) . '/src/autoload.php';

use PrivIsee\Controllers\SharesController;
use PrivIsee\Http\Request;
use PrivIsee\Http\Response;
use PrivIsee\Router;
use PrivIsee\Support\Env;

Env::load(dirname(__DIR__) . '/.env');

header('Access-Control-Allow-Origin: ' . (getenv('CORS_ORIGIN') ?: '*'));
header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    return;
}

$request = Request::fromGlobals();
$router = new Router();
$shares = new SharesController();

$router->add('POST', '/api/shares', [$shares, 'create']);
$router->add('GET', '/api/shares/:id', [$shares, 'show']);
$router->add('PATCH', '/api/shares/:id/location', [$shares, 'updateLocation']);
$router->add('PATCH', '/api/shares/:id/stop', [$shares, 'stop']);

try {
    $router->dispatch($request);
} catch (\Throwable $e) {
    error_log($e->getMessage());
    Response::error('Internal server error', 500);
}

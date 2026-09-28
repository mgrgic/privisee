<?php

// Hand-rolled PSR-4 autoloader for the PrivIsee\ namespace. The backend has no
// third-party dependencies, so there's nothing for Composer to install — this
// avoids requiring Composer on the deployment target at all.
spl_autoload_register(function (string $class): void {
    $prefix = 'PrivIsee\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $path = __DIR__ . '/' . str_replace('\\', '/', $relative) . '.php';

    if (is_file($path)) {
        require $path;
    }
});

<?php

namespace PrivIsee;

use PrivIsee\Http\Request;
use PrivIsee\Http\Response;

final class Router
{
    /** @var array<int, array{method: string, pattern: string, handler: callable}> */
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler): void
    {
        $this->routes[] = ['method' => $method, 'pattern' => $pattern, 'handler' => $handler];
    }

    public function dispatch(Request $request): void
    {
        foreach ($this->routes as $route) {
            if ($route['method'] !== $request->method) {
                continue;
            }

            $params = $this->match($route['pattern'], $request->path);
            if ($params !== null) {
                ($route['handler'])($request, $params);
                return;
            }
        }

        Response::error('Not found', 404);
    }

    /** @return array<string, string>|null */
    private function match(string $pattern, string $path): ?array
    {
        $patternParts = array_values(array_filter(explode('/', $pattern), fn ($p) => $p !== ''));
        $pathParts = array_values(array_filter(explode('/', $path), fn ($p) => $p !== ''));

        if (count($patternParts) !== count($pathParts)) {
            return null;
        }

        $params = [];
        foreach ($patternParts as $i => $part) {
            if (str_starts_with($part, ':')) {
                $params[substr($part, 1)] = $pathParts[$i];
                continue;
            }
            if ($part !== $pathParts[$i]) {
                return null;
            }
        }

        return $params;
    }
}

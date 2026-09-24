<?php

namespace PrivIsee\Http;

final class Request
{
    public string $method;
    public string $path;
    /** @var array<string, mixed> */
    public array $body;

    public function __construct(string $method, string $path, array $body)
    {
        $this->method = $method;
        $this->path = $path;
        $this->body = $body;
    }

    public static function fromGlobals(): self
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

        $raw = file_get_contents('php://input') ?: '';
        $body = [];
        if ($raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $body = $decoded;
            }
        }

        return new self($method, $path, $body);
    }
}

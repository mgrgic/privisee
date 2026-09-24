<?php

namespace PrivIsee\Support;

final class Tokens
{
    /** URL-safe random token, e.g. for share ids. */
    public static function random(int $bytes = 16): string
    {
        return rtrim(strtr(base64_encode(random_bytes($bytes)), '+/', '-_'), '=');
    }

    /** Longer random secret used as the owner capability token. */
    public static function ownerSecret(): string
    {
        return self::random(32);
    }
}

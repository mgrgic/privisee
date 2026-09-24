<?php

namespace PrivIsee\Controllers;

use PrivIsee\Database;
use PrivIsee\Http\Request;
use PrivIsee\Http\Response;
use PrivIsee\Support\Tokens;

final class SharesController
{
    private const MIN_DURATION_MINUTES = 1;
    private const MAX_DURATION_MINUTES = 60 * 24 * 7; // 7 days

    public function create(Request $request): void
    {
        $duration = (int) ($request->body['durationMinutes'] ?? 0);
        $userId = (string) ($request->body['userId'] ?? '');

        if ($duration < self::MIN_DURATION_MINUTES || $duration > self::MAX_DURATION_MINUTES) {
            Response::error('durationMinutes must be between ' . self::MIN_DURATION_MINUTES . ' and ' . self::MAX_DURATION_MINUTES);
            return;
        }

        if (!preg_match('/^[0-9a-fA-F-]{8,36}$/', $userId)) {
            Response::error('userId is required');
            return;
        }

        $id = Tokens::random(16);
        $ownerToken = Tokens::ownerSecret();
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $expiresAt = $now->modify("+{$duration} minutes");

        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'INSERT INTO shares (id, owner_token, user_id, created_at, expires_at, active)
             VALUES (:id, :owner_token, :user_id, :created_at, :expires_at, 1)'
        );
        $stmt->execute([
            'id' => $id,
            'owner_token' => $ownerToken,
            'user_id' => $userId,
            'created_at' => $now->format('Y-m-d H:i:s'),
            'expires_at' => $expiresAt->format('Y-m-d H:i:s'),
        ]);

        Response::json([
            'shareId' => $id,
            'ownerToken' => $ownerToken,
            'expiresAt' => $expiresAt->format(DATE_ATOM),
        ], 201);
    }

    public function show(Request $request, array $params): void
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT * FROM shares WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $params['id']]);
        $share = $stmt->fetch();

        if (!$share) {
            Response::error('Share not found', 404);
            return;
        }

        $expired = strtotime($share['expires_at'] . ' UTC') < time();

        Response::json([
            'shareId' => $share['id'],
            'payload' => $share['enc_location'],
            'iv' => $share['iv'],
            'updatedAt' => $share['updated_at'],
            'expiresAt' => gmdate(DATE_ATOM, strtotime($share['expires_at'] . ' UTC')),
            'active' => (bool) $share['active'] && !$expired,
        ]);
    }

    public function stop(Request $request, array $params): void
    {
        $ownerToken = (string) ($request->body['ownerToken'] ?? '');

        $pdo = Database::connection();
        $stmt = $pdo->prepare('UPDATE shares SET active = 0 WHERE id = :id AND owner_token = :owner_token');
        $stmt->execute(['id' => $params['id'], 'owner_token' => $ownerToken]);

        if ($stmt->rowCount() === 0) {
            Response::error('Not found or invalid owner token', 404);
            return;
        }

        Response::json(['ok' => true]);
    }
}

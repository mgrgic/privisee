<?php

namespace PrivIsee\WebSocket;

use PrivIsee\Database;
use Ratchet\ConnectionInterface;
use Ratchet\MessageComponentInterface;
use SplObjectStorage;

final class LocationServer implements MessageComponentInterface
{
    /** @var SplObjectStorage<ConnectionInterface, array{shareId: ?string}> */
    private SplObjectStorage $clients;

    /** @var array<string, SplObjectStorage<ConnectionInterface, null>> shareId => subscribers */
    private array $subscribers = [];

    public function __construct()
    {
        $this->clients = new SplObjectStorage();
    }

    public function onOpen(ConnectionInterface $conn): void
    {
        $this->clients->attach($conn, ['shareId' => null]);
    }

    public function onMessage(ConnectionInterface $from, $msg): void
    {
        $data = json_decode($msg, true);
        if (!is_array($data) || !isset($data['type'])) {
            return;
        }

        match ($data['type']) {
            'subscribe' => $this->handleSubscribe($from, $data),
            'publish' => $this->handlePublish($from, $data),
            default => null,
        };
    }

    public function onClose(ConnectionInterface $conn): void
    {
        $meta = $this->clients[$conn] ?? null;
        if ($meta && $meta['shareId'] !== null && isset($this->subscribers[$meta['shareId']])) {
            $this->subscribers[$meta['shareId']]->detach($conn);
        }
        $this->clients->detach($conn);
    }

    public function onError(ConnectionInterface $conn, \Exception $e): void
    {
        error_log('WebSocket error: ' . $e->getMessage());
        $conn->close();
    }

    private function handleSubscribe(ConnectionInterface $conn, array $data): void
    {
        $shareId = (string) ($data['shareId'] ?? '');
        if ($shareId === '') {
            return;
        }

        $this->clients[$conn] = ['shareId' => $shareId];

        if (!isset($this->subscribers[$shareId])) {
            $this->subscribers[$shareId] = new SplObjectStorage();
        }
        $this->subscribers[$shareId]->attach($conn);
    }

    private function handlePublish(ConnectionInterface $conn, array $data): void
    {
        $shareId = (string) ($data['shareId'] ?? '');
        $ownerToken = (string) ($data['ownerToken'] ?? '');
        $payload = (string) ($data['payload'] ?? '');
        $iv = (string) ($data['iv'] ?? '');

        if ($shareId === '' || $ownerToken === '' || $payload === '' || $iv === '') {
            return;
        }

        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'UPDATE shares
             SET enc_location = :payload, iv = :iv, updated_at = :updated_at
             WHERE id = :id AND owner_token = :owner_token AND active = 1 AND expires_at > :now'
        );
        $now = gmdate('Y-m-d H:i:s');
        $stmt->execute([
            'payload' => $payload,
            'iv' => $iv,
            'updated_at' => $now,
            'id' => $shareId,
            'owner_token' => $ownerToken,
            'now' => $now,
        ]);

        if ($stmt->rowCount() === 0) {
            return; // unknown share, wrong owner token, inactive, or expired
        }

        $this->broadcast($shareId, [
            'type' => 'update',
            'shareId' => $shareId,
            'payload' => $payload,
            'iv' => $iv,
            'timestamp' => $now,
        ]);
    }

    private function broadcast(string $shareId, array $payload): void
    {
        if (!isset($this->subscribers[$shareId])) {
            return;
        }

        $json = json_encode($payload);
        foreach ($this->subscribers[$shareId] as $client) {
            $client->send($json);
        }
    }
}

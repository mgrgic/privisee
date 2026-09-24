CREATE TABLE IF NOT EXISTS shares (
    id           CHAR(22)     NOT NULL PRIMARY KEY,
    owner_token  CHAR(43)     NOT NULL,
    user_id      CHAR(36)     NOT NULL,
    -- AES-GCM ciphertext of a single JSON {lat, lon} payload (base64), plus its IV (base64).
    -- Encrypting lat/lon together avoids ever reusing an IV with the same key.
    enc_location TEXT         NULL,
    iv           VARCHAR(32)  NULL,
    created_at   DATETIME     NOT NULL,
    expires_at   DATETIME     NOT NULL,
    updated_at   DATETIME     NULL,
    active       TINYINT(1)   NOT NULL DEFAULT 1,
    KEY idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

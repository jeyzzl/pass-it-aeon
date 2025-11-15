CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL UNIQUE,
    device_hash TEXT,
    ip_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Creamos un índice para buscar rápido por wallet_address
CREATE UNIQUE INDEX idx_users_wallet_address ON users(wallet_address);

CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    hmac_signature TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Creamos un índice para buscar rápido por token
CREATE UNIQUE INDEX idx_qr_codes_token ON qr_codes(token);

-- Primero, definimos tipos ENUM para status y blockchain
-- Esto asegura que solo se puedan usar valores válidos
CREATE TYPE claim_status AS ENUM ('pending', 'success', 'failed');
CREATE TYPE blockchain_type AS ENUM ('solana', 'ethereum', 'base', 'bnb', 'sui');

CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id),
    status claim_status NOT NULL DEFAULT 'pending',
    blockchain blockchain_type NOT NULL,
    tx_hash TEXT,
    error_message TEXT,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Creamos índices para las búsquedas más comunes
CREATE INDEX idx_claims_user_id ON claims(user_id);
CREATE INDEX idx_claims_status ON claims(status);

-- Una restricción para asegurar que un usuario solo pueda reclamar
-- un código específico una sola vez.
CREATE UNIQUE INDEX idx_user_code_unique ON claims(user_id, qr_code_id);
-- 1. TABLA DE CONFIGURACIÓN (Para tu Consola Admin)
-- Guardaremos pares clave-valor para controlar el juego en vivo.
CREATE TABLE game_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertamos los valores por defecto (Initial Seed)
INSERT INTO game_settings (key, value) VALUES 
('faucet_amount_eth', '0.0001'),        -- Cuánto paga el faucet
('faucet_amount_sol', '0.01'),
('child_codes_per_claim', '3'),         -- Cuántos códigos nuevos se le dan al usuario
('code_expiration_hours', '24'),        -- Tiempo de vida de los códigos
('points_per_referral', '100'),         -- Puntos directos
('points_per_grandchild', '50');        -- Puntos por los referidos de tus referidos

-- 2. ACTUALIZAR USUARIOS (Para Leaderboard y Auth Social)
ALTER TABLE users 
ADD COLUMN points INT DEFAULT 0,
ADD COLUMN email TEXT, -- Para cuando integremos Google Auth
ADD COLUMN external_auth_id TEXT; -- ID de Privy/Dynamic

CREATE INDEX idx_users_points ON users(points DESC); -- Para el Leaderboard rápido

-- 3. ACTUALIZAR QR CODES (Para saber cuál es el código "Padre")
-- Ya teníamos 'generated_by', pero aseguramos que el link sea claro.
-- (Sin cambios necesarios si ya corriste la 0002, pero revisamos mentalmente)
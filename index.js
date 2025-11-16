// 1. Cargar variables de entorno
require('dotenv').config();

// 2. Importar dependencias
const express = require('express');
const db = require('./db'); // Nuestro pool de base de datos
const { validateToken } = require('./utils/tokenService'); // Nuestro validador

// 3. Inicializar la app
const app = express();
const PORT = process.env.PORT || 3000;

// 4. Middlewares
app.use(express.json()); // <-- ¡MUY IMPORTANTE! Para leer JSON del body

// =======================================================
// TAREA 3: Endpoint 1 - /c/:token (Preflight)
// =======================================================
app.get('/c/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Paso 1: Validar el HMAC del token (Tarea 2)
    const { isValid, payload } = validateToken(token);
    if (!isValid) {
      return res.status(400).json({ valid: false, error: 'Token inválido o malformado.' });
    }

    // Paso 2: El token es legítimo, ¿pero sigue activo en nuestra BD?
    const { rows } = await db.query(
      'SELECT is_active FROM qr_codes WHERE token = $1',
      [payload]
    );

    if (rows.length === 0) {
      // Nota: ¡Esto significa que generaste un token pero NUNCA lo guardaste en la BD!
      return res.status(404).json({ valid: false, error: 'Token no encontrado.' });
    }

    if (!rows[0].is_active) {
      return res.status(410).json({ valid: false, error: 'Este token ya fue reclamado.' });
    }

    // ¡Éxito! El token es válido y está activo.
    res.json({ valid: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ valid: false, error: 'Error interno del servidor' });
  }
});

// =======================================================
// TAREA 3: Endpoint 2 - /api/claim (Reclamación)
// =======================================================
app.post('/api/claim', async (req, res) => {
  // TODO: Implementar CAPTCHA y Rate Limits aquí

  const { token, walletAddress, blockchain } = req.body;

  // Validación básica de entrada
  if (!token || !walletAddress || !blockchain) {
    return res.status(400).json({ success: false, error: 'Faltan token, walletAddress o blockchain.' });
  }

  // ----- INICIO DE TRANSACCIÓN -----
  // Usamos un "cliente" del pool para poder hacer rollback si algo falla
  const client = await db.getClient();

  try {
    // Paso 1: Validar el HMAC del token (de nuevo, por seguridad)
    const { isValid, payload } = validateToken(token);
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Token inválido.' });
    }
    
    // Iniciar la transacción
    await client.query('BEGIN');

    // Paso 2: Obtener el qr_code, bloquear la fila para que nadie más la reclame
    // 'FOR UPDATE' es crucial para prevenir que dos personas reclamen al mismo tiempo
    const qrResult = await client.query(
      'SELECT id, is_active FROM qr_codes WHERE token = $1 FOR UPDATE',
      [payload]
    );

    if (qrResult.rows.length === 0) {
      throw new Error('Token no encontrado.');
    }

    const qrCode = qrResult.rows[0];
    if (!qrCode.is_active) {
      throw new Error('Este token ya fue reclamado.');
    }

    // Paso 3: Encontrar o crear al usuario (Tarea 5 - Límite por billetera)
    let userResult = await client.query('SELECT id FROM users WHERE wallet_address = $1', [walletAddress]);
    let userId;

    if (userResult.rows.length === 0) {
      // Usuario nuevo, lo creamos
      const newUser = await client.query(
        'INSERT INTO users (wallet_address) VALUES ($1) RETURNING id',
        [walletAddress]
      );
      userId = newUser.rows[0].id;
    } else {
      // Usuario existente
      userId = userResult.rows[0].id;
      // TODO: Verificar si este usuario ya ha reclamado antes (Tarea 5)
      // Por ahora, el sistema lo previene con "is_active = false"
    }

    // Paso 4: Crear el registro de la reclamación (¡Éxito!)
    // Esto pondrá el 'status' en 'pending' por defecto
    await client.query(
      'INSERT INTO claims (user_id, qr_code_id, blockchain) VALUES ($1, $2, $3)',
      [userId, qrCode.id, blockchain] // 'blockchain' viene del req.body
    );

    // Paso 5: Desactivar el token QR para que no se use de nuevo
    await client.query(
      'UPDATE qr_codes SET is_active = false WHERE id = $1',
      [qrCode.id]
    );

    // Paso 6: Si todo salió bien, confirmar la transacción
    await client.query('COMMIT');
    
    res.status(201).json({ success: true, message: '¡Reclamación encolada! El Faucet la procesará pronto.' });

  } catch (err) {
    // ----- ERROR: REVERTIR TRANSACCIÓN -----
    await client.query('ROLLBACK');
    console.error('Error en /api/claim:', err.message);
    res.status(400).json({ success: false, error: err.message || 'Error al procesar la reclamación.' });
  
  } finally {
    // Siempre liberar el cliente de vuelta al pool
    client.release();
  }
});


// 5. Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor de pass-it-aeon corriendo en http://localhost:${PORT}`);
});
const db = require('../db');

// Caché simple en memoria para no saturar la DB 
let settingsCache = {};
let lastFetch = 0;

async function getSetting(key, defaultValue) {
  // Si pasaron menos de 10 segundos, usa caché
  const now = Date.now();
  if (now - lastFetch < 10000 && settingsCache[key]) {
    return settingsCache[key];
  }

  try {
    const { rows } = await db.query('SELECT value FROM game_settings WHERE key = $1', [key]);
    if (rows.length > 0) {
      // Actualizamos caché global (en un app real, usar Redis)
      settingsCache[key] = rows[0].value; 
      lastFetch = now;
      return rows[0].value;
    }
  } catch (err) {
    console.error(`Error leyendo setting ${key}:`, err.message);
  }
  return defaultValue;
}

module.exports = { getSetting };
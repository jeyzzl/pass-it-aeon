// db.js
const { Pool } = require('pg');

// pg buscará automáticamente las variables de entorno 
// PGHOST, PGUSER, PGDATABASE, PGPASSWORD, PGPORT
// Asegúrate de añadirlas a tu archivo .env
const pool = new Pool();

module.exports = {
  query: (text, params) => pool.query(text, params),
  // Lo usaremos para las transacciones
  getClient: () => pool.connect(), 
};
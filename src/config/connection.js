const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'meu_campeonato',
    password: 'ADMIN',
    port: 5432,
});

module.exports = pool;

pool.connect()
  .then(() => console.log('Conectado ao PostgreSQL'))
  .catch(err => console.error('Erro conexão DB:', err));
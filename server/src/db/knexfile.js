


const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });


function parseDbUrl(url) {
  if (!url) return null;
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || '5432', 10),
    database: u.pathname.replace(/^\//, ''),
    user: u.username,
    password: decodeURIComponent(u.password), 
    ssl: { rejectUnauthorized: false },
  };
}

const connectionParams = parseDbUrl(process.env.DATABASE_URL);


const config = {
  development: {
    client: 'pg',
    ...(connectionParams ? { connection: connectionParams } : {}),
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      tableName: 'knex_migrations',
    },
    pool: { min: 2, max: 10 },
  },

  production: {
    client: 'pg',
    ...(connectionParams ? { connection: connectionParams } : {}),
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      tableName: 'knex_migrations',
    },
    pool: { min: 2, max: 10 },
  },
};

module.exports = config;

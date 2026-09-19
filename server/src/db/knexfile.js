


require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });


function parseDbUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || '5432', 10),
    database: u.pathname.replace(/^\
    user: u.username,
    password: decodeURIComponent(u.password), 
    ssl: { rejectUnauthorized: false },
  };
}

const connectionParams = parseDbUrl(process.env.DATABASE_URL);


const config = {
  development: {
    client: 'pg',
    connection: connectionParams,
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
    pool: { min: 2, max: 10 },
  },

  production: {
    client: 'pg',
    connection: connectionParams,
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
    pool: { min: 2, max: 10 },
  },
};

module.exports = config;

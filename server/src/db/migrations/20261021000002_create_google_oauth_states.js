exports.up = async function (knex) {
  await knex.schema.createTable('google_oauth_states', (table) => {
    table.text('nonce').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  // Only the backend database role may manage these one-time OAuth nonces.
  await knex.raw('ALTER TABLE ?? ENABLE ROW LEVEL SECURITY', ['google_oauth_states']);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('google_oauth_states');
};

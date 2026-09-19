

exports.up = async function (knex) {
  await knex.schema.createTable('cli_sessions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('session_token').notNullable().unique();
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.text('status').notNullable().defaultTo('pending'); 
    t.text('auth_token');  
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('claimed_at', { useTz: true });
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('cli_sessions');
};

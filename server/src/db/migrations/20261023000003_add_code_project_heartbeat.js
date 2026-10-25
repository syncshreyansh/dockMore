exports.up = async function (knex) {
  await knex.schema.alterTable('code_projects', (table) => table.timestamp('last_heartbeat_at', { useTz: true }));
};

exports.down = async function (knex) {
  await knex.schema.alterTable('code_projects', (table) => table.dropColumn('last_heartbeat_at'));
};

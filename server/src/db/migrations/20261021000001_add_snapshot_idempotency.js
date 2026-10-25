exports.up = async function (knex) {
  await knex.schema.alterTable('snapshots', (table) => {
    table.text('snapshot_key');
    table.unique(['project_id', 'snapshot_key']);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('snapshots', (table) => {
    table.dropUnique(['project_id', 'snapshot_key']);
    table.dropColumn('snapshot_key');
  });
};

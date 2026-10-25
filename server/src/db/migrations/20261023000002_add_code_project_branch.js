exports.up = async function (knex) {
  await knex.schema.alterTable('code_projects', (table) => table.text('branch'));
};

exports.down = async function (knex) {
  await knex.schema.alterTable('code_projects', (table) => table.dropColumn('branch'));
};

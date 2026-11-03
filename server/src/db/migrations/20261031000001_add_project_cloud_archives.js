exports.up = async function up(knex) {
  await knex.schema.alterTable('code_projects', (table) => {
    table.text('cloud_folder_id');
    table.text('source_archive_file_id');
    table.timestamp('source_archive_updated_at', { useTz: true });
    table.bigInteger('source_archive_size_bytes');
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('code_projects', (table) => {
    table.dropColumn('source_archive_size_bytes');
    table.dropColumn('source_archive_updated_at');
    table.dropColumn('source_archive_file_id');
    table.dropColumn('cloud_folder_id');
  });
};



exports.up = async function (knex) {
  
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('email').notNullable().unique();
    t.string('name').notNullable();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  
  await knex.schema.createTable('cloud_accounts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('provider').notNullable();                 
    t.string('account_email').notNullable();
    t.text('access_token_enc');                       
    t.text('refresh_token_enc');
    t.timestamp('expires_at', { useTz: true });
    t.specificType('scopes', 'text[]');               
    t.text('status').notNullable().defaultTo('active');
    t.timestamp('last_synced_at', { useTz: true });
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  
  await knex.schema.createTable('files_cache', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('cloud_account_id')
      .notNullable()
      .references('id')
      .inTable('cloud_accounts')
      .onDelete('CASCADE');
    t.text('provider_file_id').notNullable();         
    t.text('name').notNullable();
    t.text('path');
    t.bigInteger('size_bytes');
    t.text('mime_type');
    t.timestamp('modified_at', { useTz: true });
    t.timestamp('synced_at', { useTz: true }).defaultTo(knex.fn.now());

    
    t.unique(['cloud_account_id', 'provider_file_id']);
  });

  
  await knex.schema.createTable('transfers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('source_account_id')
      .notNullable()
      .references('id')
      .inTable('cloud_accounts')
      .onDelete('CASCADE');
    t.uuid('dest_account_id')
      .notNullable()
      .references('id')
      .inTable('cloud_accounts')
      .onDelete('CASCADE');
    t.text('file_name').notNullable();
    t.bigInteger('size_bytes');
    t.text('status').notNullable().defaultTo('in_progress');  
    t.integer('progress').notNullable().defaultTo(0);          
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('completed_at', { useTz: true });
  });

  
  await knex.schema.createTable('code_projects', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('name').notNullable();
    t.text('local_path');
    t.uuid('backup_account_id').references('id').inTable('cloud_accounts').onDelete('SET NULL');
    t.integer('snapshot_interval_minutes').notNullable().defaultTo(15);
    t.text('watch_status').notNullable().defaultTo('paused'); 
    t.timestamp('last_snapshot_at', { useTz: true });
    t.text('last_commit_message');
    t.timestamp('last_commit_at', { useTz: true });
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  
  await knex.schema.createTable('snapshots', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id')
      .notNullable()
      .references('id')
      .inTable('code_projects')
      .onDelete('CASCADE');
    t.integer('files_changed_count').notNullable().defaultTo(0);
    t.timestamp('taken_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  
  await knex.schema.createTable('chain_verifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id')
      .notNullable()
      .references('id')
      .inTable('code_projects')
      .onDelete('CASCADE');
    t.text('content_hash').notNullable();   
    t.text('tx_hash');                       
    t.timestamp('block_timestamp', { useTz: true });
    t.text('explorer_url');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  
  await knex.schema.dropTableIfExists('chain_verifications');
  await knex.schema.dropTableIfExists('snapshots');
  await knex.schema.dropTableIfExists('code_projects');
  await knex.schema.dropTableIfExists('transfers');
  await knex.schema.dropTableIfExists('files_cache');
  await knex.schema.dropTableIfExists('cloud_accounts');
  await knex.schema.dropTableIfExists('users');
};

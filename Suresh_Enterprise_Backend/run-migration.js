const sequelize = require('./config/db');
const migration = require('./migrations/add-user-id-to-invoices');

async function runMigration() {
  try {
    console.log('Starting migration...');
    
    await sequelize.authenticate();
    console.log('✓ Database connection established');
    
    await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
    
    console.log('✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

const { syncDatabase, sequelize } = require('./models');

async function test() {
  await syncDatabase();
  const [results] = await sequelize.query("PRAGMA table_info('appointments');");
  const hasBloodGroup = results.some(col => col.name === 'blood_group');
  console.log("Has blood_group column:", hasBloodGroup);
  process.exit(0);
}

test();

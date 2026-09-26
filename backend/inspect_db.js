const { sequelize } = require('./models');

async function inspect() {
  const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table';");
  for (const t of tables) {
    if (t.name === 'sqlite_sequence') continue;
    const [count] = await sequelize.query(`SELECT COUNT(*) as c FROM ${t.name}`);
    console.log(`Table: ${t.name.padEnd(25)} | Rows: ${count[0].c}`);
  }
  process.exit(0);
}

inspect();

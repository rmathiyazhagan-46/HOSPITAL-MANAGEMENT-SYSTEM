const { Sequelize } = require('sequelize');
require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dialect = 'mysql';

let sequelize;

if (dialect === 'sqlite') {
  const storagePath = process.env.DB_STORAGE
    ? path.resolve(__dirname, '..', process.env.DB_STORAGE)
    : path.resolve(__dirname, '../database.sqlite');

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'hospital_management_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: process.env.DB_LOGGING === 'true' ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true,
      },
    }
  );
}

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(`[Database] Connection successfully established (${dialect.toUpperCase()}).`);
  } catch (error) {
    console.error('[Database] Unable to connect to the database:', error.message);
  }
};

module.exports = {
  sequelize,
  testConnection,
};

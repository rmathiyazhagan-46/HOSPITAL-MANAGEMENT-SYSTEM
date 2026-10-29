const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});
const dialect = (process.env.DB_DIALECT || 'mysql').toLowerCase();
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
} else if (dialect === 'postgres' || dialect === 'mysql') {
  const options = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect,
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 10000,
      idle: 5000,
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  };
  if (dialect === 'postgres') {
    options.dialectModule = require('pg');
    options.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
      connectionTimeoutMillis: 10000,
    };
  } else {
    options.dialectOptions = {
      connectTimeout: 30000,
    };
  }
  sequelize = new Sequelize(
    process.env.DB_NAME || 'hospital_management_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    options
  );
} else {
  throw new Error(`Unsupported database dialect: ${dialect}`);
}
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(
      `[Database] Connection successfully established (${dialect.toUpperCase()}).`
    );
    if (dialect !== 'sqlite') {
      console.log(`[Database] Host: ${process.env.DB_HOST}`);
      console.log(`[Database] Port: ${process.env.DB_PORT}`);
      console.log(`[Database] Database: ${process.env.DB_NAME}`);
    }
  } catch (error) {
    console.error(
      '[Database] Unable to connect to the database:',
      error.message
    );
    throw error;
  }
};
module.exports = {
  sequelize,
  testConnection,
};
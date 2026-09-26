const { sequelize } = require('./models');

async function clearData() {
  try {
    console.log('[ClearData] Starting targeted data deletion...');

    // Delete in dependency order
    await sequelize.query('DELETE FROM payments;');
    console.log(' - Cleared payments');
    
    await sequelize.query('DELETE FROM invoices;');
    console.log(' - Cleared invoices');
    
    await sequelize.query('DELETE FROM prescription_items;');
    console.log(' - Cleared prescription_items');
    
    await sequelize.query('DELETE FROM prescriptions;');
    console.log(' - Cleared prescriptions');
    
    await sequelize.query('DELETE FROM consultations;');
    console.log(' - Cleared consultations');
    
    await sequelize.query('DELETE FROM appointments;');
    console.log(' - Cleared appointments');
    
    await sequelize.query('DELETE FROM doctor_availabilities;');
    console.log(' - Cleared doctor_availabilities');
    
    await sequelize.query('DELETE FROM medicine_stocks;');
    console.log(' - Cleared medicine_stocks');
    
    await sequelize.query('DELETE FROM notifications;');
    console.log(' - Cleared notifications');

    // Delete main records
    await sequelize.query('DELETE FROM doctors;');
    console.log(' - Cleared doctors');
    
    await sequelize.query('DELETE FROM patients;');
    console.log(' - Cleared patients');
    
    await sequelize.query('DELETE FROM medicines;');
    console.log(' - Cleared medicines');

    console.log('[ClearData] Target data successfully cleared without breaking schema constraints.');
  } catch (error) {
    console.error('[ClearData] Error during deletion:', error);
  } finally {
    process.exit(0);
  }
}

clearData();

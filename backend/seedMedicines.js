const { sequelize, Medicine, MedicineStock, PrescriptionItem } = require('./models');

const medicineSeedData = [
  { name: 'Azithromycin 500mg', category: 'General', unit_price: 12.00, description: 'Azithromycin 500mg', batch_number: 'B-01', quantity: 250, manufacture_date: '2026-01-10', expiry_date: '2028-01-10', reorder_level: 50 },
  { name: 'Amoxicillin 250mg', category: 'General', unit_price: 8.00, description: 'Amoxicillin 250mg', batch_number: 'B-02', quantity: 180, manufacture_date: '2026-01-15', expiry_date: '2028-01-15', reorder_level: 50 },
  { name: 'Amlodipine 5mg', category: 'General', unit_price: 3.00, description: 'Amlodipine 5mg', batch_number: 'B-03', quantity: 195, manufacture_date: '2026-01-20', expiry_date: '2028-01-20', reorder_level: 50 },
  { name: 'Cetirizine 10mg', category: 'General', unit_price: 4.00, description: 'Cetirizine 10mg', batch_number: 'B-04', quantity: 300, manufacture_date: '2026-01-25', expiry_date: '2028-01-25', reorder_level: 50 },
  { name: 'Omeprazole 20mg', category: 'General', unit_price: 5.00, description: 'Omeprazole 20mg', batch_number: 'B-05', quantity: 350, manufacture_date: '2026-02-01', expiry_date: '2028-02-01', reorder_level: 50 },
  { name: 'Ibuprofen 400mg', category: 'General', unit_price: 6.00, description: 'Ibuprofen 400mg', batch_number: 'B-06', quantity: 140, manufacture_date: '2026-02-05', expiry_date: '2028-02-05', reorder_level: 50 },
  { name: 'Metformin 500mg', category: 'General', unit_price: 4.50, description: 'Metformin 500mg', batch_number: 'B-07', quantity: 220, manufacture_date: '2026-02-10', expiry_date: '2028-02-10', reorder_level: 50 },
  { name: 'Vitamin D3 60K IU', category: 'General', unit_price: 8.00, description: 'Vitamin D3 60K IU', batch_number: 'B-08', quantity: 160, manufacture_date: '2026-02-15', expiry_date: '2028-02-15', reorder_level: 50 },
  { name: 'Paracetamol 500mg', category: 'General', unit_price: 3.00, description: 'Paracetamol 500mg', batch_number: 'B-09', quantity: 280, manufacture_date: '2026-02-20', expiry_date: '2028-02-20', reorder_level: 50 },
  { name: 'Pantoprazole 40mg', category: 'General', unit_price: 6.00, description: 'Pantoprazole 40mg', batch_number: 'B-10', quantity: 175, manufacture_date: '2026-02-25', expiry_date: '2028-02-25', reorder_level: 50 },
  { name: 'Levocetirizine 5mg', category: 'General', unit_price: 4.00, description: 'Levocetirizine 5mg', batch_number: 'B-11', quantity: 125, manufacture_date: '2026-03-01', expiry_date: '2028-03-01', reorder_level: 50 },
  { name: 'Montelukast 10mg', category: 'General', unit_price: 7.00, description: 'Montelukast 10mg', batch_number: 'B-12', quantity: 90, manufacture_date: '2026-03-05', expiry_date: '2028-03-05', reorder_level: 50 },
  { name: 'Diclofenac 50mg', category: 'General', unit_price: 5.00, description: 'Diclofenac 50mg', batch_number: 'B-13', quantity: 135, manufacture_date: '2026-03-10', expiry_date: '2028-03-10', reorder_level: 50 },
  { name: 'Ondansetron 4mg', category: 'General', unit_price: 4.00, description: 'Ondansetron 4mg', batch_number: 'B-14', quantity: 110, manufacture_date: '2026-03-15', expiry_date: '2028-03-15', reorder_level: 50 },
  { name: 'Domperidone 10mg', category: 'General', unit_price: 3.50, description: 'Domperidone 10mg', batch_number: 'B-15', quantity: 145, manufacture_date: '2026-03-20', expiry_date: '2028-03-20', reorder_level: 50 },
  { name: 'Calcium 500mg', category: 'General', unit_price: 6.00, description: 'Calcium 500mg', batch_number: 'B-16', quantity: 240, manufacture_date: '2026-03-25', expiry_date: '2028-03-25', reorder_level: 50 },
  { name: 'Folic Acid 5mg', category: 'General', unit_price: 2.50, description: 'Folic Acid 5mg', batch_number: 'B-17', quantity: 190, manufacture_date: '2026-04-01', expiry_date: '2028-04-01', reorder_level: 50 },
  { name: 'Cetirizine 5mg', category: 'General', unit_price: 3.00, description: 'Cetirizine 5mg', batch_number: 'B-18', quantity: 210, manufacture_date: '2026-04-05', expiry_date: '2028-04-05', reorder_level: 50 },
  { name: 'Amoxicillin 500mg', category: 'General', unit_price: 10.00, description: 'Amoxicillin 500mg', batch_number: 'B-19', quantity: 75, manufacture_date: '2026-04-10', expiry_date: '2028-04-10', reorder_level: 50 },
  { name: 'Paracetamol 650mg', category: 'General', unit_price: 4.00, description: 'Paracetamol 650mg', batch_number: 'B-20', quantity: 25, manufacture_date: '2026-04-15', expiry_date: '2028-04-15', reorder_level: 50 },
];

async function seedMedicines() {
  const transaction = await sequelize.transaction();
  try {
    console.log('🔄 Cleaning up existing medicine stock and catalog items...');

    // 1. Create the primary replacement medicine (Paracetamol 500mg)
    const [paracetamol] = await Medicine.findOrCreate({
      where: { name: medicineSeedData[0].name },
      defaults: {
        category: medicineSeedData[0].category,
        unit_price: medicineSeedData[0].unit_price,
        description: medicineSeedData[0].description,
      },
      transaction,
    });

    // 2. Re-point any existing prescription items to Paracetamol so foreign key RESTRICT doesn't fail
    const updatedPrescriptionItems = await PrescriptionItem.update(
      { medicine_id: paracetamol.id },
      { where: {}, transaction }
    );
    console.log(`ℹ️ Updated ${updatedPrescriptionItems[0]} existing prescription item(s) to reference '${paracetamol.name}'.`);

    // 3. Remove all existing stock batches
    await MedicineStock.destroy({ where: {}, transaction });
    console.log('✅ Removed previous medicine stock batches.');

    // 4. Delete all other medicines except the ones in our new seed list
    const seedNames = medicineSeedData.map(m => m.name);
    const { Op } = require('sequelize');
    await Medicine.destroy({
      where: {
        name: {
          [Op.notIn]: seedNames,
        },
      },
      transaction,
    });
    console.log('✅ Removed non-standard and test medicines.');

    // 5. Seed all 12 medicines and stock batches
    console.log(`📦 Seeding ${medicineSeedData.length} new standard medicines with stock batches...`);
    for (let i = 0; i < medicineSeedData.length; i++) {
      const item = medicineSeedData[i];
      let med = await Medicine.findOne({ where: { name: item.name }, transaction });
      if (!med) {
        med = await Medicine.create(
          {
            name: item.name,
            category: item.category,
            unit_price: item.unit_price,
            description: item.description,
          },
          { transaction }
        );
      } else {
        await med.update(
          {
            category: item.category,
            unit_price: item.unit_price,
            description: item.description,
          },
          { transaction }
        );
      }

      await MedicineStock.create(
        {
          medicine_id: med.id,
          batch_number: item.batch_number,
          quantity: item.quantity,
          manufacture_date: item.manufacture_date,
          expiry_date: item.expiry_date,
          reorder_level: item.reorder_level,
        },
        { transaction }
      );
      console.log(`   ${i + 1}. [${item.category}] ${item.name} | Batch: ${item.batch_number} | Qty: ${item.quantity} | Exp: ${item.expiry_date} | Price: ₹${item.unit_price}`);
    }

    await transaction.commit();
    console.log('\n🎉 Successfully seeded all 12 medicines into Pharmacy Inventory!');

    // Verification summary
    const totalMeds = await Medicine.count();
    const totalStocks = await MedicineStock.count();
    console.log(`📊 Current DB State: ${totalMeds} Medicines, ${totalStocks} MedicineStock records.`);
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Failed to seed medicines:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  seedMedicines().then(() => process.exit(0));
}

module.exports = { seedMedicines, medicineSeedData };

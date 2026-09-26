const { Medicine, MedicineStock } = require('../models');

// Browse medicines
// ADMIN: returns all fields (name, category, unit_price, description, stock)
// DOCTOR: returns name, category, description for prescribing
// PATIENT: returns ONLY name, category, description, and availability_status ('In Stock' / 'Out of Stock')
// NO unit_price, batch_number, or quantity visible to patients!
const getMedicines = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const where = {};
    if (category) where.category = category;

    const userRole = req.user?.role || 'patient';

    // Include stock to compute availability
    const medicines = await Medicine.findAll({
      where,
      include: [{ model: MedicineStock, as: 'stocks', attributes: ['id', 'quantity', 'expiry_date'] }],
      order: [['name', 'ASC']],
    });

    let filtered = medicines;
    if (search) {
      const q = search.toLowerCase();
      filtered = medicines.filter(m => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
    }

    const now = new Date();

    // Role-based field masking
    const sanitized = filtered.map(med => {
      // Calculate valid non-expired available stock
      const validBatches = (med.stocks || []).filter(s => {
        if (!s.expiry_date) return true;
        const exp = new Date(s.expiry_date + 'T23:59:59.999Z');
        return exp >= now;
      });
      const availableStock = validBatches.reduce((sum, s) => sum + (s.quantity || 0), 0);
      const totalStock = (med.stocks || []).reduce((sum, s) => sum + (s.quantity || 0), 0);
      const isAvailable = availableStock > 0;

      if (userRole === 'patient') {
        return {
          id: med.id,
          name: med.name,
          category: med.category,
          description: med.description,
          availability_status: isAvailable ? 'Available in Dispensary' : 'Temporarily Out of Stock',
        };
      }

      if (userRole === 'doctor') {
        return {
          id: med.id,
          name: med.name,
          category: med.category,
          unit_price: Number(med.unit_price) || 0,
          description: med.description,
          available_stock: availableStock,
          availability_status: isAvailable ? 'In Stock' : 'Out of Stock',
        };
      }

      // Admin gets full data
      return {
        id: med.id,
        name: med.name,
        category: med.category,
        unit_price: med.unit_price,
        description: med.description,
        total_quantity: totalStock,
        available_stock: availableStock,
        stocks: med.stocks,
      };
    });

    return res.status(200).json({ success: true, data: sanitized });
  } catch (error) {
    next(error);
  }
};

// Admin only: Full pharmacy inventory with batch numbers, quantities, expiry dates, and reorder levels
const getInventoryStock = async (req, res, next) => {
  try {
    const stock = await MedicineStock.findAll({
      include: [
        {
          model: Medicine,
          as: 'medicine',
          attributes: ['id', 'name', 'category', 'unit_price', 'description'],
        },
      ],
      order: [['expiry_date', 'ASC']],
    });

    return res.status(200).json({ success: true, data: stock });
  } catch (error) {
    next(error);
  }
};

// Admin: Add new medicine catalog entry & optional batch
const createMedicine = async (req, res, next) => {
  try {
    const { name, category, unit_price, description, batch_number, quantity, manufacture_date, expiry_date, reorder_level } = req.body;

    const existing = await Medicine.findOne({ where: { name: String(name).trim() } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Medicine with this name already exists in catalog.' });
    }

    const medicine = await Medicine.create({
      name: String(name).trim(),
      category: category || 'General',
      unit_price: unit_price || 0.00,
      description,
    });

    // Auto-generate batch number if empty or not provided
    const cleanMedPrefix = String(name).trim().replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'MED';
    const effectiveBatchNumber = (batch_number && String(batch_number).trim() !== '')
      ? String(batch_number).trim()
      : `BATCH-${cleanMedPrefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (quantity !== undefined && expiry_date) {
      await MedicineStock.create({
        medicine_id: medicine.id,
        batch_number: effectiveBatchNumber,
        quantity: parseInt(quantity, 10),
        manufacture_date: manufacture_date || null,
        expiry_date,
        reorder_level: reorder_level ? parseInt(reorder_level, 10) : 10,
      });
    }

    return res.status(201).json({ success: true, message: 'Medicine added to pharmacy catalog.', data: medicine });
  } catch (error) {
    next(error);
  }
};

// Admin: Update medicine catalog details
const updateMedicine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const medicine = await Medicine.findByPk(id);

    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    const { name, category, unit_price, description } = req.body;
    await medicine.update({
      name: name !== undefined ? String(name).trim() : medicine.name,
      category: category !== undefined ? category : medicine.category,
      unit_price: unit_price !== undefined ? unit_price : medicine.unit_price,
      description: description !== undefined ? description : medicine.description,
    });

    return res.status(200).json({ success: true, message: 'Medicine updated successfully.', data: medicine });
  } catch (error) {
    next(error);
  }
};

// Admin: Delete medicine
const deleteMedicine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const medicine = await Medicine.findByPk(id);

    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    await medicine.destroy();
    return res.status(200).json({ success: true, message: 'Medicine deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// Admin: Add or update stock batch
const addOrUpdateStock = async (req, res, next) => {
  try {
    const { medicine_id, batch_number, quantity, manufacture_date, expiry_date, reorder_level } = req.body;

    let stockItem = await MedicineStock.findOne({
      where: { medicine_id, batch_number: String(batch_number).trim() },
    });

    if (stockItem) {
      await stockItem.update({
        quantity: parseInt(quantity, 10),
        manufacture_date: manufacture_date !== undefined ? (manufacture_date || null) : stockItem.manufacture_date,
        expiry_date: expiry_date || stockItem.expiry_date,
        reorder_level: reorder_level !== undefined ? parseInt(reorder_level, 10) : stockItem.reorder_level,
      });
    } else {
      stockItem = await MedicineStock.create({
        medicine_id,
        batch_number: String(batch_number).trim(),
        quantity: parseInt(quantity, 10),
        manufacture_date: manufacture_date || null,
        expiry_date,
        reorder_level: reorder_level ? parseInt(reorder_level, 10) : 10,
      });
    }

    return res.status(200).json({ success: true, message: 'Stock batch updated successfully.', data: stockItem });
  } catch (error) {
    next(error);
  }
};

// Admin: Delete stock batch
const deleteStockBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const stock = await MedicineStock.findByPk(id);

    if (!stock) {
      return res.status(404).json({ success: false, message: 'Stock batch not found.' });
    }

    await stock.destroy();
    return res.status(200).json({ success: true, message: 'Stock batch removed.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMedicines,
  getInventoryStock,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  addOrUpdateStock,
  deleteStockBatch,
};

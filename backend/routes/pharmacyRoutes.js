const express = require('express');
const router = express.Router();
const {
  getMedicines,
  getInventoryStock,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  addOrUpdateStock,
  deleteStockBatch,
} = require('../controllers/pharmacyController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Public / Authenticated catalog (Role-masked: Patient sees name/category/availability only; Doctor sees prescribing details; Admin sees all)
router.get('/medicines', verifyToken, authorizeRoles('admin', 'doctor', 'patient'), getMedicines);

// Admin-only Pharmacy Inventory Management & Full CRUD
router.get('/inventory', verifyToken, authorizeRoles('admin'), getInventoryStock);
router.post('/medicines', verifyToken, authorizeRoles('admin'), createMedicine);
router.put('/medicines/:id', verifyToken, authorizeRoles('admin'), updateMedicine);
router.delete('/medicines/:id', verifyToken, authorizeRoles('admin'), deleteMedicine);
router.post('/stock', verifyToken, authorizeRoles('admin'), addOrUpdateStock);
router.delete('/stock/:id', verifyToken, authorizeRoles('admin'), deleteStockBatch);

module.exports = router;

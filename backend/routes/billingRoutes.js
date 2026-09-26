const express = require('express');
const router = express.Router();
const {
  processPayment,
  downloadInvoicePdf,
  getAllInvoices,
  getRevenueOverview,
  getInvoiceUpiQr,
  getInvoiceStatus,
  handleWebhook,
  createOrder,
  markInvoicePaid,
  confirmPayment,
  rejectPayment,
} = require('../controllers/billingController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Admin only: Hospital-wide revenue intelligence and invoice audit ledger
router.get('/revenue', verifyToken, authorizeRoles('admin'), getRevenueOverview);
router.get('/invoices', verifyToken, authorizeRoles('admin'), getAllInvoices);

// Patient (own) or Admin: Generate Dynamic UPI QR with exact amount & note
router.get('/invoice/:id/upi-qr', verifyToken, authorizeRoles('patient', 'admin'), getInvoiceUpiQr);

// Patient (own) or Admin: Check invoice payment status in real-time
router.get('/invoice/:id/status', verifyToken, authorizeRoles('patient', 'admin'), getInvoiceStatus);

// Patient: Mark invoice as paid (Pending Verification)
router.post('/invoice/:id/mark-paid', verifyToken, authorizeRoles('patient', 'admin'), markInvoicePaid);

// Admin: Get all invoices pending verification
router.get('/pending-verification', verifyToken, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const { Invoice, Patient } = require('../models');
    const invoices = await Invoice.findAll({
      where: { status: 'pending_verification' },
      include: [{ model: Patient, as: 'patient' }],
      order: [['updatedAt', 'ASC']]
    });
    res.json({ success: true, data: invoices });
  } catch (err) { next(err); }
});

// Admin: Confirm or Reject Payment
router.post('/invoice/:id/confirm-payment', verifyToken, authorizeRoles('admin'), confirmPayment);
router.post('/invoice/:id/reject-payment', verifyToken, authorizeRoles('admin'), rejectPayment);

// Patient or Admin: Direct payment (fallback)
router.post('/pay', verifyToken, authorizeRoles('patient', 'admin'), processPayment);

// Create Razorpay Order
router.post('/create-order', verifyToken, authorizeRoles('patient', 'admin'), createOrder);

// Payment Gateway Webhook endpoints (Public/Unauthenticated for Gateway)
router.post('/webhook', handleWebhook);

// Patient (own) or Admin: Download PDF invoice
router.get('/invoice/:id/pdf', verifyToken, authorizeRoles('patient', 'admin'), downloadInvoicePdf);

module.exports = router;

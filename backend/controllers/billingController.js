const QRCode = require('qrcode');
const { jsPDF } = require('jspdf');
const { Op } = require('sequelize');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { sendSms } = require('../utils/smsService');
const { 
  Invoice, 
  Payment, 
  Patient, 
  Appointment, 
  Doctor, 
  Department, 
  Consultation,
  Prescription, 
  PrescriptionItem, 
  Medicine,
  Notification,
  sequelize,
} = require('../models');

// Process payment for an invoice (Patient or Admin)
const processPayment = async (req, res, next) => {
  try {
    const { invoice_id, amount_paid, payment_mode } = req.body;

    const invoice = await Invoice.findByPk(invoice_id, {
      include: [{ model: Patient, as: 'patient' }],
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    // If patient is paying, verify it belongs to them
    if (req.user.role === 'patient' && invoice.patient_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You cannot pay for another patient invoice.' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Invoice has already been paid in full.' });
    }

    const payment = await Payment.create({
      invoice_id,
      amount_paid: amount_paid || invoice.amount,
      payment_mode: payment_mode || 'upi',
      paid_at: new Date(),
    });

    await invoice.update({ status: 'paid' });

    return res.status(201).json({
      success: true,
      message: 'Payment processed successfully.',
      data: {
        payment,
        invoiceStatus: 'paid',
      },
    });
  } catch (error) {
    next(error);
  }
};

// Generate Invoice PDF
const downloadInvoicePdf = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findByPk(id, {
      include: [
        { model: Patient, as: 'patient' },
        { model: Payment, as: 'payments' },
        {
          model: Prescription,
          as: 'prescription',
          include: [
            {
              model: PrescriptionItem,
              as: 'items',
              include: [{ model: Medicine, as: 'medicine' }],
            },
          ],
        },
      ],
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    // Role security check: Patient can ONLY download their own invoice
    if (req.user.role === 'patient' && invoice.patient_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You do not have permission to access this invoice.' });
    }

    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175); // Royal Blue
    doc.text('METRO GENERAL APEX HOSPITAL', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Healthcare & Medical Excellence Services | GSTIN: 29AAAAA0000A1Z5', 105, 28, { align: 'center' });
    doc.text('Helpline: +91 98765 43210 | info@hospital.org', 105, 34, { align: 'center' });

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 40, 196, 40);

    // Invoice details
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text(`TAX INVOICE #${invoice.id.toString().padStart(6, '0')}`, 14, 50);

    doc.setFontSize(10);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 14, 58);
    doc.text(`Type: ${invoice.invoice_type.toUpperCase()}`, 14, 64);
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 14, 70);

    // Patient details
    doc.text(`Patient Name: ${invoice.patient ? invoice.patient.name : 'N/A'}`, 120, 58);
    doc.text(`Patient ID: ${invoice.patient ? invoice.patient.patient_id : 'N/A'}`, 120, 64);
    doc.text(`Phone: ${invoice.patient ? invoice.patient.phone : 'N/A'}`, 120, 70);

    doc.line(14, 78, 196, 78);

    // Line items header
    doc.setFillColor(243, 244, 246);
    doc.rect(14, 84, 182, 8, 'F');
    doc.setTextColor(55, 65, 81);
    doc.text('Description', 20, 90);
    doc.text('Amount (INR)', 160, 90);

    let currentY = 104;

    // Check if pharmacy invoice with itemized breakdown
    const items = invoice.prescription?.items;
    if (invoice.invoice_type === 'pharmacy' && items && items.length > 0) {
      items.forEach((item) => {
        const medName = item.medicine?.name || 'Medicine Item';
        const qty = item.quantity || 1;
        const price = Number(item.unit_price || item.medicine?.unit_price || 0);
        const lineTotal = (qty * price).toFixed(2);
        
        let freqStr = item.frequency || '';
        if (item.dosage_schedule && Array.isArray(item.dosage_schedule) && item.dosage_schedule.length > 0) {
          freqStr = item.dosage_schedule.map(s => `${s.time} (${s.timing})`).join(', ');
        }

        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(`${medName} (Qty: ${qty} x Rs. ${price.toFixed(2)})`, 20, currentY);
        doc.text(`Rs. ${lineTotal}`, 160, currentY);
        currentY += 5;
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`Sig: ${item.dosage}, ${freqStr}, for ${item.duration}`, 20, currentY);
        currentY += 8;
      });
    } else {
      doc.text(`Hospital Charges - ${invoice.invoice_type.toUpperCase()}`, 20, currentY);
      doc.text(`Rs. ${Number(invoice.amount).toFixed(2)}`, 160, currentY);
      currentY += 10;
    }

    doc.line(14, currentY, 196, currentY);
    currentY += 12;

    // Total
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text('Total Payable:', 120, currentY);
    doc.text(`Rs. ${Number(invoice.amount).toFixed(2)}`, 160, currentY);

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice_${invoice.id}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// Admin only: Get all invoices hospital-wide with optional status & date filtering
const getAllInvoices = async (req, res, next) => {
  try {
    const { status, startDate, endDate } = req.query;
    const where = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate + 'T23:59:59.999Z')],
      };
    }

    const invoices = await Invoice.findAll({
      where,
      include: [
        { model: Patient, as: 'patient', attributes: ['name', 'patient_id', 'phone'] },
        { model: Payment, as: 'payments' },
        {
          model: Prescription,
          as: 'prescription',
          include: [
            {
              model: PrescriptionItem,
              as: 'items',
              include: [{ model: Medicine, as: 'medicine', attributes: ['name', 'unit_price'] }],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({ success: true, data: invoices });
  } catch (error) {
    next(error);
  }
};

// Admin only: Billing and revenue intelligence dashboard
const getRevenueOverview = async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;
    const where = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate + 'T23:59:59.999Z')],
      };
    }

    const departments = await Department.findAll({ attributes: ['id', 'name'] });

    const invoices = await Invoice.findAll({
      where,
      include: [
        { model: Patient, as: 'patient', attributes: ['name', 'patient_id'] },
        { model: Payment, as: 'payments' },
        {
          model: Consultation,
          as: 'consultation',
          include: [
            {
              model: Doctor,
              as: 'doctor',
              include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
            },
          ],
        },
        {
          model: Prescription,
          as: 'prescription',
          include: [
            {
              model: Doctor,
              as: 'doctor',
              include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
            },
          ],
        },
      ],
    });

    let totalRevenue = 0;
    let pendingAmount = 0;
    let paidCount = 0;
    let pendingCount = 0;

    const breakdown = {
      consultation: 0,
      pharmacy: 0,
      final: 0,
    };

    // Monthly & daily buckets
    const monthlyMap = {};
    const dailyMap = {};

    const deptRevenueMap = {};
    departments.forEach((dept) => {
      deptRevenueMap[dept.name] = 0;
    });

    invoices.forEach((inv) => {
      const amt = Number(inv.amount);
      const dateObj = new Date(inv.createdAt);
      const monthKey = dateObj.toLocaleString('default', { month: 'short', year: 'numeric' });
      const dayKey = dateObj.toISOString().split('T')[0];

      if (inv.status === 'paid') {
        totalRevenue += amt;
        paidCount++;
        breakdown[inv.invoice_type] = (breakdown[inv.invoice_type] || 0) + amt;

        monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + amt;
        dailyMap[dayKey] = (dailyMap[dayKey] || 0) + amt;

        const deptName =
          inv.consultation?.doctor?.department?.name ||
          inv.prescription?.doctor?.department?.name;

        if (deptName) {
          deptRevenueMap[deptName] = (deptRevenueMap[deptName] || 0) + amt;
        } else if (departments.length > 0) {
          deptRevenueMap[departments[0].name] = (deptRevenueMap[departments[0].name] || 0) + amt;
        }
      } else {
        pendingAmount += amt;
        pendingCount++;
      }
    });

    const monthlyTrend = Object.keys(monthlyMap).map((m) => ({ month: m, revenue: monthlyMap[m] }));
    const dailyTrend = Object.keys(dailyMap).sort().slice(-7).map((d) => ({ date: d, revenue: dailyMap[d] }));

    // Real department breakdown from database
    const departmentBreakdown = Object.keys(deptRevenueMap).map((dept) => ({
      department: dept,
      revenue: deptRevenueMap[dept],
    }));

    return res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        pendingAmount,
        paidCount,
        pendingCount,
        totalInvoices: invoices.length,
        breakdown,
        departmentBreakdown,
        monthlyTrend,
        dailyTrend,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create a Razorpay Order
const createOrder = async (req, res, next) => {
  try {
    const { invoice_id } = req.body;
    
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, message: 'Razorpay keys not configured on server.' });
    }

    const invoice = await Invoice.findByPk(invoice_id, {
      include: [{ model: Patient, as: 'patient' }],
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    if (req.user.role === 'patient' && invoice.patient_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You cannot pay for another patient invoice.' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Invoice has already been paid.' });
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const amountInPaise = Math.round(Number(invoice.amount) * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      description: `Payment for Invoice #${invoice.id}`,
      reference_id: `inv_${invoice.id}_${Date.now()}`,
      notes: {
        invoice_id: invoice.id,
        patient_id: invoice.patient_id,
      },
    };

    const paymentLink = await instance.paymentLink.create(options);

    return res.status(200).json({
      success: true,
      data: {
        payment_link_id: paymentLink.id,
        short_url: paymentLink.short_url,
        invoice,
      },
    });
  } catch (error) {
    next(error);
  }
};
// Patient or Admin: Generate dynamic UPI QR with exact prefilled amount and invoice reference
const getInvoiceUpiQr = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id, {
      include: [{ model: Patient, as: 'patient' }],
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    if (req.user.role === 'patient' && invoice.patient_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You cannot access this invoice.' });
    }

    const upiId = process.env.HOSPITAL_UPI_ID || 'gangaganga2235@oksbi';
    const payeeName = process.env.HOSPITAL_NAME || 'Metro General Apex Hospital';
    const amount = Number(invoice.amount).toFixed(2);
    const note = `Invoice #${invoice.id}`;
    const transactionRef = `INV${invoice.id}T${Date.now()}`; // Unique Transaction Reference

    // Standard UPI Payment URI:
    // upi://pay?pa=<UPI_ID>&pn=<PAYEE_NAME>&am=<AMOUNT>&cu=INR&tn=<NOTE>&tr=<TXN_REF>
    const params = new URLSearchParams({
      pa: upiId,
      pn: payeeName,
      am: amount,
      cu: 'INR',
      tn: note,
      tr: transactionRef,
    });
    const upiUrl = `upi://pay?${params.toString()}`;

    // Generate high-quality QR Code Data URL (PNG Base64)
    const qrDataUrl = await QRCode.toDataURL(upiUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        invoice_id: invoice.id,
        invoice_type: invoice.invoice_type,
        amount: Number(amount),
        status: invoice.status,
        upi_id: upiId,
        payee_name: payeeName,
        note,
        transaction_ref: transactionRef,
        upi_url: upiUrl,
        qr_data_url: qrDataUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get real-time status of an invoice (For Frontend Polling)
const getInvoiceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id);

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    // Patient can only view their own invoice status
    if (req.user.role === 'patient' && invoice.patient_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    return res.status(200).json({
      success: true,
      data: {
        invoice_id: invoice.id,
        status: invoice.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Webhook handler for Razorpay
const handleWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    
    if (webhookSecret && signature) {
      const bodyString = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(bodyString)
        .digest('hex');

      if (expectedSignature !== signature) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    } else {
      console.warn('Webhook received without signature validation. Please configure RAZORPAY_WEBHOOK_SECRET.');
    }
    
    const event = req.body.event;
    
    if (event === 'payment.captured' || event === 'order.paid' || event === 'payment_link.paid') {
      const paymentData = req.body.payload.payment ? req.body.payload.payment.entity : req.body.payload.payment_link.entity;
      const invoiceId = paymentData.notes?.invoice_id;
      
      if (invoiceId) {
        const invoice = await Invoice.findByPk(invoiceId, { include: [{ model: Patient, as: 'patient' }] });
        
        if (invoice && invoice.status !== 'paid') {
          // Process payment confirmation automatically
          await sequelize.transaction(async (t) => {
            await Payment.create(
              {
                invoice_id: invoice.id,
                amount_paid: invoice.amount,
                payment_mode: 'razorpay',
                gateway_payment_id: paymentData.id,
                paid_at: new Date(),
              },
              { transaction: t }
            );

            await invoice.update(
              { status: 'paid', rejection_reason: null },
              { transaction: t }
            );
          });
        }
      }
    }
    
    return res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Even on error, it's often recommended to return 200 to gateway so they don't block
    return res.status(200).send('Error');
  }
};

// Patient manually marks invoice as paid
const markInvoicePaid = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    
    // Set to pending_verification
    await invoice.update({ status: 'pending_verification' });
    
    return res.status(200).json({ success: true, message: 'Invoice marked as pending verification' });
  } catch (error) {
    next(error);
  }
};

// Admin manually confirms payment
const confirmPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    
    await sequelize.transaction(async (t) => {
      await Payment.create(
        {
          invoice_id: invoice.id,
          amount_paid: invoice.amount,
          payment_mode: 'upi_manual',
          paid_at: new Date(),
        },
        { transaction: t }
      );
      await invoice.update({ status: 'paid', rejection_reason: null }, { transaction: t });
    });
    
    return res.status(200).json({ success: true, message: 'Payment confirmed successfully' });
  } catch (error) {
    next(error);
  }
};

// Admin rejects manual payment
const rejectPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const invoice = await Invoice.findByPk(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    
    await invoice.update({ status: 'pending', rejection_reason: reason });
    return res.status(200).json({ success: true, message: 'Payment rejected' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};

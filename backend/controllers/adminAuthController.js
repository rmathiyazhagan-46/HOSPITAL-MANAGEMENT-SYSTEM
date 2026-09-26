const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Admin } = require('../models');

const generateToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'super_secret_jwt_key_hms_2026_secure_token',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

const adminLogin = async (req, res, next) => {
  try {
    const { hospital_name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hospital email or password',
      });
    }

    const admin = await Admin.findOne({ where: { hospital_email: String(email).trim().toLowerCase() } });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid hospital email or password',
      });
    }

    // If hospital_name was provided, verify it matches
    if (hospital_name && String(hospital_name).trim().toLowerCase() !== String(admin.hospital_name).trim().toLowerCase()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid hospital email or password',
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid hospital email or password',
      });
    }

    const token = generateToken({
      id: admin.id,
      role: 'admin',
      email: admin.hospital_email,
      hospitalName: admin.hospital_name,
    });

    return res.status(200).json({
      success: true,
      message: 'Admin login successful.',
      token,
      admin: {
        id: admin.id,
        hospital_name: admin.hospital_name,
        hospital_email: admin.hospital_email,
        role: 'admin',
      },
    });
  } catch (error) {
    next(error);
  }
};

const adminSeed = async (req, res, next) => {
  try {
    const existing = await Admin.count();
    if (existing > 0) {
      return res.status(400).json({
        success: false,
        message: 'Admin accounts already exist.',
      });
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await Admin.create({
      hospital_name: 'Metro General Apex Hospital',
      hospital_email: 'admin@hospital.org',
      password_hash: hashedPassword,
    });

    return res.status(201).json({
      success: true,
      message: 'Default admin created successfully.',
      admin: {
        id: admin.id,
        hospital_name: admin.hospital_name,
        hospital_email: admin.hospital_email,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAdminProfile = async (req, res, next) => {
  try {
    const admin = await Admin.findByPk(req.user.id, {
      attributes: ['id', 'hospital_name', 'hospital_email', 'createdAt'],
    });

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin profile not found.' });
    }

    return res.status(200).json({ success: true, data: admin });
  } catch (error) {
    next(error);
  }
};
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const adminId = req.user.id;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
    }

    const admin = await Admin.findByPk(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect current password.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await admin.update({ password_hash: hashedPassword });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  adminLogin,
  adminSeed,
  getAdminProfile,
  changePassword,
};

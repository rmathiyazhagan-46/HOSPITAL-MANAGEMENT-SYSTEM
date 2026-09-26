require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./models');

async function updatePasswords() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('docter@123', salt);
    
    // Check if Doctor model exists
    if (!db.Doctor) {
      console.error('Doctor model not found in db models');
      process.exit(1);
    }

    const [updatedCount] = await db.Doctor.update(
      { password_hash: hashedPassword },
      { where: {} }
    );
    
    console.log(`Successfully updated password_hash for ${updatedCount} doctors to docter@123`);
    process.exit(0);
  } catch (err) {
    console.error('Error updating passwords:', err);
    process.exit(1);
  }
}

updatePasswords();

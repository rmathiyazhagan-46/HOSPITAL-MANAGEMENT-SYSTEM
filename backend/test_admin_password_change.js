const axios = require('axios');
const API_URL = 'http://localhost:5000/api';

async function testPasswordChange() {
  try {
    console.log('1. Logging in as Admin...');
    const loginRes = await axios.post(`${API_URL}/auth/admin/login`, {
      email: 'admin@hospital.org',
      password: 'admin123',
    });
    
    const token = loginRes.data.token;
    console.log('Login successful.');

    console.log('2. Changing password...');
    const changeRes = await axios.patch(`${API_URL}/auth/admin/me/change-password`, {
      currentPassword: 'admin123',
      newPassword: 'newadmin123',
      confirmPassword: 'newadmin123',
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Password change successful:', changeRes.data.message);

    console.log('3. Logging in with new password...');
    const newLoginRes = await axios.post(`${API_URL}/auth/admin/login`, {
      email: 'admin@hospital.org',
      password: 'newadmin123',
    });
    console.log('New login successful.');

    console.log('4. Changing password back...');
    const revertRes = await axios.patch(`${API_URL}/auth/admin/me/change-password`, {
      currentPassword: 'newadmin123',
      newPassword: 'admin123',
      confirmPassword: 'admin123',
    }, {
      headers: {
        Authorization: `Bearer ${newLoginRes.data.token}`
      }
    });
    console.log('Password reverted successfully.');

  } catch (error) {
    console.error('Test failed:', error.response ? error.response.data : error.message);
  }
}

testPasswordChange();

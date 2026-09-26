const { spawn } = require('child_process');
const path = require('path');

console.clear();
console.log('\x1b[36m%s\x1b[0m', '================================================================');
console.log('\x1b[1m\x1b[32m%s\x1b[0m', '   🏥  PULSECARE HOSPITAL MANAGEMENT SYSTEM (HMS) IS STARTING');
console.log('\x1b[36m%s\x1b[0m', '================================================================');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

// 1. Start Backend Server
const backend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'pipe',
  shell: true,
});

backend.stdout.on('data', (data) => {
  const text = data.toString();
  // Filter noisy logs if needed or prefix with [Backend]
  process.stdout.write(`\x1b[34m[Backend]\x1b[0m ${text}`);
});

backend.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[31m[Backend Error]\x1b[0m ${data.toString()}`);
});

// 2. Start Frontend Server
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'pipe',
  shell: true,
});

frontend.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(`\x1b[32m[Frontend]\x1b[0m ${text}`);
});

frontend.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[31m[Frontend Error]\x1b[0m ${data.toString()}`);
});

// Print Clickable Links Banner after a short 1s delay so both have initialized
setTimeout(() => {
  console.log('\n\x1b[36m%s\x1b[0m', '================================================================');
  console.log('\x1b[1m\x1b[32m%s\x1b[0m', '   🚀 APPLICATION READY & RUNNING LIVE!');
  console.log('\x1b[36m%s\x1b[0m', '================================================================');
  console.log('\x1b[1m\x1b[37m%s\x1b[0m', '   ➜  FRONTEND WEB APP:  \x1b[36m\x1b[4mhttp://localhost:5173/\x1b[0m');
  console.log('\x1b[1m\x1b[37m%s\x1b[0m', '   ➜  BACKEND REST API:  \x1b[34m\x1b[4mhttp://localhost:5000/api\x1b[0m');
  console.log('\x1b[1m\x1b[37m%s\x1b[0m', '   ➜  API HEALTH CHECK:  \x1b[32m\x1b[4mhttp://localhost:5000/api/health\x1b[0m');
  console.log('\x1b[36m%s\x1b[0m', '----------------------------------------------------------------');
  console.log('\x1b[1m%s\x1b[0m', '   DIRECT LOGIN PORTAL LINKS:');
  console.log('   • Patient Portal:     \x1b[36m\x1b[4mhttp://localhost:5173/login/patient\x1b[0m');
  console.log('   • Doctor Portal:      \x1b[36m\x1b[4mhttp://localhost:5173/login/doctor\x1b[0m');
  console.log('   • Admin Portal:       \x1b[36m\x1b[4mhttp://localhost:5173/login/admin\x1b[0m');
  console.log('\x1b[36m%s\x1b[0m', '================================================================\n');
  console.log('\x1b[90m%s\x1b[0m', 'Press Ctrl+C at any time to stop both servers.\n');
}, 1500);

// Graceful cleanup on Ctrl+C
const cleanup = () => {
  console.log('\n\x1b[33m%s\x1b[0m', 'Stopping both frontend and backend servers...');
  backend.kill();
  frontend.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

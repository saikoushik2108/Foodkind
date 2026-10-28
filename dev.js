import { spawn } from 'child_process';
import process from 'process';

console.log('\x1b[36m%s\x1b[0m', '=======================================================');
console.log('\x1b[36m%s\x1b[0m', '   Starting FoodKind Full-Stack Environment            ');
console.log('\x1b[36m%s\x1b[0m', '   Backend:  http://localhost:5050                      ');
console.log('\x1b[36m%s\x1b[0m', '   Frontend: http://localhost:5173                      ');
console.log('\x1b[36m%s\x1b[0m', '=======================================================');

// 1. Start Backend on port 5050
const backend = spawn('node', ['src/server.js'], {
  cwd: './backend',
  stdio: 'inherit',
  shell: true,
});

// 2. Start Frontend on port 5173
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: './frontend',
  stdio: 'inherit',
  shell: true,
});

function cleanup() {
  console.log('\nShutting down FoodKind services...');
  try { backend.kill(); } catch {}
  try { frontend.kill(); } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

#!/usr/bin/env node
const { spawn } = require('child_process');
const mysql = require('mysql2/promise');

const cfg = {
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'advocatelearn_dev'
};

async function waitForDb() {
  console.log('Waiting for database...');
  for (let i = 0; i < 60; i++) {
    try {
      const c = await mysql.createConnection(cfg);
      await c.end();
      console.log('Database is ready.');
      return;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error('Database did not become ready in time');
}

async function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
    child.on('error', reject);
  });
}

async function main() {
  await waitForDb();
  console.log('Running migrations...');
  await run('npm', ['run', 'db:migrate']).catch(() => {});
  if (process.env.RUN_SEED === 'true') {
    console.log('Running seeds...');
    await run('npm', ['run', 'db:seed']).catch(() => {});
  }
  const cmd = process.argv[2];
  const args = process.argv.slice(3);
  if (!cmd) process.exit(1);
  const child = spawn(cmd, args, { stdio: 'inherit', cwd: '/app' });
  child.on('exit', (code) => process.exit(code != null ? code : 0));
  child.on('error', (err) => {
    console.error(err);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

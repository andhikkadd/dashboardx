const { exec } = require('child_process');

// Run database migrations in the background
if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL detected. Running database migrations in the background...');
  const migration = exec('npx prisma migrate deploy', (error, stdout, stderr) => {
    if (error) {
      console.error('Database migration failed:', error);
      return;
    }
    console.log('Database migration completed successfully.');
    if (stdout) console.log('Migration output:', stdout);
    if (stderr) console.error('Migration stderr:', stderr);
  });

  migration.on('exit', (code) => {
    console.log(`Migration process exited with code ${code}`);
  });
} else {
  console.warn('DATABASE_URL is not set. Skipping migrations.');
}

// Start the Next.js server
console.log('Starting Next.js server...');
require('./server.js');

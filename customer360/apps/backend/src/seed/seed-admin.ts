import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import dataSource from '../config/data-source';

async function seedAdmin(ds: DataSource) {
  const adminPasswordHash = await bcrypt.hash('Admin123!', 12);
  await ds.query(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING`,
    [uuidv4(), 'admin@test.com', adminPasswordHash, 'admin'],
  );
  console.log('✅ Admin user seeded: admin@test.com / Admin123!');
}

async function main() {
  await dataSource.initialize();
  await seedAdmin(dataSource);
  await dataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

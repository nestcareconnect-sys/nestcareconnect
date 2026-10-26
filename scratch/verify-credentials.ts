import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../api/config/prisma.js';

async function check() {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@nestcareconnect.com' } });
  const customer = await prisma.user.findUnique({ where: { email: 'customer@nestcareconnect.com' } });

  console.log('Admin in DB:');
  console.log(`Email: ${admin?.email}`);
  console.log(`Name: ${admin?.name}`);
  console.log(`Role: ${admin?.role}`);
  const adminPassMatch = admin ? await bcrypt.compare('Admin@123456', admin.passwordHash) : false;
  console.log(`Password Admin@123456 match: ${adminPassMatch}`);

  console.log('\nCustomer (Rajesh Sharma) in DB:');
  console.log(`Email: ${customer?.email}`);
  console.log(`Name: ${customer?.name}`);
  console.log(`Role: ${customer?.role}`);
  console.log(`Phone: ${customer?.phone}`);
  const customerPassMatch = customer ? await bcrypt.compare('User@123456', customer.passwordHash) : false;
  console.log(`Password User@123456 match: ${customerPassMatch}`);
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

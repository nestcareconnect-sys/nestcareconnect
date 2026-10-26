import 'dotenv/config';
import prisma from '../api/config/prisma.js';

const BCRYPT_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const ARGON2_REGEX = /^\$argon2(id|i|d)\$/;

async function auditDatabasePasswords() {
  console.log('Auditing database user password storage...');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      passwordHash: true,
      createdAt: true,
    },
  });

  console.log(`Total users found: ${users.length}`);

  let bcryptCount = 0;
  let argon2Count = 0;
  let plaintextOrInsecureCount = 0;
  const insecureUserIds: string[] = [];

  for (const u of users) {
    const val = u.passwordHash;
    if (!val) {
      plaintextOrInsecureCount++;
      insecureUserIds.push(u.id);
    } else if (BCRYPT_REGEX.test(val)) {
      bcryptCount++;
    } else if (ARGON2_REGEX.test(val)) {
      argon2Count++;
    } else {
      plaintextOrInsecureCount++;
      insecureUserIds.push(u.id);
    }
  }

  console.log({
    totalUsers: users.length,
    bcryptHashed: bcryptCount,
    argon2Hashed: argon2Count,
    plaintextOrInsecure: plaintextOrInsecureCount,
    insecureUserIds,
  });

  process.exit(0);
}

auditDatabasePasswords().catch((err) => {
  console.error('Audit script error:', err.message);
  process.exit(1);
});

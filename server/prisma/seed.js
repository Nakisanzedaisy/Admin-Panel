const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create super admin
  const hashedPassword = await bcrypt.hash('Admin@123456', 12);
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@kauntabook.com' },
    update: {},
    create: {
      email: 'superadmin@kauntabook.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE'
    }
  });

  console.log('Super Admin created:', superAdmin.email);
  console.log('Default credentials:');
  console.log('   Email: superadmin@kauntabook.com');
  console.log('   Password: Admin@123456');
  console.log('Please change the default password after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
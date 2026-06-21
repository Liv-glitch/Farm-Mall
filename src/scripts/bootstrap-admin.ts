import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/environment';
import { UserModel } from '../models/User.model';

async function bootstrapAdmin(): Promise<void> {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required to bootstrap an admin user.');
  }

  await connectDatabase();

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, env.BCRYPT_SALT_ROUNDS);
  const [admin, created] = await UserModel.findOrCreate({
    where: { email: env.ADMIN_EMAIL.toLowerCase() },
    defaults: {
      fullName: env.ADMIN_FULL_NAME || 'Farm Mall Admin',
      email: env.ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      county: env.ADMIN_COUNTY || 'Nairobi',
      subCounty: env.ADMIN_SUB_COUNTY || 'Central',
      subscriptionType: 'premium',
      emailVerified: true,
      phoneVerified: false,
      role: 'admin',
    },
  });

  if (!created) {
    await admin.update({
      passwordHash,
      role: 'admin',
      emailVerified: true,
    });
  }

  console.log(`${created ? 'Created' : 'Updated'} admin user ${env.ADMIN_EMAIL}.`);
}

bootstrapAdmin()
  .catch((error) => {
    console.error('Failed to bootstrap admin user:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });

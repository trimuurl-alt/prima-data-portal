import { PrismaClient, UserRole, UserStatus, DatasetStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@primaresearch.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@Prima2026!';
  const adminName = process.env.SEED_ADMIN_NAME ?? 'Admin User';

  // ── Admin ──
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        fullName: adminName,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    console.log(`✓ Admin created: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`• Admin already exists: ${adminEmail}`);
  }

  // ── Sample client ──
  const clientEmail = 'alpha@alphacapital.com';
  let client = await prisma.user.findUnique({ where: { email: clientEmail } });
  if (!client) {
    client = await prisma.user.create({
      data: {
        email: clientEmail,
        passwordHash: await bcrypt.hash('Client@2026!', 12),
        fullName: 'Alpha Capital',
        companyName: 'Alpha Capital Partners',
        role: UserRole.CLIENT,
        status: UserStatus.ACTIVE,
      },
    });
    console.log(`✓ Client created: ${clientEmail} / Client@2026!`);
  } else {
    console.log(`• Client already exists: ${clientEmail}`);
  }

  // ── Default categories (safe to re-run; idempotent via slug) ──
  const defaults = [
    { name: 'Education',  slug: 'education',  sortOrder: 1 },
    { name: 'Retail',     slug: 'retail',     sortOrder: 2 },
    { name: 'Geospatial', slug: 'geospatial', sortOrder: 3 },
    { name: 'Consumer',   slug: 'consumer',   sortOrder: 4 },
    { name: 'Industry',   slug: 'industry',   sortOrder: 5 },
    { name: 'Financial',  slug: 'financial',  sortOrder: 6 },
    { name: 'Other',      slug: 'other',      sortOrder: 7 },
  ];

  for (const c of defaults) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: c.sortOrder },
      create: c,
    });
  }
  console.log(`✓ Default categories ensured (${defaults.length})`);

  // Look up created category ids for sample dataset seeding
  const educationCat = await prisma.category.findUnique({ where: { slug: 'education' } });
  const retailCat = await prisma.category.findUnique({ where: { slug: 'retail' } });

  // ── Sample datasets (no files yet — admin uploads via UI) ──
  const samples = [
    {
      name: '2026 National School Dataset',
      slug: '2026-national-school-data',
      categoryId: educationCat?.id,
      description: 'Comprehensive UK school enrollment data with year-on-year coverage from 2018 to 2026.',
      coverage: '2018–2026', recordCount: 6140000,
    },
    {
      name: '2026 Shopping Mall Database',
      slug: '2026-shopping-mall-database',
      categoryId: retailCat?.id,
      description: 'Detailed records for shopping centres across the UK including footfall, anchor tenants, and lease data.',
      coverage: '2026', recordCount: 4287,
    },
    {
      name: 'Bash Store Locations',
      slug: 'bash-store-locations',
      categoryId: retailCat?.id,
      description: 'Geocoded retail store locations across the UK retail network.',
      coverage: '2026', recordCount: 12450,
    },
  ];

  for (const s of samples) {
    const exists = await prisma.dataset.findUnique({ where: { slug: s.slug } });
    if (!exists) {
      const created = await prisma.dataset.create({
        data: { ...s, status: DatasetStatus.DRAFT, uploadedById: admin.id },
      });
      console.log(`✓ Dataset created: ${created.name} (DRAFT — upload a file to publish)`);
    } else {
      console.log(`• Dataset already exists: ${s.name}`);
    }
  }

  console.log('\n✅ Seed complete.\n');
  console.log('Login credentials:');
  console.log(`  Admin:        ${adminEmail} / ${adminPassword}`);
  console.log(`  Client:       ${clientEmail} / Client@2026!`);
  console.log('\n⚠  Change these passwords immediately in production.\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

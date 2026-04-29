// scripts/create-admin.ts
// Çalıştır: npx ts-node scripts/create-admin.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import readline from "readline";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log("\n🖨️  Print3D Store — Admin Kullanıcı Oluşturucu\n");

  const name = await ask("Ad Soyad: ");
  const email = await ask("E-posta: ");
  const password = await ask("Şifre (min 8 karakter): ");

  if (password.length < 8) {
    console.error("❌ Şifre en az 8 karakter olmalı.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.error("❌ Bu e-posta adresi zaten kayıtlı.");
    process.exit(1);
  }

  const user = await prisma.adminUser.create({
    data: { name, email, passwordHash, role: "SUPER_ADMIN" },
  });

  console.log(`\n✅ Admin kullanıcı oluşturuldu!`);
  console.log(`   ID:    ${user.id}`);
  console.log(`   Ad:    ${user.name}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Rol:   ${user.role}\n`);

  rl.close();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


// ─────────────────────────────────────────────
// prisma/seed.ts — Örnek kategoriler ve ürünler
// ─────────────────────────────────────────────

const CATEGORIES = [
  { name: "Dekorasyon", slug: "dekorasyon", description: "Ev ve ofis dekorasyon ürünleri", iconName: "Sparkles" },
  { name: "Otomotiv", slug: "otomotiv", description: "Araç iç ve dış aksesuar parçaları", iconName: "Car" },
  { name: "Yedek Parça", slug: "yedek-parca", description: "Makine ve cihaz yedek parçaları", iconName: "Settings" },
  { name: "Oyuncak & Hobi", slug: "oyuncak-hobi", description: "Figürler, modeller ve hobi ürünleri", iconName: "Gamepad2" },
  { name: "Endüstriyel", slug: "endustriyel", description: "Endüstriyel kullanım bileşenleri", iconName: "Factory" },
];

async function seedDatabase() {
  const prismaLocal = new PrismaClient();

  console.log("🌱 Veritabanı seed başlıyor...");

  // Categories
  for (const cat of CATEGORIES) {
    await prismaLocal.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log(`✅ ${CATEGORIES.length} kategori oluşturuldu.`);

  const dekorasyon = await prismaLocal.category.findUnique({
    where: { slug: "dekorasyon" },
  });

  // Sample products
  const sampleProducts = [
    {
      name: "Geometrik Vazo — Hex Serisi",
      slug: "geometrik-vazo-hex",
      description: "Modern tasarımlı altıgen geometrik vazo. Yapay çiçekler için idealdir.",
      price: 249.90,
      stock: 15,
      filamentType: "PLA",
      printTimeHours: 6.5,
      dimensionX: 120, dimensionY: 120, dimensionZ: 200,
      weight: 180,
      categoryId: dekorasyon!.id,
    },
    {
      name: "Masa Organizer — Minimal",
      slug: "masa-organizer-minimal",
      description: "Kalem, kağıt ve telefon için bölmeli masa düzenleyici.",
      price: 189.00,
      stock: 8,
      filamentType: "PETG",
      printTimeHours: 9,
      dimensionX: 200, dimensionY: 100, dimensionZ: 80,
      weight: 320,
      categoryId: dekorasyon!.id,
    },
  ];

  for (const product of sampleProducts) {
    await prismaLocal.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: product,
    });
  }

  console.log(`✅ ${sampleProducts.length} örnek ürün oluşturuldu.`);
  console.log("🎉 Seed tamamlandı!\n");

  await prismaLocal.$disconnect();
}

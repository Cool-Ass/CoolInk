import { loadEnv } from "./load-env";
loadEnv();

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { flattenDefaults } from "../lib/content";
import { defaultHomepageModules } from "../lib/modules";

const prisma = new PrismaClient();

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Admin";

  if (!email || !password) {
    console.warn(
      "\n⚠️  ADMIN_EMAIL / ADMIN_PASSWORD not set in .env — skipping admin user creation.\n" +
        "   Copy .env.example to .env, set them, then re-run `npm run db:seed`.\n"
    );
    return;
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, passwordHash, name },
  });

  console.log(`✅ Admin user ready: ${admin.email}`);
}

/** Global settings only (brand, contact, footer) — page-specific copy lives in Page.modules. */
async function seedSiteSettings() {
  const defaults = flattenDefaults();

  for (const [key, value] of Object.entries(defaults)) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: {}, // never clobber a value an admin already customized
      create: { key, value },
    });
  }

  console.log(`✅ Global site settings ready (${Object.keys(defaults).length} keys checked).`);
}

async function seedPortfolio() {
  const count = await prisma.portfolioItem.count();
  if (count > 0) {
    console.log("↷  Portfolio already has items — skipping seed.");
    return [];
  }

  const items = [
    {
      title: "Realizm rzeźbiarski",
      description: "Szczegółowa praca w realizmie czarno-szarym.",
      imageUrl: "/images/crops/portfolio-1.jpg",
      category: "Realizm",
      tags: "realizm,czarno-szare,rękaw",
      order: 0,
    },
    {
      title: "Ryczący tygrys",
      description: "Kontrastowy portret tygrysa w realizmie.",
      imageUrl: "/images/crops/portfolio-2.jpg",
      category: "Realizm",
      tags: "realizm,zwierzęta,czarno-szare",
      order: 1,
    },
    {
      title: "Portret w masce",
      description: "Surrealistyczny portret z piórami i maską.",
      imageUrl: "/images/crops/portfolio-3.jpg",
      category: "Surrealizm",
      tags: "surrealizm,portret",
      order: 2,
    },
    {
      title: "Maska wojownika",
      description: "Zdobiona maska wojownika w stylu realizmu.",
      imageUrl: "/images/crops/portfolio-4.jpg",
      category: "Realizm",
      tags: "realizm,maska",
      order: 3,
    },
  ];

  await prisma.portfolioItem.createMany({ data: items });
  console.log(`✅ Dodano ${items.length} elementów portfolio.`);
  return items;
}

/**
 * Migrates the original hardcoded homepage into a modular Page row, so
 * the site keeps working exactly as before but is now editable through
 * the page builder. No-ops if a homepage row already exists (never
 * overwrites an admin's edits on repeated `db:seed` runs).
 */
async function seedHomepage() {
  const existing = await prisma.page.findFirst({ where: { isHomepage: true } });
  if (existing) {
    console.log("↷  Homepage already exists — skipping seed.");
    return;
  }

  const modules = defaultHomepageModules();

  await prisma.page.create({
    data: {
      title: "Strona główna",
      slug: "strona-glowna",
      isHomepage: true,
      showInNav: false,
      status: "published",
      modules: JSON.stringify(modules),
      publishedModules: JSON.stringify(modules),
    },
  });

  console.log("✅ Strona główna utworzona i opublikowana z domyślnymi modułami.");
}

async function main() {
  await seedAdmin();
  await seedSiteSettings();
  await seedPortfolio();
  await seedHomepage();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { prisma } from "./prisma";

export const MAINTENANCE_MODE_KEY = "site.maintenanceMode";

export function parseMaintenanceMode(value: string | null | undefined, fallback = false) {
  if (value === null || value === undefined || value.trim() === "") return fallback;
  return value.trim().toLowerCase() === "true";
}

/**
 * The database switch is the normal control used by the admin panel. The
 * environment variable remains an emergency fallback for a fresh database.
 * Once the admin saves an explicit value, it takes precedence over the env.
 */
export async function getMaintenanceMode() {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: MAINTENANCE_MODE_KEY },
    select: { value: true },
  });

  return parseMaintenanceMode(
    setting?.value,
    process.env.SITE_BUILD_MODE === "true"
  );
}


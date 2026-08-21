import { prisma } from "@/lib/prisma";
import MediaGrid from "@/components/admin/MediaGrid";
import { getMediaUsageMap } from "@/lib/mediaUsage";
import type { Media } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const [media, usageMap] = await Promise.all([
    prisma.media.findMany({ orderBy: { createdAt: "desc" } }),
    getMediaUsageMap(),
  ]);

  const mediaWithUsage = media.map((item: Media) => ({
    ...item,
    usedIn: usageMap.get(item.url) ?? [],
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-2 text-[13px] font-medium tracking-[0.3em] text-ink-gold">
          OBRAZY / MEDIA
        </p>
        <h1 className="font-display text-3xl text-ink-white">Biblioteka mediów</h1>
        <p className="mt-2 max-w-xl text-[13px] text-ink-grey">
          Każdy obraz przesłany tutaj (lub przez formularz strony/portfolio) jest automatycznie
          skalowany i konwertowany do zoptymalizowanego formatu WebP. Skopiuj adres URL pliku, aby
          użyć go w innym miejscu.
        </p>
      </div>
      <MediaGrid initialMedia={mediaWithUsage} />
    </div>
  );
}

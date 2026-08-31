"use client";

import type { ComponentProps } from "react";
import ClientBookingCalendar from "@/components/client/ClientBookingCalendar";

export default function PublicBookingCalendar(props: Omit<ComponentProps<typeof ClientBookingCalendar>, "projects" | "mode">) {
  return <ClientBookingCalendar {...props} mode="public" />;
}

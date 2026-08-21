"use client";
import { useRouter } from "next/navigation";
export default function ClientLogoutButton() { const router = useRouter(); return <button onClick={async () => { await fetch("/api/client/auth/logout", { method: "POST" }); router.push("/app"); router.refresh(); }} className="text-xs tracking-[0.1em] text-ink-grey hover:text-ink-white">WYLOGUJ</button>; }

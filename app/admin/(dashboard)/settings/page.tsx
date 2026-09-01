import { getCurrentAdmin } from "@/lib/auth";
import ChangePasswordForm from "@/components/admin/ChangePasswordForm";
import GoogleCalendarIntegration from "@/components/admin/GoogleCalendarIntegration";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const admin = await getCurrentAdmin();

  return (
    <div className="flex flex-col gap-10">
      <div>
        <p className="mb-2 text-[13px] font-medium tracking-[0.3em] text-ink-gold">USTAWIENIA</p>
        <h1 className="font-display text-3xl text-ink-white">Konto</h1>
      </div>
      <GoogleCalendarIntegration />

      <div className="border border-ink-white/10 bg-ink-charcoal/30 p-6">
        <p className="text-[12px] tracking-[0.1em] text-ink-grey">ZALOGOWANO JAKO</p>
        <p className="mt-2 text-[15px] text-ink-white">{admin?.email}</p>
        {admin?.name && <p className="mt-1 text-[13px] text-ink-grey">{admin.name}</p>}
        <p className="mt-4 text-[12px] text-ink-grey/70">
          Aby utworzyć dodatkowe konta administratora lub zresetować hasło z poziomu terminala,
          uruchom <code className="text-ink-gold">npm run db:seed</code> po zaktualizowaniu
          ADMIN_EMAIL / ADMIN_PASSWORD w pliku .env.
        </p>
      </div>

      <div>
        <p className="mb-4 text-[12px] tracking-[0.15em] text-ink-grey">ZMIEŃ HASŁO</p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}

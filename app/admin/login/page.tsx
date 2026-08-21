import { getSiteContent } from "@/lib/content";
import LoginForm from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const content = await getSiteContent();
  return <LoginForm logoUrl={content.brand.logoUrl} />;
}

import NewPageForm from "@/components/admin/NewPageForm";
import WorkspaceHeader from "@/components/ui/WorkspaceHeader";
import { requireAdminPage } from "@/lib/adminPage";

export default async function NewPagePage() {
  await requireAdminPage("content.manage");
  return (
    <div className="studio-page">
      <WorkspaceHeader eyebrow="STRONA / CMS" title="Nowa strona" description="Podaj tytuł i adres URL — moduły dodasz w następnym kroku, w wizualnym edytorze." />
      <NewPageForm />
    </div>
  );
}

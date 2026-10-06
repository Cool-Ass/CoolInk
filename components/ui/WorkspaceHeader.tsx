import type { ReactNode } from "react";

/** Shared admin/client workspace hierarchy; not public-site display typography. */
export default function WorkspaceHeader({ eyebrow, title, description, actions }: {
  eyebrow: string; title: string; description?: ReactNode; actions?: ReactNode;
}) {
  return <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
    <div className="min-w-0"><p className="studio-eyebrow">{eyebrow}</p>
      <h1 className="studio-page-title">{title}</h1>
      {description && <div className="studio-page-description">{description}</div>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </header>;
}

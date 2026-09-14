import type { LucideIcon } from "lucide-react";
import { EmptyState } from "../../components/EmptyState";

interface UnavailablePageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  message: string;
  detail: string;
}

export function UnavailablePage({ title, description, icon, message, detail }: UnavailablePageProps) {
  return (
    <div className="page">
      <header className="page-header"><div>
        <h1 tabIndex={-1}>{title}</h1><p className="page-description">{description}</p>
      </div></header>
      <div className="content-panel"><EmptyState icon={icon} title={message}>{detail}</EmptyState></div>
    </div>
  );
}

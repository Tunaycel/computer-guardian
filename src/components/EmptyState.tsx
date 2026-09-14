import type { LucideIcon } from "lucide-react";
import { useId } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, children }: EmptyStateProps) {
  const headingId = useId();
  return (
    <section className="empty-state" aria-labelledby={headingId}>
      <Icon size={24} strokeWidth={1.6} aria-hidden="true" />
      <div>
        <h2 id={headingId}>{title}</h2>
        <p>{children}</p>
      </div>
    </section>
  );
}

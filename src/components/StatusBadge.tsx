import { Check } from "lucide-react";

interface StatusBadgeProps {
  label: string;
  tone?: "neutral" | "healthy" | "attention";
}

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${tone}`}>
      {tone === "healthy" && <Check size={14} aria-hidden="true" />}
      {label}
    </span>
  );
}

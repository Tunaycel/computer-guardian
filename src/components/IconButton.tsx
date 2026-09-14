import type { ButtonHTMLAttributes } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export function IconButton({ label, className = "", ...props }: IconButtonProps) {
  return <button type="button" aria-label={label} className={`icon-button ${className}`} {...props} />;
}

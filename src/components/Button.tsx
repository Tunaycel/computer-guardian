import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "danger";
}

export function Button({ variant = "default", className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={`button button--${variant} ${className}`} {...props} />;
}

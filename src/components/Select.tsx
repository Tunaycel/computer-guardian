import { useId, type ReactNode, type SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function Select({ label, hint, children, id, ...props }: SelectProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <select id={inputId} aria-describedby={hint ? `${inputId}-hint` : undefined} {...props}>{children}</select>
      {hint && <p className="field__hint" id={`${inputId}-hint`}>{hint}</p>}
    </div>
  );
}

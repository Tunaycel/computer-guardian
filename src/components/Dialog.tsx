import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Dialog({ title, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    // Native modal semantics make the rest of the window inert.
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

  function containTab(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const elements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
    )).filter(element => element.getClientRects().length > 0);
    const first = elements[0];
    const last = elements[elements.length - 1];
    // Keep Tab inside the dialog instead of advancing to browser chrome.
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <dialog ref={ref} className="dialog" aria-labelledby={titleId} onCancel={onClose} onKeyDown={containTab}>
      <header className="dialog__header">
        <h2 id={titleId}>{title}</h2>
        <IconButton label="Close dialog" onClick={onClose}><X size={16} aria-hidden="true" /></IconButton>
      </header>
      {children}
    </dialog>
  );
}

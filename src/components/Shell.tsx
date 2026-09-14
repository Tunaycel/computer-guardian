import { useEffect, useRef, type ReactNode } from "react";
import type { PageId } from "../domain/navigation";
import { Sidebar } from "./Sidebar";

interface ShellProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  fileAccess: string;
  children: ReactNode;
}

export function Shell({ activePage, onNavigate, fileAccess, children }: ShellProps) {
  const contentRef = useRef<HTMLElement>(null);
  const previousPage = useRef(activePage);
  useEffect(() => {
    if (previousPage.current !== activePage) {
      contentRef.current?.querySelector("h1")?.focus();
      previousPage.current = activePage;
    }
  }, [activePage]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      <main ref={contentRef} id="main-content" tabIndex={-1}>{children}</main>
      <footer className="status-bar"><span>File access: {fileAccess}</span><span>Automatic maintenance: off</span></footer>
    </div>
  );
}

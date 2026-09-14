import type { PageId } from "../domain/navigation";
import { navigationItems } from "../domain/navigation";
import { BrandMark } from "./BrandMark";
import { SidebarItem } from "./SidebarItem";

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <BrandMark />
      <nav>
        <ul className="navigation-list">
          {navigationItems.map(item => (
            <li key={item.id}><SidebarItem item={item} active={item.id === activePage} onNavigate={onNavigate} /></li>
          ))}
        </ul>
      </nav>
      <p className="sidebar__footnote">0.1.0 · Development build</p>
    </aside>
  );
}

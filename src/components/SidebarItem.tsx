import type { NavigationItem, PageId } from "../domain/navigation";

interface SidebarItemProps {
  item: NavigationItem;
  active: boolean;
  onNavigate: (page: PageId) => void;
}

export function SidebarItem({ item: { id, label, icon: Icon }, active, onNavigate }: SidebarItemProps) {
  return (
    <button type="button" className={`nav-item${active ? " nav-item--active" : ""}`}
      onClick={() => onNavigate(id)} aria-current={active ? "page" : undefined}>
      <Icon size={16} aria-hidden="true" /><span>{label}</span>
    </button>
  );
}

import { cx } from "./cx.js";
import { Icon, type IconName } from "./icons.js";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: IconName;
}
export interface NavProps {
  label: string;
  items: readonly NavItem[];
  activeId?: string;
  variant?: "child" | "adult";
  className?: string;
}
/** Routes and active state are supplied by the application. */
export function Nav({ label, items, activeId, variant = "adult", className }: NavProps) {
  return (
    <nav
      aria-label={label}
      data-variant={variant}
      className={cx("st-nav border-line bg-surface", className)}
    >
      <ul className="m-0 flex list-none gap-1 p-2">
        {items.map((item) => (
          <li key={item.id} className="min-w-0 flex-1">
            <a
              href={item.href}
              aria-current={item.id === activeId ? "page" : undefined}
              className={cx(
                "flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-md px-3 py-2 text-center no-underline break-words",
                variant === "child" && "flex-col",
                item.id === activeId
                  ? "bg-primary-tint font-semibold text-primary-ink"
                  : "text-muted",
              )}
            >
              {item.icon && <Icon name={item.icon} />}
              <span className="min-w-0 max-w-full break-words">{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

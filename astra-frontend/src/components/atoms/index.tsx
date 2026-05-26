// src/components/atoms/Tag.tsx
import type { ReactNode } from 'react';
type TagVariant = 'green'|'amber'|'red'|'blue'|'purple'|'teal'|'gray';
export function Tag({ variant, children }: { variant: TagVariant; children: ReactNode }) {
  return <span className={`tag tag-${variant}`}>{children}</span>;
}

// src/components/atoms/StatCard.tsx
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  subVariant?: 'up'|'down'|'warn'|'default';
  fillColor?: string;
  fillPct?: number;
}
export function StatCard({ label, value, sub, subVariant = 'default', fillColor, fillPct }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className={`stat-sub ${subVariant !== 'default' ? subVariant : ''}`}>{sub}</div>}
      {fillColor && fillPct !== undefined && (
        <div className="prog-bar">
          <div className="prog-fill" style={{ width: `${Math.min(fillPct, 100)}%`, background: fillColor }} />
        </div>
      )}
    </div>
  );
}

// src/components/atoms/ActionBtn.tsx
interface ActionBtnProps {
  icon?: string;
  children: ReactNode;
  onClick?: () => void;
}
export function ActionBtn({ icon, children, onClick }: ActionBtnProps) {
  return (
    <button className="action-btn" onClick={onClick}>
      {icon && <i className={`ti ti-${icon}`} aria-hidden="true" />}
      {children}
    </button>
  );
}

// src/components/atoms/FilterBar.tsx
import { useState } from 'react';
interface FilterOption { label: string; value: string }
export function FilterBar({ options, onChange }: { options: FilterOption[]; onChange?: (v: string) => void }) {
  const [active, setActive] = useState(options[0]?.value ?? '');
  const handle = (v: string) => { setActive(v); onChange?.(v); };
  return (
    <div className="filter-bar">
      {options.map(o => (
        <button key={o.value} className={`filter-chip ${active === o.value ? 'active' : ''}`} onClick={() => handle(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// src/components/atoms/SectionHeader.tsx
interface SectionHeaderProps {
  title: string;
  sub?: string;
  action?: ReactNode;
}
export function SectionHeader({ title, sub, action }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        <div className="section-title">{title}</div>
        {sub && <div className="section-sub">{sub}</div>}
      </div>
      {action}
    </div>
  );
}

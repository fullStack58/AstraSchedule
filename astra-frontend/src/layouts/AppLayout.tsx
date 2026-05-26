// src/layouts/AppLayout.tsx
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const nav = [
  { to: '/',           icon: 'home',           label: 'Dashboard',     section: 'Menú' },
  { to: '/horarios',   icon: 'calendar',        label: 'Horarios',      section: '' },
  { to: '/ai',         icon: 'robot',           label: 'Agente IA',     section: '' },
  { to: '/docentes',   icon: 'users',           label: 'Docentes',      section: '' },
  { to: '/salones',    icon: 'building',        label: 'Salones',       section: '' },
  { to: '/grupos',     icon: 'school',          label: 'Grupos',        section: '' },
  { to: '/conflictos', icon: 'alert-triangle',  label: 'Conflictos',    section: 'Análisis', badge: '7' },
  { to: '/analytics',  icon: 'chart-bar',       label: 'Analytics',     section: '' },
  { to: '/config',     icon: 'settings',        label: 'Configuración', section: '' },
];

const pageTitles: Record<string, string> = {
  '/':           'Dashboard',
  '/horarios':   'Horarios',
  '/ai':         'Agente IA',
  '/docentes':   'Docentes',
  '/salones':    'Salones',
  '/grupos':     'Grupos',
  '/conflictos': 'Conflictos',
  '/analytics':  'Analytics',
  '/config':     'Configuración',
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] ?? 'AstraSchedule';

  return (
    <div className="shell">
      {/* ── Sidebar ── */}
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 2L2 14h12L8 2z" />
              <path d="M8 7v3M8 12v.5" />
            </svg>
          </div>
          <div className="logo-text">Astra<span>Schedule</span></div>
        </div>

        <div className="sidebar-nav">
          {nav.map((item, i) => (
            <div key={item.to}>
              {item.section && (
                <div className="nav-label" style={{ marginTop: i > 0 ? 6 : 0 }}>
                  {item.section}
                </div>
              )}
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <i className={`ti ti-${item.icon}`} aria-hidden="true" />
                {item.label}
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </NavLink>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-period-card">
            <div className="period-title">Periodo 2025-1 activo</div>
            <div className="period-desc">78.4% completitud · 32 grupos pendientes.</div>
            <NavLink to="/ai">
              <button className="btn-primary">
                <i className="ti ti-robot" style={{ fontSize: 13 }} aria-hidden="true" />
                Asignar con IA
              </button>
            </NavLink>
          </div>
        </div>
      </nav>

      {/* ── Main ── */}
      <div className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <i className="ti ti-home" aria-hidden="true" />
            <i className="ti ti-chevron-right" aria-hidden="true" />
            <span>{title}</span>
          </div>
          <div className="topbar-right">
            <span className="period-chip">2025-1</span>
            <button className="topbar-icon-btn" aria-label="Notificaciones">
              <i className="ti ti-bell" aria-hidden="true" />
            </button>
            <button className="user-btn" aria-label="Perfil">
              <div className="avatar">JA</div>
              <span className="user-name">Juan Admin</span>
              <i className="ti ti-dots-vertical" style={{ fontSize: 14, color: 'var(--text3)' }} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

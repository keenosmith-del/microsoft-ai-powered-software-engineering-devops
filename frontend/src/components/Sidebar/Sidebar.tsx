import {
  Bot,
  Cloud,
  GitBranch,
  LayoutDashboard,
  Settings,
  ShieldAlert,
  Terminal,
  Wrench,
} from 'lucide-react'
import microsoftMark from '../../assets/microsoft.png'
import './Sidebar.css'

type SidebarItem = {
  label: string
  icon: React.ComponentType<{
    size?: number
    strokeWidth?: number
  }>
  view: string
}

const navigation: SidebarItem[] = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    view: 'overview',
  },
  {
    label: 'Incidents',
    icon: ShieldAlert,
    view: 'incidents',
  },
  {
    label: 'Engineering',
    icon: Terminal,
    view: 'engineering',
  },
  {
    label: 'Actions',
    icon: Wrench,
    view: 'actions',
  },
  {
    label: 'Repository',
    icon: GitBranch,
    view: 'repository',
  },
  {
    label: 'Agents',
    icon: Bot,
    view: 'agents',
  },
  {
    label: 'Azure / Foundry',
    icon: Cloud,
    view: 'azure-foundry',
  },
]

type SidebarProps = {
  activeView: string
  onNavigate: (view: string) => void
}

function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark" aria-hidden="true">
          <img src={microsoftMark} alt="" />
        </div>

        <div className="sidebar-brand-text">
          <span className="sidebar-brand-title">
            AI Engineering
          </span>

          <span className="sidebar-brand-subtitle">
            Operations
          </span>
        </div>
      </div>

      <nav
        className="sidebar-navigation"
        aria-label="Main navigation"
      >
        <div className="sidebar-section-label">
          Platform
        </div>

        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.view

          return (
            <button
              key={item.label}
              type="button"
              className={`sidebar-item ${
                isActive ? 'sidebar-item-active' : ''
              }`}
              onClick={() => onNavigate(item.view)}
            >
              <Icon
                size={18}
                strokeWidth={1.7}
              />

              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className={`sidebar-item ${
            activeView === 'settings'
              ? 'sidebar-item-active'
              : ''
          }`}
          onClick={() => onNavigate('settings')}
        >
          <Settings
            size={18}
            strokeWidth={1.7}
          />

          <span>Settings</span>
        </button>

        <div className="sidebar-status">
          <span className="sidebar-status-indicator" />

          <div>
            <span className="sidebar-status-label">
              System
            </span>

            <span className="sidebar-status-value">
              Operational
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar

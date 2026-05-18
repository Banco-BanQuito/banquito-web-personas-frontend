import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Repeat,
  Building2,
  Menu,
} from 'lucide-react';

const menuItems = [
  { path: '/dashboard',           label: 'Dashboard',     Icon: LayoutDashboard },
  { path: '/clientes',            label: 'Clientes',      Icon: Users },
  { path: '/cuentas/nueva',       label: 'Nueva Cuenta',  Icon: UserPlus },
  { path: '/transacciones/nueva', label: 'Transacciones', Icon: Repeat },
  { path: '/sucursales',          label: 'Sucursales',    Icon: Building2 },
];

const Sidebar = ({ isOpen, onToggle }) => {

  return (
    <aside
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-40 ${
        isOpen ? 'w-56' : 'w-14'
      }`}
    >
      <div className={`flex items-center border-b border-slate-100 h-11 ${isOpen ? 'justify-between px-4' : 'justify-center'}`}>
        {isOpen && (
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 select-none">
            Menú
          </span>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Expandir o contraer menú"
        >
          <Menu size={16} strokeWidth={1.5} color="currentColor" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {menuItems.map(({ path, label, Icon }) => (
          <NavLink
            key={path}
            to={path}
            title={!isOpen ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md transition-colors duration-150 no-underline ${
                isOpen ? 'px-3 py-2.5' : 'justify-center px-0 py-2.5'
              } ${
                isActive
                  ? 'bg-blue-50 text-[#1E40AF]'
                  : 'text-slate-500 hover:bg-blue-50 hover:text-[#1E40AF]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={20}
                  strokeWidth={1.5}
                  color={isActive ? '#1E40AF' : '#4B5563'}
                />
                {isOpen && (
                  <span className={`text-sm whitespace-nowrap tracking-tight font-semibold ${isActive ? 'text-[#1E40AF]' : 'text-[#1E293B]'}`}>
                    {label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {isOpen && (
        <div className="px-4 py-3 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 text-center tracking-wide">Banquito v1.0.0</p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;

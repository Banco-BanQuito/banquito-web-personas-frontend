import { NavLink } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  LayoutDashboard,
  Wallet,
  User,
  Send,
  CalendarDays,
  Menu,
  History,
} from 'lucide-react';

const menuItems = [
  { path: '/dashboard', label: 'Inicio', Icon: LayoutDashboard },
  { path: '/cuentas', label: 'Mis cuentas', Icon: Wallet },
  { path: '/perfil', label: 'Mi perfil', Icon: User },
  { path: '/transferencia', label: 'Transferencia', Icon: Send },
  { path: '/movimientos', label: 'Movimientos', Icon: History },
  { path: '/feriados', label: 'Calendario', Icon: CalendarDays },
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
            title={isOpen ? undefined : label}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md transition-colors duration-150 no-underline ${
                isOpen ? 'px-3 py-2.5' : 'justify-center px-0 py-2.5'
              } ${
                isActive
                  ? 'bg-green-50 text-green-800'
                  : 'text-slate-500 hover:bg-green-50 hover:text-green-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={20}
                  strokeWidth={1.5}
                  color={isActive ? '#166534' : '#4B5563'}
                />

                {isOpen && (
                  <span className={`text-sm whitespace-nowrap tracking-tight font-semibold ${isActive ? 'text-green-800' : 'text-slate-800'}`}>
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
          <p className="text-[10px] text-slate-400 text-center tracking-wide">
            BanQuito Web Personas
          </p>
        </div>
      )}
    </aside>
  );
};

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default Sidebar;
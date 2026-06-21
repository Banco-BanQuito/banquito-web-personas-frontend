import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { getAccountsByCustomerId } from '../api/accountApi';
import {
  User,
  Send,
  CalendarDays,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Wallet,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  MapPin,
} from 'lucide-react';

const modules = [
  {
    title: 'Transferencias',
    description: 'Realiza transferencias hacia otras cuentas BanQuito.',
    path: '/transferencia',
    Icon: Send,
  },
  {
    title: 'Mi perfil',
    description: 'Consulta tus datos principales como cliente BanQuito.',
    path: '/perfil',
    Icon: User,
  },
  {
    title: 'Calendario Bancario',
    description: 'Feriados nacionales y ventanas de mantenimiento programadas.',
    path: '/feriados',
    Icon: CalendarDays,
  },
];

const isActiveStatus = (status) => {
  const v = String(status || '').toUpperCase();
  return v === 'ACTIVA' || v === 'ACTIVE' || v === 'ACTIVO';
};

const BRANCH_NAMES = {
  1: 'Quito Norte',
  2: 'Quito Sur',
  3: 'Centro Histórico',
  4: 'Los Chillos',
  5: 'Sucursal Virtual',
};

export function DashboardPage() {
  const auth = useAuth() || {};
  const { user = {} } = auth;

  const customerId = user?.customerId || user?.id;

  const [accounts, setAccounts] = React.useState([]);
  const [loadingAccounts, setLoadingAccounts] = React.useState(true);
  const [accountsError, setAccountsError] = React.useState('');

  const fetchAccounts = React.useCallback(async () => {
    if (!customerId) {
      setLoadingAccounts(false);
      return;
    }
    setLoadingAccounts(true);
    setAccountsError('');
    try {
      const res = await getAccountsByCustomerId(customerId);
      setAccounts(res.data || []);
    } catch {
      setAccountsError('No se pudo cargar el saldo. Intente recargar.');
    } finally {
      setLoadingAccounts(false);
    }
  }, [customerId]);

  React.useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const totalAvailable = accounts.reduce((s, a) => s + Number(a.availableBalance || 0), 0);
  const totalAccounting = accounts.reduce((s, a) => s + Number(a.accountingBalance || 0), 0);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-r from-green-800 to-green-950 rounded-2xl p-8 text-white shadow-sm">
        <h1 className="text-3xl font-bold">
          Bienvenido, {user?.fullName || user?.username || 'Cliente'}
        </h1>
        <p className="text-green-100 mt-2">
          Aquí tienes un resumen de tu posición financiera consolidada.
        </p>
      </div>

      {/* Panel de saldos consolidados */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">Mis cuentas</h2>
          <button
            onClick={fetchAccounts}
            disabled={loadingAccounts}
            className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-900 font-semibold disabled:opacity-50 transition"
          >
            <RefreshCw size={15} className={loadingAccounts ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>

        {loadingAccounts && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
                <div className="h-8 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!loadingAccounts && accountsError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0" />
            <span>{accountsError}</span>
          </div>
        )}

        {!loadingAccounts && !accountsError && accounts.length === 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-500">
            No tienes cuentas registradas en el Core Bancario.
          </div>
        )}

        {!loadingAccounts && accounts.length > 0 && (
          <>
            {/* Resumen consolidado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-gradient-to-br from-green-700 to-green-900 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <Wallet size={20} />
                  </div>
                  <span className="text-sm font-semibold text-green-100">Saldo Disponible Total</span>
                </div>
                <p className="text-4xl font-black tracking-tight">
                  ${totalAvailable.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-green-200 mt-1">USD · {accounts.length} cuenta{accounts.length === 1 ? '' : 's'}</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                    <TrendingUp size={20} className="text-slate-600" />
                  </div>
                  <span className="text-sm font-semibold text-slate-600">Saldo Contable Total</span>
                </div>
                <p className="text-4xl font-black tracking-tight text-slate-800">
                  ${totalAccounting.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-400 mt-1">USD · saldo en libros</p>
              </div>
            </div>

            {/* Detalle por cuenta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map((acc) => {
                const active = isActiveStatus(acc.status);
                return (
                  <div
                    key={acc.accountId}
                    className={`bg-white rounded-2xl border p-5 ${active ? 'border-slate-200' : 'border-red-200 bg-red-50'}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${active ? 'bg-green-50' : 'bg-red-100'}`}>
                          <CreditCard size={18} className={active ? 'text-green-700' : 'text-red-500'} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 font-mono">{acc.accountNumber}</p>
                          <p className="text-xs text-slate-500">{acc.currency || 'USD'}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
                      }`}>
                        {String(acc.status?.value || acc.status || '').toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Saldo disponible</span>
                        <span className="text-lg font-bold text-slate-900">
                          ${Number(acc.availableBalance || 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Saldo contable</span>
                        <span className="text-sm font-semibold text-slate-600">
                          ${Number(acc.accountingBalance || 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {acc.branchId && (
                        <div className="flex items-center gap-1 pt-1">
                          <MapPin size={11} className="text-slate-400" />
                          <span className="text-xs text-slate-400">
                            {BRANCH_NAMES[acc.branchId] || `Sucursal ${acc.branchId}`}
                          </span>
                        </div>
                      )}
                    </div>

                    {active && (
                      <Link
                        to="/transferencia"
                        className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-900 transition"
                      >
                        <Send size={13} />
                        Transferir desde esta cuenta
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Info del cliente */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <User size={18} className="text-green-800" />
            </div>
            <span className="font-bold text-slate-800">Usuario</span>
          </div>
          <p className="text-slate-500 text-sm">Sesión activa</p>
          <p className="font-semibold text-slate-800">{user?.username || '-'}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <CreditCard size={18} className="text-green-800" />
            </div>
            <span className="font-bold text-slate-800">Tipo</span>
          </div>
          <p className="text-slate-500 text-sm">Clasificación</p>
          <p className="font-semibold text-slate-800">{user?.customerType || '-'}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <ShieldCheck size={18} className="text-green-800" />
            </div>
            <span className="font-bold text-slate-800">Estado</span>
          </div>
          <p className="text-slate-500 text-sm">Cuenta digital</p>
          <p className="font-semibold text-green-700">{user?.customerStatus || 'ACTIVO'}</p>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Accesos rápidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {modules.map(({ path, title, description, Icon }) => (
            <div key={path} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <Icon size={20} className="text-green-800" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800">{title}</h3>
                <p className="text-sm text-slate-500 mt-1">{description}</p>
              </div>
              <Link
                to={path}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-800 hover:text-green-950 transition-colors"
              >
                Acceder <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;

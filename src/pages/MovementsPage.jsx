import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAccountsByCustomerId, getAccountTransactions } from '../api/accountApi';
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

export function MovementsPage() {
  const { user } = useAuth();

  const storedCustomer = JSON.parse(localStorage.getItem('customer') || 'null');
  const storedAuth = JSON.parse(localStorage.getItem('banquito_web_personas_auth') || 'null');
  const customer = user || storedCustomer || storedAuth?.user || null;
  const customerId = customer?.customerId || customer?.id;

  const [accounts, setAccounts] = React.useState([]);
  const [selectedAccountId, setSelectedAccountId] = React.useState('');
  const [transactions, setTransactions] = React.useState([]);
  const [totalElements, setTotalElements] = React.useState(0);
  const [page, setPage] = React.useState(0);
  const [loadingAccounts, setLoadingAccounts] = React.useState(true);
  const [loadingTx, setLoadingTx] = React.useState(false);
  const [error, setError] = React.useState('');

  // Load customer accounts
  React.useEffect(() => {
    if (!customerId) return;
    setLoadingAccounts(true);
    getAccountsByCustomerId(customerId)
      .then((res) => {
        const list = res.data || [];
        setAccounts(list);
        if (list.length > 0) setSelectedAccountId(String(list[0].accountId));
      })
      .catch(() => setError('No se pudieron cargar las cuentas.'))
      .finally(() => setLoadingAccounts(false));
  }, [customerId]);

  // Load transactions when account or page changes
  React.useEffect(() => {
    if (!selectedAccountId) return;
    setLoadingTx(true);
    setError('');
    getAccountTransactions(Number(selectedAccountId), page, PAGE_SIZE)
      .then((res) => {
        setTransactions(res.data?.content || []);
        setTotalElements(res.data?.totalElements || 0);
      })
      .catch(() => setError('No se pudieron cargar los movimientos.'))
      .finally(() => setLoadingTx(false));
  }, [selectedAccountId, page]);

  const totalPages = Math.ceil(totalElements / PAGE_SIZE);

  const handleAccountChange = (e) => {
    setSelectedAccountId(e.target.value);
    setPage(0);
    setTransactions([]);
  };

  const selectedAccount = accounts.find((a) => String(a.accountId) === String(selectedAccountId));

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Movimientos</h1>
        <p className="text-slate-500 mt-1">Historial de transacciones de tus cuentas BanQuito.</p>
      </div>

      {/* Selector de cuenta */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 max-w-3xl">
        <label htmlFor="movements-account-select" className="block text-sm font-medium text-slate-700 mb-2">Seleccionar cuenta</label>

        {loadingAccounts ? (
          <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
        ) : (
          <select
            id="movements-account-select"
            value={selectedAccountId}
            onChange={handleAccountChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-700"
          >
            {accounts.map((acc) => (
              <option key={acc.accountId} value={acc.accountId}>
                {acc.accountNumber} — {acc.status} — Saldo: ${Number(acc.availableBalance).toFixed(2)} {acc.currency}
              </option>
            ))}
          </select>
        )}

        {selectedAccount && (
          <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
            <span>
              Saldo disponible:{' '}
              <span className="font-bold text-slate-800">
                ${Number(selectedAccount.availableBalance).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
              </span>
            </span>
            <span>
              Saldo contable:{' '}
              <span className="font-semibold text-slate-700">
                ${Number(selectedAccount.accountingBalance).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex items-center gap-3 max-w-3xl">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabla de movimientos */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-3xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="font-bold text-slate-800">
            Transacciones
            {totalElements > 0 && (
              <span className="ml-2 text-xs font-medium text-slate-400">({totalElements} en total)</span>
            )}
          </p>

          <button
            onClick={() => {
              setPage(0);
              setTransactions([]);
              setLoadingTx(true);
              getAccountTransactions(Number(selectedAccountId), 0, PAGE_SIZE)
                .then((res) => {
                  setTransactions(res.data?.content || []);
                  setTotalElements(res.data?.totalElements || 0);
                })
                .catch(() => setError('No se pudieron cargar los movimientos.'))
                .finally(() => setLoadingTx(false));
            }}
            disabled={loadingTx}
            className="inline-flex items-center gap-1.5 text-sm text-green-700 hover:text-green-900 font-semibold disabled:opacity-50 transition"
          >
            <RefreshCw size={14} className={loadingTx ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>

        {loadingTx && (
          <div className="divide-y divide-slate-100">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="px-5 py-4 animate-pulse flex items-center gap-4">
                <div className="w-9 h-9 bg-slate-100 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
                <div className="h-5 bg-slate-100 rounded w-20" />
              </div>
            ))}
          </div>
        )}

        {!loadingTx && transactions.length === 0 && !error && (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">
            No hay movimientos registrados para esta cuenta.
          </div>
        )}

        {!loadingTx && transactions.length > 0 && (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const isDebit = tx.movementType === 'DEBITO';
              return (
                <div key={tx.transactionUuid} className="px-5 py-4 flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    isDebit ? 'bg-red-50' : 'bg-green-50'
                  }`}>
                    {isDebit
                      ? <ArrowUpCircle size={20} className="text-red-500" />
                      : <ArrowDownCircle size={20} className="text-green-600" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {tx.description || 'Sin descripción'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDate(tx.transactionDate)}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${isDebit ? 'text-red-600' : 'text-green-700'}`}>
                      {isDebit ? '-' : '+'}${Number(tx.amount).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Saldo: ${Number(tx.resultingBalance).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Página {page + 1} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loadingTx}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || loadingTx}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MovementsPage;

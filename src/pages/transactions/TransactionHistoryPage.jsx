import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTransactionHistory } from '../../api/transactionApi';
import { formatCurrency, formatDateTime } from '../../helpers/formatters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export const TransactionHistoryPage = () => {
  const navigate = useNavigate();
  const { accountNumber: paramAccountNumber } = useParams();

  const [accountNumber, setAccountNumber] = useState(paramAccountNumber || '');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(!!paramAccountNumber);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (paramAccountNumber) {
      fetchTransactions(paramAccountNumber);
    }
  }, [paramAccountNumber]);

  const fetchTransactions = async (account) => {
    setSearching(true);
    setError('');
    setTransactions([]);

    try {
      const response = await getTransactionHistory(account);
      setTransactions(response.data || []);
    } catch (err) {
      let errorMessage = 'Error al cargar transacciones';

      if (err.response?.status === 404) {
        errorMessage = `No se encontraron transacciones para la cuenta: ${account}`;
      } else if (err.response?.status === 400) {
        errorMessage = 'Número de cuenta inválido';
      } else if (!err.response) {
        errorMessage = 'No se puede conectar al servidor';
      } else {
        errorMessage = err.response?.data?.message || errorMessage;
      }

      setError(errorMessage);
      setTransactions([]);
    } finally {
      setSearching(false);
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();

    if (!accountNumber.trim()) {
      setError('Ingrese un número de cuenta');
      return;
    }

    fetchTransactions(accountNumber);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-blue-600 hover:text-blue-800"
      >
        ← Volver
      </button>

      <h1 className="text-3xl font-bold mb-6">Historial de Transacciones</h1>

      <form onSubmit={handleSearch} className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="Número de cuenta"
            className="flex-1 p-2 border rounded"
          />

          <button
            type="submit"
            disabled={searching}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {searching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-gradient-to-br from-orange-50 to-red-50 border-l-4 border-orange-500 p-4 rounded-lg mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-gray-900">Error</p>
              <p className="text-gray-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading && <LoadingSpinner fullPage={false} />}

      {!loading && transactions.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
          <h2 className="text-2xl font-bold mb-4">
            {transactions.length} Transacciones encontradas
          </h2>

          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-3 text-left">Fecha/Hora</th>
                <th className="p-3 text-left">Tipo</th>
                <th className="p-3 text-left">Cuenta Origen</th>
                <th className="p-3 text-left">Cuenta Destino</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-left">Descripción</th>
                <th className="p-3 text-right">Monto</th>
                <th className="p-3 text-right">Saldo Resultante</th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((tx, idx) => {
                const movementType = tx.movementType || tx.type;
                const isDebit = movementType === 'DEBITO';
                const txStatus = tx.status;
                const statusLabel = txStatus === 'COMPLETADA' ? 'Exitoso' : txStatus === 'RECHAZADA' ? 'Rechazado' : txStatus || '—';
                const statusCls = txStatus === 'COMPLETADA' ? 'text-green-700 font-semibold' : txStatus === 'RECHAZADA' ? 'text-red-600 font-semibold' : 'text-gray-600';

                return (
                  <tr key={tx.id ?? tx.transactionUuid ?? idx} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-gray-700">
                      {formatDateTime(tx.transactionDate || tx.date)}
                    </td>

                    <td className="p-3">
                      <span className={isDebit ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                        {movementType}
                      </span>
                    </td>

                    <td className="p-3 font-mono text-xs text-gray-700">
                      {isDebit ? (tx.accountNumber || '—') : (tx.counterpartAccountNumber || '—')}
                    </td>

                    <td className="p-3 font-mono text-xs text-gray-700">
                      {!isDebit ? (tx.accountNumber || '—') : (tx.counterpartAccountNumber || '—')}
                    </td>

                    <td className="p-3"><span className={statusCls}>{statusLabel}</span></td>

                    <td className="p-3 text-gray-700">
                      {tx.message || tx.description || 'Sin descripción'}
                    </td>

                    <td className="p-3 text-right">
                      <span className={isDebit ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                        {isDebit ? '-' : '+'}
                        {formatCurrency(tx.amount)}
                      </span>
                    </td>

                    <td className="p-3 text-right font-semibold">
                      {formatCurrency(tx.resultingBalance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && transactions.length === 0 && !error && (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg text-center">
          <p className="text-gray-600">
            Busque una cuenta para ver el historial de transacciones
          </p>
        </div>
      )}
    </div>
  );
};

export default TransactionHistoryPage;
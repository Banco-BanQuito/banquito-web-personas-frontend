import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCustomer, updateCustomerStatus } from '../../api/customerApi';
import { getAccountsByCustomer, inactivateAccount, suspendAccount } from '../../api/accountApi';
import { formatCurrency } from '../../helpers/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ConfirmModal from '../../components/ui/ConfirmModal';
import BackButton from '../../components/ui/BackButton';

export const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accountsError, setAccountsError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, status: null });
  const [actionError, setActionError] = useState('');
  const [accountsUpdateResult, setAccountsUpdateResult] = useState(null);

  const fetchCustomer = async () => {
    const res = await getCustomer(id);
    setCustomer(res.data);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchCustomer();

        try {
          const accountsResponse = await getAccountsByCustomer(id);
          setAccounts(accountsResponse.data || []);
          setAccountsError('');
        } catch (accountsErr) {
          setAccounts([]);
          setAccountsError(accountsErr.response?.data?.message || 'Error al cargar cuentas del cliente');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error al cargar cliente');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const STATUS_LABELS = {
    ACTIVO: 'Activar',
    INACTIVO: 'Inactivar',
    SUSPENDIDO: 'Suspender',
  };

  const applyStatusToAccounts = async (newStatus) => {
    if (newStatus === 'ACTIVO' || accounts.length === 0) return null;

    const actionFn = newStatus === 'INACTIVO' ? inactivateAccount : suspendAccount;
    const results = await Promise.allSettled(
      accounts.map((acc) => actionFn(acc.accountNumber))
    );

    const failed = [];
    let updated = 0;
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        updated++;
      } else {
        failed.push(accounts[i].accountNumber);
      }
    });

    return { updated, failed };
  };

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    setActionError('');
    setAccountsUpdateResult(null);
    try {
      await updateCustomerStatus(customer.id, newStatus);
      setConfirmModal({ isOpen: false, status: null });

      const result = await applyStatusToAccounts(newStatus);

      await fetchCustomer();

      try {
        const accountsResponse = await getAccountsByCustomer(id);
        setAccounts(accountsResponse.data || []);
      } catch (_) {
        // keep existing accounts list if reload fails
      }

      if (newStatus === 'ACTIVO') {
        setAccountsUpdateResult({
          type: 'info',
          message: 'El cliente ha sido activado. Las cuentas deben reactivarse manualmente si corresponde.',
        });
      } else if (result) {
        setAccountsUpdateResult({
          type: result.failed.length > 0 ? 'warning' : 'success',
          updated: result.updated,
          failed: result.failed,
        });
      }
    } catch (err) {
      setConfirmModal({ isOpen: false, status: null });
      const data = err.response?.data;
      setActionError(
        typeof data === 'string' && !data.includes('<html')
          ? data
          : data?.message || 'Error al cambiar el estado del cliente'
      );
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage={true} />;

  if (error) {
    return (
      <div className="bg-red-100 text-red-800 p-4 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <BackButton to="/clientes" />

      {customer && (
        <>
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h1 className="text-3xl font-bold mb-4">
              {customer.fullName ||
                (customer.firstName ? `${customer.firstName} ${customer.lastName || ''}`.trim() : null) ||
                customer.legalName ||
                customer.businessName ||
                customer.name}
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-gray-600 text-sm">Tipo de Cliente</p>
                <p className="font-semibold">
                  {customer.customerType === 'NATURAL' || customer.type === 'NATURAL' ? 'Persona Natural' :
                   customer.customerType === 'JURIDICO' || customer.type === 'JURIDICO' ? 'Persona Jurídica' :
                   customer.customerType || customer.type}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Identificación</p>
                <p className="font-semibold">{customer.identification}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Email</p>
                <p className="font-semibold">{customer.email}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Teléfono</p>
                <p className="font-semibold">{customer.mobilePhone}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Dirección</p>
                <p className="font-semibold">{customer.address}</p>
              </div>
            </div>
          </div>


          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Cuentas</h2>
              <button
                onClick={() => navigate(`/cuentas/nueva?customerId=${id}`)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                + Nueva Cuenta
              </button>
            </div>

            {accountsError && (
              <div className="bg-red-100 text-red-800 p-4 rounded mb-4">
                {accountsError}
              </div>
            )}

            {accounts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="p-3">Número de Cuenta</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Sucursal</th>
                      <th className="p-3">Saldo</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account.accountNumber} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-semibold">{account.accountNumber || '—'}</td>
                        <td className="p-3">{account.accountSubtypeDescription || account.accountType || '—'}</td>
                        <td className="p-3">{account.branchName || '—'}</td>
                        <td className="p-3">{account.availableBalance != null ? formatCurrency(account.availableBalance) : '—'}</td>
                        <td className="p-3">
                          <StatusBadge status={account.status} />
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => navigate(`/cuentas/${account.accountNumber}`)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600 py-4">No hay cuentas para este cliente</p>
            )}
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Confirmar cambio de estado"
        message={
          confirmModal.status === 'ACTIVO'
            ? '¿Estás seguro de activar este cliente?'
            : `¿Deseas cambiar el estado del cliente a ${confirmModal.status}?`
        }
        onConfirm={() => handleStatusChange(confirmModal.status)}
        onCancel={() => setConfirmModal({ isOpen: false, status: null })}
        confirmText="Sí, cambiar"
        cancelText="Cancelar"
        isLoading={updating}
      />
    </div>
  );
};

export default CustomerDetailPage;

import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { getCustomerByAccount } from '../api/partyApi';
import { getAccountsByCustomerId, transferP2P } from '../api/accountApi';
import { Send, Search, AlertCircle } from 'lucide-react';

export function TransferPage() {
  const { user } = useAuth();

  const storedCustomer = JSON.parse(localStorage.getItem('customer') || 'null');
  const storedAuth = JSON.parse(localStorage.getItem('banquito_web_personas_auth') || 'null');

  const customer = user || storedCustomer || storedAuth?.user || null;
  const customerId = customer?.customerId || customer?.id;

  const [accounts, setAccounts] = React.useState([]);
  const [originAccountId, setOriginAccountId] = React.useState('');
  const [destinationAccount, setDestinationAccount] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [owner, setOwner] = React.useState(null);
  const [validating, setValidating] = React.useState(false);
  const [transferring, setTransferring] = React.useState(false);
  const [loadingAccounts, setLoadingAccounts] = React.useState(true);
  const [transferResult, setTransferResult] = React.useState(null);

  React.useEffect(() => {
    const loadAccounts = async () => {
      setLoadingAccounts(true);
      setMessage('');

      if (!customerId) {
        setMessage('No se encontró el cliente autenticado.');
        setLoadingAccounts(false);
        return;
      }

      try {
        const response = await getAccountsByCustomerId(customerId);
        const accountList = response.data || [];

        setAccounts(accountList);

        if (accountList.length > 0) {
          setOriginAccountId(String(accountList[0].accountId));
        } else {
          setOriginAccountId('');
          setMessage('El cliente autenticado no tiene cuentas disponibles.');
        }
      } catch (error) {
        if (!error.response) {
          setMessage('No se puede conectar al account-core-service. Verifique que el servicio esté encendido.');
        } else {
          setMessage(error.response?.data?.message || 'No se pudieron cargar las cuentas del cliente.');
        }
      } finally {
        setLoadingAccounts(false);
      }
    };

    loadAccounts();
  }, [customerId]);

  const selectedOriginAccount = accounts.find(
    (account) => String(account.accountId) === String(originAccountId)
  );

  const validateTransferForm = () => {
    if (!originAccountId) {
      return 'Seleccione la cuenta origen.';
    }

    if (!destinationAccount.trim()) {
      return 'Ingrese la cuenta destino.';
    }

    if (!owner) {
      return 'Primero debe validar el titular de la cuenta destino.';
    }

    if (!amount || Number(amount) <= 0) {
      return 'Ingrese un monto válido para la transferencia.';
    }

    const numericAmount = Number(amount);

    if (selectedOriginAccount && numericAmount > Number(selectedOriginAccount.availableBalance)) {
      return 'Saldo insuficiente para esta transferencia.';
    }

    return '';
  };

  const buildTransferPayload = () => ({
    originAccountId: Number(originAccountId),
    destinationAccountNumber: destinationAccount.trim(),
    amount: Number(amount),
    transactionUuid: crypto.randomUUID(),
    reference: description.trim() || 'Transferencia P2P Web Personas',
  });

  const updateOriginAccountBalance = (originNewBalance) => {
    setAccounts((prevAccounts) =>
      prevAccounts.map((account) =>
        String(account.accountId) === String(originAccountId)
          ? {
              ...account,
              availableBalance: originNewBalance,
            }
          : account
      )
    );
  };

  const getTransferErrorMessage = (error) => {
    if (!error.response) {
      return 'No se puede conectar al account-core-service. Verifique que el servicio esté encendido.';
    }

    const { status, data } = error.response;

    const errorMessages = {
      400: data?.message || 'Saldo insuficiente o datos inválidos.',
      404: 'La cuenta destino no está disponible o no existe.',
      409: 'Operación duplicada.',
    };

    return errorMessages[status] || data?.message || 'Error temporal, intente en unos minutos.';
  };

  const handleValidateOwner = async () => {
    setMessage('');
    setOwner(null);
    setTransferResult(null);

    if (!originAccountId) {
      setMessage('Primero seleccione la cuenta origen.');
      return;
    }

    if (!destinationAccount.trim()) {
      setMessage('Ingrese una cuenta destino para validar el titular.');
      return;
    }

    if (selectedOriginAccount?.accountNumber === destinationAccount.trim()) {
      setMessage('La cuenta destino no puede ser igual a la cuenta origen.');
      return;
    }

    setValidating(true);

    try {
      const response = await getCustomerByAccount(destinationAccount.trim());
      setOwner(response.data);
      setMessage('Titular validado correctamente.');
    } catch (error) {
      if (!error.response) {
        setMessage('No se puede conectar al party-service. Verifique que el backend esté encendido.');
      } else if (error.response.status === 404) {
        setMessage('La cuenta destino no existe o no tiene un titular disponible.');
      } else {
        setMessage(error.response?.data?.message || 'No se pudo validar el titular de la cuenta.');
      }
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setTransferResult(null);

    const validationMessage = validateTransferForm();

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setTransferring(true);

    try {
      const response = await transferP2P(buildTransferPayload());

      setTransferResult(response.data);
      setMessage('Transferencia realizada correctamente.');
      updateOriginAccountBalance(response.data.originNewBalance);
    } catch (error) {
      setMessage(getTransferErrorMessage(error));
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Transferencia P2P
        </h1>
        <p className="text-slate-500 mt-1">
          Realiza una transferencia hacia otra cuenta BanQuito.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5 max-w-3xl"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Cuenta origen
          </label>

          <select
            value={originAccountId}
            onChange={(event) => {
              setOriginAccountId(event.target.value);
              setOwner(null);
              setTransferResult(null);
              setMessage('');
            }}
            disabled={loadingAccounts || accounts.length === 0}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-700 disabled:bg-slate-100"
          >
            {loadingAccounts && (
              <option value="">Cargando cuentas...</option>
            )}

            {!loadingAccounts && accounts.length === 0 && (
              <option value="">No tiene cuentas disponibles</option>
            )}

            {!loadingAccounts && accounts.map((account) => (
              <option key={account.accountId} value={account.accountId}>
                {account.accountNumber} - Disponible: ${Number(account.availableBalance).toFixed(2)} {account.currency}
              </option>
            ))}
          </select>

          {selectedOriginAccount && (
            <p className="text-xs text-slate-500 mt-2">
              Saldo disponible: ${Number(selectedOriginAccount.availableBalance).toFixed(2)} {selectedOriginAccount.currency}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Cuenta destino
          </label>

          <div className="flex gap-3">
            <input
              type="text"
              value={destinationAccount}
              onChange={(event) => {
                setDestinationAccount(event.target.value);
                setOwner(null);
                setTransferResult(null);
                setMessage('');
              }}
              placeholder="Ejemplo: 2200000002"
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-700"
            />

            <button
              type="button"
              onClick={handleValidateOwner}
              disabled={validating}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-semibold px-5 py-3 rounded-xl transition"
            >
              <Search size={18} />
              {validating ? 'Validando...' : 'Validar'}
            </button>
          </div>
        </div>

        {owner && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-green-800 mb-2">
              Titular encontrado
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-green-900">
              <p><span className="font-medium">Nombre:</span> {owner.fullName}</p>
              <p><span className="font-medium">Cuenta:</span> {owner.accountNumber}</p>
              <p><span className="font-medium">Tipo cliente:</span> {owner.customerType}</p>
              <p><span className="font-medium">Estado cuenta:</span> {owner.accountStatus}</p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Monto
          </label>

          <input
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Descripción
          </label>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ejemplo: Pago arriendo"
            rows={3}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-700 resize-none"
          />
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">
            Resumen
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
            <p><span className="font-medium">Cuenta origen:</span> {selectedOriginAccount?.accountNumber || '-'}</p>
            <p><span className="font-medium">Cuenta destino:</span> {destinationAccount || '-'}</p>
            <p><span className="font-medium">Titular destino:</span> {owner?.fullName || '-'}</p>
            <p><span className="font-medium">Monto:</span> {amount ? `$${Number(amount).toFixed(2)}` : '-'}</p>
            <p className="md:col-span-2"><span className="font-medium">Descripción:</span> {description || '-'}</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={transferring || loadingAccounts}
          className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white font-semibold px-5 py-3 rounded-xl transition"
        >
          <Send size={18} />
          {transferring ? 'Procesando...' : 'Confirmar transferencia'}
        </button>

        {message && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        {transferResult && (
          <div className="bg-green-50 border border-green-200 text-green-900 rounded-xl p-4">
            <p className="font-semibold mb-2">Comprobante de transferencia</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <p><span className="font-medium">Transacción:</span> {transferResult.transactionId}</p>
              <p><span className="font-medium">Estado:</span> {transferResult.status}</p>
              <p><span className="font-medium">Destino:</span> {transferResult.destinationAccountNumber}</p>
              <p><span className="font-medium">Titular:</span> {transferResult.destinationHolderName}</p>
              <p><span className="font-medium">Nuevo saldo:</span> ${Number(transferResult.originNewBalance).toFixed(2)}</p>
              <p><span className="font-medium">Fecha contable:</span> {transferResult.accountingDate}</p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export default TransferPage;
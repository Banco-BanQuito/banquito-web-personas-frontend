import React from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getCustomerByAccount } from '../api/partyApi';
import { getAccountsByCustomerId, transferP2P, transferExternal } from '../api/accountApi';
import { Send, Search, AlertCircle, CheckCircle, Plus, Home, Printer, Landmark } from 'lucide-react';

const switchApi = axios.create({
  baseURL: import.meta.env.VITE_SWITCH_API_BASE_URL || 'http://localhost:8010',
  timeout: Number(import.meta.env.VITE_API_TIMEOUT || 10000),
  headers: {
    ...(import.meta.env.VITE_APIGEE_API_KEY ? { 'x-api-key': import.meta.env.VITE_APIGEE_API_KEY, apikey: import.meta.env.VITE_APIGEE_API_KEY } : {})
  },
});

// crypto.randomUUID() exige contexto seguro (HTTPS); en HTTP plano no existe.
function generateUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // contexto inseguro, sigue con el fallback
    }
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0'));

    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const randomValue = Math.trunc(Math.random() * 16);
    const value = character === 'x' ? randomValue : (randomValue & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function TransferPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

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
  const [originAccountSnapshot, setOriginAccountSnapshot] = React.useState(null);

  const [transferMode, setTransferMode] = React.useState('internal');
  const [banks, setBanks] = React.useState([]);
  const [externalBankCode, setExternalBankCode] = React.useState('');
  const [externalAccountNumber, setExternalAccountNumber] = React.useState('');
  const [beneficiaryFirstName, setBeneficiaryFirstName] = React.useState('');
  const [beneficiaryLastName, setBeneficiaryLastName] = React.useState('');

  const beneficiaryName = `${beneficiaryFirstName.trim()} ${beneficiaryLastName.trim()}`.trim();
  const selectedBank = banks.find((bank) => bank.code === externalBankCode);

  React.useEffect(() => {
    switchApi.get('/api/v2/payments/routing-codes')
      .then((response) => {
        const externalBanks = (response.data || []).filter((bank) => bank.valueString === 'OFF_US');
        setBanks(externalBanks);

        if (externalBanks.length > 0) {
          setExternalBankCode(externalBanks[0].code);
        }
      })
      .catch(() => setBanks([]));
  }, []);

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
        if (error.response) {
          setMessage(error.response?.data?.message || 'No se pudieron cargar las cuentas del cliente.');
        } else {
          setMessage('No se puede conectar al account-core-service. Verifique que el servicio esté encendido.');
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

  const validateExternalTransferForm = () => {
    if (!externalBankCode) {
      return 'Seleccione el banco destino.';
    }

    if (!externalAccountNumber.trim()) {
      return 'Ingrese el número de cuenta externa.';
    }

    if (!beneficiaryFirstName.trim()) {
      return 'Ingrese los nombres del beneficiario.';
    }

    if (!beneficiaryLastName.trim()) {
      return 'Ingrese los apellidos del beneficiario.';
    }

    return '';
  };

  const validateInternalTransferForm = () => {
    if (!destinationAccount.trim()) {
      return 'Ingrese la cuenta destino.';
    }

    if (!owner) {
      return 'Primero debe validar el titular de la cuenta destino.';
    }

    return '';
  };

  const validateTransferModeForm = () => {
    if (transferMode === 'external') {
      return validateExternalTransferForm();
    }

    return validateInternalTransferForm();
  };

  const validateAvailableBalance = () => {
    const numericAmount = Number(amount);

    if (selectedOriginAccount && numericAmount > Number(selectedOriginAccount.availableBalance)) {
      return 'Saldo insuficiente para esta transferencia.';
    }

    return '';
  };

  const validateTransferForm = () => {
    if (!originAccountId) {
      return 'Seleccione la cuenta origen.';
    }

    if (!amount || Number(amount) <= 0) {
      return 'Ingrese un monto válido para la transferencia.';
    }

    const transferModeError = validateTransferModeForm();

    if (transferModeError) {
      return transferModeError;
    }

    return validateAvailableBalance();
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
      setMessage('');
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

  const buildExternalTransferPayload = () => {
    const bank = banks.find((currentBank) => currentBank.code === externalBankCode);

    return {
      originAccountId: Number(originAccountId),
      externalBankCode,
      externalBankName: bank?.name || externalBankCode,
      externalAccountNumber: externalAccountNumber.trim(),
      beneficiaryName: beneficiaryName.trim(),
      amount: Number(amount),
      transactionUuid: generateUuid(),
      reference: description.trim() || 'Transferencia interbancaria Web Personas',
    };
  };

  const buildInternalTransferPayload = () => ({
    originAccountId: Number(originAccountId),
    destinationAccountNumber: destinationAccount.trim(),
    amount: Number(amount),
    transactionUuid: generateUuid(),
    reference: description.trim() || 'Transferencia Web Personas',
  });

  const processExternalTransfer = async () => {
    const payload = buildExternalTransferPayload();
    const response = await transferExternal(payload);

    setTransferResult({
      ...response.data,
      destinationAccountNumber: externalAccountNumber.trim(),
      destinationHolderName: beneficiaryName.trim(),
    });
  };

  const processInternalTransfer = async () => {
    const payload = buildInternalTransferPayload();
    const response = await transferP2P(payload);

    setTransferResult(response.data);
  };

  const processTransfer = async () => {
    if (transferMode === 'external') {
      await processExternalTransfer();
      return;
    }

    await processInternalTransfer();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    const validationMessage = validateTransferForm();

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setTransferring(true);
    setOriginAccountSnapshot(selectedOriginAccount);

    try {
      await processTransfer();
    } catch (error) {
      setMessage(getTransferErrorMessage(error));
    } finally {
      setTransferring(false);
    }
  };

  const handleNewTransfer = () => {
    setTransferResult(null);
    setOriginAccountSnapshot(null);
    setDestinationAccount('');
    setAmount('');
    setDescription('');
    setOwner(null);
    setMessage('');
    setExternalAccountNumber('');
    setBeneficiaryFirstName('');
    setBeneficiaryLastName('');

    const loadAccounts = async () => {
      setLoadingAccounts(true);

      try {
        const response = await getAccountsByCustomerId(customerId);
        setAccounts(response.data || []);
      } catch {
        // ignore
      } finally {
        setLoadingAccounts(false);
      }
    };

    loadAccounts();
  };

  const handlePrint = () => {
    globalThis.print();
  };

  if (transferResult) {
    const originAcc = originAccountSnapshot || selectedOriginAccount;
    const transferDate = new Date();
    const formattedDate = transferDate.toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = transferDate.toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle size={28} className="text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Transferencia exitosa</h1>
            <p className="text-slate-500 text-sm">La transacción fue procesada correctamente.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none">
          <div className="bg-green-700 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-green-100 uppercase tracking-widest">Comprobante Electrónico</p>
                <p className="text-xl font-bold mt-0.5">Transferencia</p>
              </div>
              <div className="text-right text-sm text-green-100">
                <p>{formattedDate}</p>
                <p>{formattedTime}</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">N.º de transacción</p>
              <p className="font-mono text-sm font-bold text-slate-800 break-all">{transferResult.transactionId}</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                <CheckCircle size={14} />
                {transferResult.status || 'COMPLETADA'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">Cuenta origen</p>
                <p className="font-semibold text-slate-800 font-mono">{originAcc?.accountNumber || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">Cuenta destino</p>
                <p className="font-semibold text-slate-800 font-mono">{transferResult.destinationAccountNumber}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">Titular destino</p>
                <p className="font-semibold text-slate-800">{transferResult.destinationHolderName || owner?.fullName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">Fecha contable</p>
                <p className="font-semibold text-slate-800">{transferResult.accountingDate}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">Descripción</p>
                <p className="font-semibold text-slate-800">{description || 'Transferencia Web Personas'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">Canal</p>
                <p className="font-semibold text-slate-800">Web Personas</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">Monto transferido</p>
                <p className="text-3xl font-black text-slate-800">
                  ${Number(amount).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                  <span className="text-base font-medium text-slate-400 ml-1">USD</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">Nuevo saldo disponible</p>
                <p className="text-xl font-bold text-green-700">
                  ${Number(transferResult.originNewBalance ?? transferResult.remainingBalance ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 print:hidden">
          <button
            onClick={handleNewTransfer}
            className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white font-semibold px-5 py-3 rounded-xl transition"
          >
            <Plus size={18} />
            Nueva transferencia
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold px-5 py-3 rounded-xl transition"
          >
            <Home size={18} />
            Ir al inicio
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-5 py-3 rounded-xl transition"
          >
            <Printer size={18} />
            Imprimir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Transferencias</h1>
        <p className="text-slate-500 mt-1">Realiza una transferencia hacia otra cuenta BanQuito o a otro banco.</p>
      </div>

      <div className="flex gap-3 max-w-3xl">
        <button
          type="button"
          onClick={() => { setTransferMode('internal'); setMessage(''); }}
          className={`flex-1 inline-flex items-center justify-center gap-2 font-semibold px-5 py-3 rounded-xl transition border ${
            transferMode === 'internal' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Send size={18} />
          A otra cuenta BanQuito
        </button>
        <button
          type="button"
          onClick={() => { setTransferMode('external'); setMessage(''); }}
          className={`flex-1 inline-flex items-center justify-center gap-2 font-semibold px-5 py-3 rounded-xl transition border ${
            transferMode === 'external' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Landmark size={18} />
          A otro banco
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5 max-w-3xl"
      >
        <div>
          <label htmlFor="transfer-origin-select" className="block text-sm font-medium text-slate-700 mb-2">Cuenta origen</label>
          <select
            id="transfer-origin-select"
            value={originAccountId}
            onChange={(event) => {
              setOriginAccountId(event.target.value);
              setOwner(null);
              setMessage('');
            }}
            disabled={loadingAccounts || accounts.length === 0}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-700 disabled:bg-slate-100"
          >
            {loadingAccounts && <option value="">Cargando cuentas...</option>}
            {!loadingAccounts && accounts.length === 0 && <option value="">No tiene cuentas disponibles</option>}
            {!loadingAccounts && accounts.map((account) => (
              <option key={account.accountId} value={account.accountId}>
                {account.accountNumber} — Disponible: ${Number(account.availableBalance).toFixed(2)} {account.currency}
              </option>
            ))}
          </select>

          {selectedOriginAccount && (
            <p className="text-xs text-slate-500 mt-2">
              Saldo disponible: ${Number(selectedOriginAccount.availableBalance).toFixed(2)} {selectedOriginAccount.currency}
            </p>
          )}
        </div>

        {transferMode === 'external' ? (
          <>
            <div>
              <label htmlFor="transfer-bank-select" className="block text-sm font-medium text-slate-700 mb-2">Banco destino</label>
              <select
                id="transfer-bank-select"
                value={externalBankCode}
                onChange={(event) => setExternalBankCode(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-700"
              >
                {banks.length === 0 && <option value="">Sin bancos disponibles</option>}
                {banks.map((bank) => (
                  <option key={bank.code} value={bank.code}>{bank.name}</option>
                ))}
              </select>
              {selectedBank?.description && (
                <p className="text-xs text-slate-500 mt-2">{selectedBank.description}</p>
              )}
            </div>
            <div>
              <label htmlFor="transfer-external-account-input" className="block text-sm font-medium text-slate-700 mb-2">Número de cuenta externa</label>
              <input
                id="transfer-external-account-input"
                type="text"
                value={externalAccountNumber}
                onChange={(event) => setExternalAccountNumber(event.target.value)}
                placeholder="Cuenta en el banco destino"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-700"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="transfer-beneficiary-firstname-input" className="block text-sm font-medium text-slate-700 mb-2">Nombres del beneficiario</label>
                <input
                  id="transfer-beneficiary-firstname-input"
                  type="text"
                  value={beneficiaryFirstName}
                  onChange={(event) => setBeneficiaryFirstName(event.target.value)}
                  placeholder="Ej. María José"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>
              <div>
                <label htmlFor="transfer-beneficiary-lastname-input" className="block text-sm font-medium text-slate-700 mb-2">Apellidos del beneficiario</label>
                <input
                  id="transfer-beneficiary-lastname-input"
                  type="text"
                  value={beneficiaryLastName}
                  onChange={(event) => setBeneficiaryLastName(event.target.value)}
                  placeholder="Ej. Salazar Vega"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">Se cobrará una comisión fija de $0.60 + IVA sobre la transferencia.</p>
          </>
        ) : (
          <div>
            <label htmlFor="transfer-destination-input" className="block text-sm font-medium text-slate-700 mb-2">Cuenta destino</label>
            <div className="flex gap-3">
              <input
                id="transfer-destination-input"
                type="text"
                value={destinationAccount}
                onChange={(event) => {
                  setDestinationAccount(event.target.value);
                  setOwner(null);
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
        )}

        {transferMode === 'internal' && owner && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-green-800 mb-2">Titular encontrado</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-green-900">
              <p><span className="font-medium">Nombre:</span> {owner.fullName}</p>
              <p><span className="font-medium">Cuenta:</span> {owner.accountNumber}</p>
              <p><span className="font-medium">Tipo cliente:</span> {owner.customerType}</p>
              <p><span className="font-medium">Estado cuenta:</span> {owner.accountStatus}</p>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="transfer-amount-input" className="block text-sm font-medium text-slate-700 mb-2">Monto</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {[10, 20, 50, 80, 100].map((quickAmount) => (
              <button
                key={quickAmount}
                type="button"
                onClick={() => setAmount(String(quickAmount))}
                className={`px-4 py-2 rounded-xl border font-semibold transition ${
                  String(amount) === String(quickAmount)
                    ? 'bg-green-700 text-white border-green-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                ${quickAmount}
              </button>
            ))}
          </div>
          <input
            id="transfer-amount-input"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Otro monto"
            min="0.01"
            step="0.01"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-700"
          />
        </div>

        <div>
          <label htmlFor="transfer-description-textarea" className="block text-sm font-medium text-slate-700 mb-2">Descripción</label>
          <textarea
            id="transfer-description-textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ejemplo: Pago arriendo"
            rows={3}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-700 resize-none"
          />
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">Resumen</p>
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
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </form>
    </div>
  );
}

export default TransferPage;

import { useState, useEffect } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { createCustomer, getCustomerSubtypesByType, searchCustomer } from '../../api/customerApi';
import { validateEmail, validatePhone, validateIdentification, validateRuc } from '../../helpers/validators';
import ConfirmModal from '../../components/ui/ConfirmModal';
import RepresentativeSearchModal from '../../components/customers/RepresentativeSearchModal';

const validateField = (name, value, idType) => {
  switch (name) {
    case 'identificationNumber':
      if (!value) return 'Requerido';
      if (idType === 'RUC' && !validateRuc(value)) {
        return 'Para persona jurídica el RUC debe tener 13 dígitos';
      }
      if (!validateIdentification(idType, value)) {
        if (idType === 'RUC') return 'Para persona jurídica el RUC debe tener 13 dígitos';
        return 'Número inválido para el tipo seleccionado';
      }
      return '';
    case 'email':
      if (!value) return 'Requerido';
      if (!validateEmail(value)) return 'Formato de email inválido';
      return '';
    case 'phone':
      if (!value) return 'Requerido';
      if (!validatePhone(value)) return 'Formato: 09XXXXXXXX o +593XXXXXXXXX';
      return '';
    case 'address':
      if (!value || value.trim().length < 5) return 'Ingrese una dirección válida (mínimo 5 caracteres)';
      return '';
    case 'firstName':
    case 'lastName':
      if (!value || value.trim().length < 2) return 'Requerido (mínimo 2 caracteres)';
      return '';
    case 'birthDate':
      if (!value) return 'Requerida';
      if (new Date(value) >= new Date()) return 'La fecha de nacimiento no puede ser futura';
      return '';
    case 'businessName':
      if (!value || value.trim().length < 3) return 'Razón social requerida (mínimo 3 caracteres)';
      return '';
    case 'incorporationDate':
      if (!value) return 'Requerida';
      if (new Date(value) > new Date()) return 'La fecha de constitución no puede ser futura';
      return '';
    default:
      return '';
  }
};

const today = new Date().toISOString().split('T')[0];

export const CustomerCreatePage = () => {
  const navigate = useNavigate();
  const [customerType, setCustomerType] = useState('NATURAL');
  const [subtypeId, setSubtypeId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showRepModal, setShowRepModal] = useState(false);
  const [selectedRepresentative, setSelectedRepresentative] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [subtypesList, setSubtypesList] = useState([]);

  const [formData, setFormData] = useState({
    identificationType: 'CEDULA',
    identificationNumber: '',
    email: '',
    phone: '',
    address: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    businessName: '',
    incorporationDate: '',
  });

  const blocker = useBlocker(isDirty && !success);

  useEffect(() => {
    if (!customerType) return;
    
    setSubtypeId(''); 
    
    getCustomerSubtypesByType(customerType)
      .then((res) => {
        const list = res.data || [];
        setSubtypesList(list); 
        
        if (list.length > 0) {
          setSubtypeId(list[0].id);
        }
      })
      .catch((err) => {
        console.error("Error cargando subtipos de cliente:", err);
        setSubtypesList([]);
      });
  }, [customerType]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
    if (touched[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: validateField(name, value, name === 'identificationNumber' ? formData.identificationType : undefined),
      }));
    }
  };

  const handleBlur = async (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const formatError = validateField(name, value, name === 'identificationNumber' ? formData.identificationType : undefined);

    if (name === 'identificationNumber' && !formatError && value) {
      try {
        await searchCustomer(formData.identificationType, value);
        setFieldErrors((prev) => ({
          ...prev,
          [name]: `Ya existe un cliente registrado con este ${formData.identificationType}`,
        }));
      } catch (err) {
        setFieldErrors((prev) => ({
          ...prev,
          [name]: err.response?.status === 404 ? '' : formatError,
        }));
      }
    } else {
      setFieldErrors((prev) => ({ ...prev, [name]: formatError }));
    }
  };

  const handleCustomerTypeChange = (newType) => {
    setCustomerType(newType);
    setSelectedRepresentative(null);
    setFieldErrors({});
    setTouched({});
    setFormData(prev => ({
      ...prev,
      identificationType: newType === 'JURIDICO' ? 'RUC' : 'CEDULA',
      identificationNumber: '',
    }));
  };

  const handleSelectRepresentative = (person) => {
    setSelectedRepresentative(person);
    setIsDirty(true);
  };

  const isFormFilled = () => {
    const base =
      formData.identificationNumber &&
      formData.email &&
      formData.phone &&
      formData.address;

    if (customerType === 'NATURAL') {
      return base && formData.firstName && formData.lastName && formData.birthDate;
    }
    return base && formData.businessName && formData.incorporationDate && selectedRepresentative;
  };

  const validateAll = () => {
    const fields =
      customerType === 'NATURAL'
        ? ['identificationNumber', 'email', 'phone', 'address', 'firstName', 'lastName', 'birthDate']
        : ['identificationNumber', 'email', 'phone', 'address', 'businessName', 'incorporationDate'];

    const errors = {};
    fields.forEach((name) => {
      errors[name] = validateField(
        name,
        formData[name],
        name === 'identificationNumber' ? formData.identificationType : undefined,
      );
    });

    setFieldErrors(errors);
    setTouched(Object.fromEntries(fields.map((f) => [f, true])));

    return !Object.values(errors).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateAll()) return;

    if (customerType === 'JURIDICO' && !selectedRepresentative) {
      setServerError('Debe seleccionar un representante legal válido antes de crear la empresa.');
      return;
    }

    setSubmitting(true);
    try {
      if (!subtypeId) {
        setServerError('No se pudo obtener el subtipo de cliente. Intente recargar la página.');
        setSubmitting(false);
        return;
      }

      const payload = {
        customerType: customerType,
        customerSubtypeId: subtypeId,
        identificationType: formData.identificationType,
        identification: formData.identificationNumber,
        email: formData.email,
        mobilePhone: formData.phone,
        address: formData.address,
      };

      if (customerType === 'NATURAL') {
        payload.firstName = formData.firstName;
        payload.lastName = formData.lastName;
        payload.birthDate = formData.birthDate;
      } else {
        payload.legalName = formData.businessName;
        payload.constitutionDate = formData.incorporationDate;
        payload.legalRepresentativeId = selectedRepresentative.id;
      }

      const response = await createCustomer(payload);
      setIsDirty(false);
      setSuccess(true);
      setTimeout(() => navigate(`/clientes/${response.data.id}`), 1500);
    } catch (err) {
      let msg = 'Error al crear cliente';
      if (err.response?.status === 400) {
        msg = err.response?.data?.message || 'Datos inválidos. Verifique que la identificación sea única';
      } else if (err.response?.status === 409) {
        msg = 'Este cliente ya existe en el sistema';
      } else if (err.response?.status === 500) {
        msg = 'Error en el servidor. Intente más tarde';
      } else if (!err.response) {
        msg = 'No se puede conectar al servidor';
      } else {
        msg = err.response?.data?.message || msg;
      }
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (name) =>
    `w-full px-3 py-2.5 border rounded-lg text-sm text-slate-800 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
      fieldErrors[name] && touched[name] ? 'border-red-400 bg-red-50' : 'border-slate-300'
    }`;

  const FieldError = ({ name }) =>
    fieldErrors[name] && touched[name] ? (
      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
        <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {fieldErrors[name]}
      </p>
    ) : null;

  const Required = () => <span className="text-red-500 ml-0.5">*</span>;

  return (
    <>
      <RepresentativeSearchModal
        isOpen={showRepModal}
        onClose={() => setShowRepModal(false)}
        onSelect={handleSelectRepresentative}
      />

      <ConfirmModal
        isOpen={blocker.state === 'blocked'}
        title="¿Descartar cambios?"
        message="Tiene cambios sin guardar en el formulario. ¿Desea salir de todos modos?"
        onConfirm={() => blocker.proceed()}
        onCancel={() => blocker.reset()}
        confirmText="Salir sin guardar"
        cancelText="Continuar editando"
      />

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate('/clientes')}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Volver al listado"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Nuevo Cliente</h1>
            <p className="text-sm text-slate-500 mt-0.5">Complete los datos para registrar el cliente</p>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5 flex items-center gap-3">
            <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-semibold text-green-800">
              Cliente creado exitosamente — Redirigiendo a la ficha del cliente...
            </p>
          </div>
        )}

        {serverError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-800">Error al crear cliente</p>
              <p className="text-sm text-red-700 mt-0.5">{serverError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Tipo de Cliente</p>
            <div className="flex gap-3">
              {['NATURAL', 'JURIDICO'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleCustomerTypeChange(type)}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                    customerType === type
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {type === 'NATURAL' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Persona Natural
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Persona Jurídica
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-5">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Subtipo de Cliente<Required />
              </label>
              <select
                value={subtypeId}
                onChange={(e) => setSubtypeId(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                disabled={subtypesList.length === 0}
              >
                <option value="" disabled>Seleccione un subtipo...</option>
                {subtypesList.map((subtype) => (
                  <option key={subtype.id} value={subtype.id}>
                    {subtype.name}
                  </option>
                ))}
              </select>
            </div>
            
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-4">
              Identificación y Contacto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Tipo de Identificación
                </label>
                {customerType === 'JURIDICO' ? (
                  <div className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600 flex items-center gap-2 cursor-not-allowed select-none">
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    RUC
                    <span className="ml-auto text-xs text-slate-400 font-normal">requerido para empresa</span>
                  </div>
                ) : (
                  <select
                    name="identificationType"
                    value={formData.identificationType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="CEDULA">Cédula</option>
                    <option value="RUC">RUC</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Número de Identificación<Required />
                </label>
                <input
                  type="text"
                  name="identificationNumber"
                  value={formData.identificationNumber}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder={formData.identificationType === 'CEDULA' ? '0000000000' : formData.identificationType === 'RUC' ? '0000000000001' : 'AB123456'}
                  className={inputCls('identificationNumber')}
                />
                <FieldError name="identificationNumber" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email<Required />
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="correo@ejemplo.com"
                  className={inputCls('email')}
                />
                <FieldError name="email" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Teléfono<Required />
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="09XXXXXXXX"
                  className={inputCls('phone')}
                />
                <FieldError name="phone" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Dirección<Required />
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="Av. Principal 123, Ciudad"
                  className={inputCls('address')}
                />
                <FieldError name="address" />
              </div>
            </div>
          </div>

          {customerType === 'NATURAL' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-4">Datos Personales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Nombre<Required />
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="Nombre(s)"
                    className={inputCls('firstName')}
                  />
                  <FieldError name="firstName" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Apellido<Required />
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="Apellido(s)"
                    className={inputCls('lastName')}
                  />
                  <FieldError name="lastName" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Fecha de Nacimiento<Required />
                  </label>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    max={today}
                    className={inputCls('birthDate')}
                  />
                  <FieldError name="birthDate" />
                </div>
              </div>
            </div>
          )}

          {customerType === 'JURIDICO' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-4">Datos Empresariales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Razón Social<Required />
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="Nombre legal completo de la empresa"
                    className={inputCls('businessName')}
                  />
                  <FieldError name="businessName" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Fecha de Constitución<Required />
                  </label>
                  <input
                    type="date"
                    name="incorporationDate"
                    value={formData.incorporationDate}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    max={today}
                    className={inputCls('incorporationDate')}
                  />
                  <FieldError name="incorporationDate" />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">
                      Representante Legal<Required />
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Persona Natural con al menos una cuenta activa en el sistema
                    </p>
                  </div>
                  {selectedRepresentative && (
                    <button
                      type="button"
                      onClick={() => setShowRepModal(true)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors shrink-0"
                    >
                      Cambiar representante
                    </button>
                  )}
                </div>

                {!selectedRepresentative ? (
                  <button
                    type="button"
                    onClick={() => setShowRepModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-4 px-4 border-2 border-dashed border-slate-300 rounded-xl text-sm font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Buscar Representante Legal
                  </button>
                ) : (
                  <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{selectedRepresentative.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedRepresentative.identificationType} · {selectedRepresentative.identification}
                      </p>
                      <p className="text-xs text-green-700 font-semibold mt-1">
                        {selectedRepresentative.accounts?.length ?? 0} cuenta{(selectedRepresentative.accounts?.length ?? 0) !== 1 ? 's' : ''} activa{(selectedRepresentative.accounts?.length ?? 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/clientes')}
              className="sm:w-36 py-2.5 px-4 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={submitting || !isFormFilled()}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creando cliente...
                </span>
              ) : (
                'Crear Cliente'
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CustomerCreatePage;

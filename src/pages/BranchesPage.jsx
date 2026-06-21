import { useEffect, useState } from 'react';
import { Building2, MapPin } from 'lucide-react';
import { getBranches } from '../api/partyApi';

export const BranchesPage = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const response = await getBranches();
        setBranches(response.data || []);
        setError('');
      } catch (err) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('Error loading branches:', err.message);
        }
        setError('No se pudieron cargar las sucursales.');
      } finally {
        setLoading(false);
      }
    };

    loadBranches();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-slate-500">Cargando sucursales...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Sucursales BanQuito
        </h1>
        <p className="text-slate-500 mt-1">
          Consulta las sucursales disponibles para atención al cliente.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          {error}
        </div>
      )}

      {branches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
                  <Building2 size={22} className="text-green-800" />
                </div>

                <div>
                  <h3 className="font-bold text-slate-800">
                    {branch.name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Código: {branch.branchCode}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <MapPin size={18} className="text-green-800" />
                <span>{branch.city}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <p className="text-slate-500">No hay sucursales registradas.</p>
        </div>
      )}
    </div>
  );
};

export default BranchesPage;
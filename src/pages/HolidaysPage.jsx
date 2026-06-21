import React from 'react';
import PropTypes from 'prop-types';
import { getHolidays } from '../api/partyApi';

const isMaintenance = (name) =>
  name?.toLowerCase().startsWith('mantenimiento');

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const STYLE = `
@keyframes bqSlideUp {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes bqPulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.06); }
}
@keyframes bqSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes bqShimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
.bq-card-enter { animation: bqSlideUp 0.45s cubic-bezier(.22,1,.36,1) both; }
.bq-pulse      { animation: bqPulse 2.4s ease-in-out infinite; }
.bq-shimmer {
  background: linear-gradient(90deg,
    rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%
  );
  background-size: 200% auto;
  animation: bqShimmer 2s linear infinite;
}
`;

function parseDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatFull(dateStr) {
  const date = parseDate(dateStr);
  return `${DAYS_ES[date.getDay()]} ${date.getDate()} de ${MONTHS_ES[date.getMonth()]} ${date.getFullYear()}`;
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseDate(dateStr);
  return Math.ceil((target - today) / 86400000);
}

function getCardBackground(maintenance, isUpcoming) {
  if (maintenance) {
    return 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
  }

  if (isUpcoming) {
    return 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
  }

  return '#ffffff';
}

function getBorderColor(maintenance, isUpcoming) {
  if (maintenance) {
    return '#fcd34d';
  }

  if (isUpcoming) {
    return '#86efac';
  }

  return '#e2e8f0';
}

function getIconBackground(maintenance, isUpcoming) {
  if (maintenance) {
    return 'linear-gradient(135deg, #f59e0b, #d97706)';
  }

  if (isUpcoming) {
    return 'linear-gradient(135deg, #22c55e, #16a34a)';
  }

  return 'linear-gradient(135deg, #94a3b8, #64748b)';
}

function getHolidayIcon(holidayName) {
  const name = holidayName.toLowerCase();

  if (name.includes('navidad')) return '🎄';
  if (name.includes('año nuevo') || name.includes('2027')) return '🎆';
  if (name.includes('carnaval')) return '🎉';
  if (name.includes('trabajo')) return '⚒️';
  if (name.includes('pichincha') || name.includes('independencia') || name.includes('bolívar')) return '🇪🇨';
  if (name.includes('difuntos')) return '🕯️';
  if (name.includes('santo') || name.includes('santa')) return '✝️';

  return '📅';
}

function getCardIcon(maintenance, holidayName) {
  if (maintenance) {
    return '🔧';
  }

  return getHolidayIcon(holidayName);
}

function getBadgeBackground(maintenance) {
  if (maintenance) {
    return '#fef3c7';
  }

  return '#f0fdf4';
}

function getBadgeColor(maintenance) {
  if (maintenance) {
    return '#92400e';
  }

  return '#166534';
}

function getGlowLineColor(maintenance) {
  if (maintenance) {
    return '#f59e0b';
  }

  return '#22c55e';
}

function getFilterBackground(isSelected) {
  if (isSelected) {
    return 'linear-gradient(135deg, #166534, #15803d)';
  }

  return '#ffffff';
}

function getFilterColor(isSelected) {
  if (isSelected) {
    return '#ffffff';
  }

  return '#475569';
}

function getFilterBorder(isSelected) {
  if (isSelected) {
    return 'none';
  }

  return '1px solid #e2e8f0';
}

function getFilterBoxShadow(isSelected) {
  if (isSelected) {
    return '0 4px 12px rgba(22,101,52,0.25)';
  }

  return 'none';
}

function getFilterTransform(isSelected) {
  if (isSelected) {
    return 'scale(1.03)';
  }

  return 'scale(1)';
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="h-20 rounded-2xl bg-slate-100 overflow-hidden relative">
          <div className="bq-shimmer absolute inset-0" />
        </div>
      ))}
    </div>
  );
}

function CountdownBadge({ dateStr }) {
  const diff = daysUntil(dateStr);

  if (diff < 0) {
    return <span className="text-xs text-slate-400 font-medium">Pasado</span>;
  }

  if (diff === 0) {
    return (
      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500 text-white bq-pulse">
        ¡Hoy!
      </span>
    );
  }

  if (diff <= 7) {
    return (
      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-400 text-amber-900">
        En {diff} día{diff === 1 ? '' : 's'}
      </span>
    );
  }

  if (diff <= 30) {
    return (
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
        En {diff} días
      </span>
    );
  }

  return <span className="text-xs text-slate-400 font-medium">{diff} días</span>;
}

CountdownBadge.propTypes = {
  dateStr: PropTypes.string.isRequired,
};

const holidayShape = PropTypes.shape({
  name: PropTypes.string,
  holidayDate: PropTypes.string,
});

function HolidayCard({ holiday, index }) {
  const maintenance = isMaintenance(holiday.name);
  const diff = daysUntil(holiday.holidayDate);
  const isPast = diff < 0;
  const isUpcoming = diff >= 0 && diff <= 30;

  const displayName = maintenance
    ? holiday.name.replace('Mantenimiento: ', '')
    : holiday.name;

  const cardBackground = getCardBackground(maintenance, isUpcoming);
  const borderColor = getBorderColor(maintenance, isUpcoming);
  const iconBackground = getIconBackground(maintenance, isUpcoming);
  const icon = getCardIcon(maintenance, holiday.name);
  const badgeBackground = getBadgeBackground(maintenance);
  const badgeColor = getBadgeColor(maintenance);
  const glowLineColor = getGlowLineColor(maintenance);

  return (
    <div
      className="bq-card-enter group relative flex items-center gap-4 rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        animationDelay: `${index * 55}ms`,
        opacity: isPast ? 0.55 : 1,
        background: cardBackground,
        borderColor,
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-transform duration-300 group-hover:scale-110"
        style={{ background: iconBackground }}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{
              background: badgeBackground,
              color: badgeColor,
            }}
          >
            {maintenance ? 'Mantenimiento' : 'Feriado'}
          </span>
          {isPast && <span className="text-xs text-slate-400">• Pasado</span>}
        </div>
        <p className="font-bold text-slate-800 text-sm leading-tight truncate">{displayName}</p>
        <p className="text-xs text-slate-500 mt-0.5">{formatFull(holiday.holidayDate)}</p>
      </div>

      <div className="shrink-0">
        <CountdownBadge dateStr={holiday.holidayDate} />
      </div>

      {isUpcoming && !isPast && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ background: glowLineColor }}
        />
      )}
    </div>
  );
}

HolidayCard.propTypes = {
  holiday: holidayShape.isRequired,
  index: PropTypes.number.isRequired,
};

function FilterButton({ item, filter, onSelect }) {
  const { key, label, count } = item;
  const isSelected = filter === key;

  return (
    <button
      key={key}
      onClick={() => onSelect(key)}
      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200"
      style={{
        background: getFilterBackground(isSelected),
        color: getFilterColor(isSelected),
        border: getFilterBorder(isSelected),
        boxShadow: getFilterBoxShadow(isSelected),
        transform: getFilterTransform(isSelected),
      }}
    >
      {label}
      <span className="text-xs opacity-70">({count})</span>
    </button>
  );
}

FilterButton.propTypes = {
  item: PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string,
    count: PropTypes.number,
  }).isRequired,
  filter: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};

function NextHolidayCard({ holiday }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 text-white"
      style={{ background: 'linear-gradient(135deg, #16a34a 0%, #166534 100%)' }}
    >
      <div className="bq-shimmer absolute inset-0 opacity-30" />
      <p className="text-xs font-bold uppercase tracking-widest text-green-200 mb-1">
        Próximo feriado
      </p>
      <p className="text-xl font-black leading-tight">{holiday.name}</p>
      <p className="text-sm text-green-100 mt-1">{formatFull(holiday.holidayDate)}</p>
      <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-xs font-bold">
        📅 En {daysUntil(holiday.holidayDate)} días
      </div>
    </div>
  );
}

NextHolidayCard.propTypes = {
  holiday: holidayShape.isRequired,
};

function NextMaintenanceCard({ holiday }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 text-white"
      style={{ background: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)' }}
    >
      <div className="bq-shimmer absolute inset-0 opacity-30" />
      <p className="text-xs font-bold uppercase tracking-widest text-amber-200 mb-1">
        Próximo mantenimiento
      </p>
      <p className="text-xl font-black leading-tight">
        {holiday.name.replace('Mantenimiento: ', '')}
      </p>
      <p className="text-sm text-amber-100 mt-1">{formatFull(holiday.holidayDate)}</p>
      <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-xs font-bold">
        🔧 En {daysUntil(holiday.holidayDate)} días
      </div>
    </div>
  );
}

NextMaintenanceCard.propTypes = {
  holiday: holidayShape.isRequired,
};

function StatsBar({ holidays, totalF, totalM }) {
  return (
    <div className="flex gap-3 flex-wrap bq-card-enter" style={{ animationDelay: '130ms' }}>
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
        <span className="text-lg">📅</span>
        <div>
          <p className="text-xs text-slate-400 font-medium leading-none">Total días</p>
          <p className="text-lg font-black text-slate-800 leading-tight">{holidays.length}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
        <span className="text-lg">🇪🇨</span>
        <div>
          <p className="text-xs text-green-700 font-medium leading-none">Feriados</p>
          <p className="text-lg font-black text-green-800 leading-tight">{totalF}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
        <span className="text-lg">🔧</span>
        <div>
          <p className="text-xs text-amber-700 font-medium leading-none">Mantenimientos</p>
          <p className="text-lg font-black text-amber-800 leading-tight">{totalM}</p>
        </div>
      </div>
    </div>
  );
}

StatsBar.propTypes = {
  holidays: PropTypes.arrayOf(holidayShape).isRequired,
  totalF: PropTypes.number.isRequired,
  totalM: PropTypes.number.isRequired,
};

export function HolidaysPage() {
  const [holidays, setHolidays] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [filter, setFilter] = React.useState('todos');

  React.useEffect(() => {
    getHolidays()
      .then((response) => setHolidays(response.data || []))
      .catch(() => setError('No se pudieron cargar los datos.'))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const nextHoliday = holidays.find((holiday) => holiday.holidayDate >= today && !isMaintenance(holiday.name));
  const nextMaintenance = holidays.find((holiday) => holiday.holidayDate >= today && isMaintenance(holiday.name));

  const filtered = holidays.filter((holiday) => {
    if (filter === 'feriado') {
      return !isMaintenance(holiday.name);
    }

    if (filter === 'mantenimiento') {
      return isMaintenance(holiday.name);
    }

    return true;
  });

  const byYear = filtered.reduce((accumulator, holiday) => {
    const year = holiday.holidayDate.slice(0, 4);
    accumulator[year] = accumulator[year] || [];
    accumulator[year].push(holiday);
    return accumulator;
  }, {});

  const totalF = holidays.filter((holiday) => !isMaintenance(holiday.name)).length;
  const totalM = holidays.filter((holiday) => isMaintenance(holiday.name)).length;

  const filterItems = [
    { key: 'todos', label: '✦ Todos', count: holidays.length },
    { key: 'feriado', label: '🇪🇨 Feriados', count: totalF },
    { key: 'mantenimiento', label: '🔧 Mantenimiento', count: totalM },
  ];

  return (
    <>
      <style>{STYLE}</style>

      <div className="space-y-8 max-w-3xl">
        <div className="bq-card-enter">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Calendario Bancario</h1>
          <p className="text-slate-500 mt-1">
            Días no hábiles, feriados nacionales y ventanas de mantenimiento.
          </p>
        </div>

        {!loading && (nextHoliday || nextMaintenance) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bq-card-enter" style={{ animationDelay: '80ms' }}>
            {nextHoliday && <NextHolidayCard holiday={nextHoliday} />}
            {nextMaintenance && <NextMaintenanceCard holiday={nextMaintenance} />}
          </div>
        )}

        {!loading && <StatsBar holidays={holidays} totalF={totalF} totalM={totalM} />}

        <div className="flex gap-2 bq-card-enter" style={{ animationDelay: '160ms' }}>
          {filterItems.map((item) => (
            <FilterButton
              key={item.key}
              item={item}
              filter={filter}
              onSelect={setFilter}
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
            {error}
          </div>
        )}

        {loading && <Skeleton />}

        {!loading && Object.keys(byYear).sort((a, b) => a.localeCompare(b)).map((year, yearIndex) => (
          <div
            key={year}
            className="bq-card-enter space-y-3"
            style={{ animationDelay: `${200 + yearIndex * 60}ms` }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-slate-200 select-none">{year}</span>
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400 font-medium">{byYear[year].length} días</span>
            </div>

            {byYear[year].map((holiday, index) => (
              <HolidayCard
                key={holiday.holidayDate}
                holiday={holiday}
                index={index + yearIndex * 10}
              />
            ))}
          </div>
        ))}

        {!loading && filtered.length === 0 && !error && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-5xl mb-3">📭</p>
            <p className="font-semibold">No hay días registrados para este filtro.</p>
          </div>
        )}
      </div>
    </>
  );
}

export default HolidaysPage;

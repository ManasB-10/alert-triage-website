import { useAlerts } from '@/context/AlertContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#e84057',
  high: '#e87f35',
  medium: '#e8a735',
  low: '#38bdf8',
  info: '#6b7280',
};

const STATUS_COLORS: Record<string, string> = {
  new: '#e84057',
  claimed: '#e8a735',
  investigating: '#38bdf8',
  closed: '#22c55e',
};

const AlertsChart = () => {
  const { alerts } = useAlerts();

  const severityOrder = ['critical', 'high', 'medium', 'low'];

  const severityData = Object.entries(
    alerts.reduce((acc, a) => {
      if (a.severity === 'info') return acc;
      return { ...acc, [a.severity]: (acc[a.severity] || 0) + 1 };
    }, {} as Record<string, number>)
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => severityOrder.indexOf(a.name) - severityOrder.indexOf(b.name));

  const sourceData = Object.entries(
    alerts.reduce((acc, a) => ({ ...acc, [a.source]: (acc[a.source] || 0) + 1 }), {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Severity Distribution */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4">Severity Distribution</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={severityData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                {severityData.map((entry) => (
                  <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || '#6b7280'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(220 18% 12%)', border: '1px solid hsl(220 15% 18%)', borderRadius: '8px', color: '#e0e0e0', fontSize: '12px', fontFamily: 'JetBrains Mono' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
          {severityData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[entry.name] }} />
              <span className="text-muted-foreground font-mono uppercase">{entry.name}</span>
              <span className="text-foreground font-bold">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts by Source */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4">Alerts by Source</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sourceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 18%)" />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }} width={120} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(220 18% 12%)', border: '1px solid hsl(220 15% 18%)', borderRadius: '8px', color: '#e0e0e0', fontSize: '12px', fontFamily: 'JetBrains Mono' }} />
              <Bar dataKey="value" fill="hsl(160 100% 45%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AlertsChart;

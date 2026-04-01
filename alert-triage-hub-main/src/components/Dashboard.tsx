import React, { useState, useEffect } from 'react';
import StatsCards from './StatsCards';

const Dashboard = () => {
  const [allAlerts, setAllAlerts] = useState([]);
  const [activeFilter, setActiveFilter] = useState('new');

  // Fetch all alerts from MySQL via Python API [cite: 19, 21]
  const loadData = () => {
    fetch('http://localhost:5000/api/alerts')
      .then(res => res.json())
      .then(data => setAllAlerts(data))
      .catch(err => console.error("Database connection error:", err));
  };

  useEffect(() => { loadData(); }, []);

  // Filter alerts based on active tab [cite: 9]
  const displayData = allAlerts.filter(a => a.status === activeFilter);

  // Claim Logic: Update Status in MySQL [cite: 10, 23]
  const handleClaim = (alertId) => {
    fetch('http://localhost:5000/api/claim-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alert_id: alertId, user_id: 1 }) // user_id 1 is Analyst
    })
    .then(() => loadData()); // Refresh table after claiming
  };

  return (
    <div className="p-6 space-y-6">
      <StatsCards 
        alerts={allAlerts} 
        onFilterChange={setActiveFilter} 
        activeFilter={activeFilter} 
      />

      <div className="rounded-lg border bg-card">
        <table className="w-full text-left">
          <thead className="border-b bg-muted/50">
            <tr className="text-xs uppercase font-mono">
              <th className="p-4">Source IP</th>
              <th className="p-4">Event</th>
              <th className="p-4">Severity</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {displayData.map(alert => (
              <tr key={alert.id} className="border-b hover:bg-muted/20">
                <td className="p-4 font-mono">{alert.source_ip}</td>
                <td className="p-4">{alert.event_type}</td>
                <td className={`p-4 font-bold ${alert.severity === 'Critical' ? 'text-destructive' : 'text-warning'}`}>
                  {alert.severity}
                </td>
                <td className="p-4">
                  {alert.status === 'new' && (
                    <button 
                      onClick={() => handleClaim(alert.id)}
                      className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm hover:opacity-90"
                    >
                      Claim
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
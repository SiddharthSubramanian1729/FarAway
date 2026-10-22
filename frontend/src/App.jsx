import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import OrbitalTracker from './components/OrbitalTracker';
import ThermalGrid from './components/ThermalGrid';
import PowerControl from './components/PowerControl';
import CommsRelay from './components/CommsRelay';
import AgentCopilot from './components/AgentCopilot';
import OperationsConsole from './components/OperationsConsole';
import EventLog from './components/EventLog';
import { createInitialTelemetry, createInitialStatus, buildStatusFromTelemetry, stepTelemetry } from './lib/simulation';

export default function App() {
  const [telemetry, setTelemetry] = useState(() => createInitialTelemetry());
  const [status, setStatus] = useState(() => createInitialStatus());
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((prev) => {
        const next = stepTelemetry(prev);
        setStatus(buildStatusFromTelemetry(next));
        setLogs((currentLogs) => {
          const nextLogs = [...currentLogs];
          if (nextLogs.length > 18) nextLogs.shift();
          nextLogs.push({
            time: new Date().toLocaleTimeString(),
            type: next.thermal.thermal_alert_level > 0 ? 'warning' : 'info',
            message: next.thermal.thermal_alert_level > 0
              ? 'Thermal hotspot detected in cluster node 7.'
              : 'Telemetry stream healthy and workload scheduler nominal.',
          });
          return nextLogs;
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleReset = async () => {
    const resetTelemetry = createInitialTelemetry();
    setTelemetry(resetTelemetry);
    setStatus(createInitialStatus(resetTelemetry));
    setLogs([]);
  };

  const handleSetSpeed = async (factor) => {
    console.log('Simulation speed set to', factor);
  };

  const handleInjectFault = async (failureType) => {
    setTelemetry((prev) => {
      const next = {
        ...prev,
        faults: [
          ...(prev.faults || []),
          {
            name: failureType.toUpperCase().replace(/_/g, ' '),
            subsystem: 'BUS',
            severity: 'MEDIUM',
            remaining_s: 12,
          },
        ],
      };
      setStatus(buildStatusFromTelemetry(next));
      return next;
    });
  };

  const handleToggleWorkload = async (name, isCurrentlyActive) => {
    setTelemetry((prev) => {
      const nextWorkloads = (prev.scheduler?.workloads ?? []).map((workload) =>
        workload.name === name ? { ...workload, status: isCurrentlyActive ? 'paused' : 'active' } : workload
      );
      const next = {
        ...prev,
        scheduler: {
          ...prev.scheduler,
          workloads: nextWorkloads,
        },
      };
      setStatus(buildStatusFromTelemetry(next));
      return next;
    });
  };

  const isAlertActive = telemetry?.thermal?.emergency_shutdown || 
                        telemetry?.power?.alerts?.critical_power || 
                        (telemetry?.faults && telemetry.faults.length > 0);

  return (
    <div style={{ minHeight: '100vh', width: '100%' }}>
      {isAlertActive && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          boxShadow: 'inset 0 0 80px rgba(255, 0, 60, 0.15)',
          pointerEvents: 'none',
          zIndex: 999,
          animation: 'pulse-glow 2s infinite ease-in-out'
        }} />
      )}

      <div className="dashboard-container">
        <Header 
          telemetry={telemetry} 
          status={status} 
          isConnected={isConnected} 
          onReset={handleReset} 
          onSetSpeed={handleSetSpeed}
          apiBase=""
        />

        <OrbitalTracker telemetry={telemetry} />
        <ThermalGrid telemetry={telemetry} />

        <PowerControl telemetry={telemetry} />
        <CommsRelay telemetry={telemetry} apiBase="" />

        <OperationsConsole 
          telemetry={telemetry} 
          apiBase="" 
          onInjectFault={handleInjectFault}
          onToggleWorkload={handleToggleWorkload}
        />
        <AgentCopilot telemetry={telemetry} apiBase="" />
        <EventLog logs={logs} />
      </div>
    </div>
  );
}

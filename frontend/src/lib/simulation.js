const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createInitialTelemetry() {
  return {
    timestamp: new Date().toISOString(),
    mission_days: 12.4,
    sim_elapsed_s: 86400,
    orbit: {
      is_sunlit: true,
      latitude: -8.2,
      longitude: 102.4,
      altitude_km: 410,
      orbit_type: 'SSO (Dawn-Dusk)',
      debris_warning: false,
    },
    sunlight: {
      eclipse_state: 'FULL_SUN',
      solar_flux_w_m2: 1365,
      sunlight_availability_pct: 94,
      eclipse_duration_minutes: 0,
    },
    adcs: {
      attitude_mode: 'SCIENCE_MODE',
      solar_efficiency_pct: 92,
      radiator_view_factor: 0.78,
      antenna_alignment_pct: 88,
      reaction_wheel_momentum_pct: 34,
      alerts: {
        safe_mode: false,
        thermal_priority: false,
        debris_avoidance: false,
      },
    },
    power: {
      solar_generation_kw: 48.2,
      total_demand_kw: 36.4,
      net_power_kw: 11.8,
      battery_charge_pct: 82.6,
      supercap_charge_pct: 74.2,
      power_survivability_hours: 7.8,
      recommended_power_state: 'NOMINAL',
      alerts: {
        low_power: false,
        critical_power: false,
        safe_mode: false,
        emergency_shutdown: false,
      },
    },
    thermal: {
      node_temperatures_c: Array.from({ length: 20 }, (_, index) => 22.4 + (index % 3) * 0.3),
      avg_cluster_temp_c: 24.8,
      max_node_temp_c: 27.3,
      radiator_temp_c: 14.6,
      coolant_quality: 0.18,
      loop_a_health_pct: 94,
      loop_b_health_pct: 91,
      pcm_charge_pct: 69,
      thermal_headroom_pct: 41,
      predicted_temp_10min_c: 25.1,
      thermal_runaway_risk_pct: 7,
      thermal_alert_level: 0,
      emergency_shutdown: false,
    },
    comms: {
      link_quality_pct: 91,
      bandwidth_gbps: 18.2,
      latency_ms: 27.5,
      packet_loss_pct: 1.4,
      recommended_link_state: 'NOMINAL',
    },
    scheduler: {
      gpu_load_kw: 34.2,
      workloads: [
        { name: 'Wildfire Detection', status: 'active', priority: 1, power_usage: 12.4, heat_generation: 6.5 },
        { name: 'Flood Prediction', status: 'active', priority: 2, power_usage: 9.3, heat_generation: 4.8 },
        { name: 'Climate Monitoring', status: 'active', priority: 3, power_usage: 7.1, heat_generation: 3.4 },
      ],
    },
    faults: [],
  };
}

export function createInitialStatus(telemetry = createInitialTelemetry()) {
  return {
    satellite: {
      temperature: telemetry.thermal.avg_cluster_temp_c,
      battery: telemetry.power.battery_charge_pct,
      healthy_gpus: 8,
    },
    telemetry,
    missions: [
      { name: 'Wildfire Detection', status: 'active', progress: 58 },
      { name: 'Flood Prediction', status: 'active', progress: 64 },
      { name: 'Climate Monitoring', status: 'active', progress: 47 },
    ],
    logs: [],
    health_score: 92,
    physics_sync: {
      loop_a_health_pct: telemetry.thermal.loop_a_health_pct,
      active_faults: telemetry.faults,
    },
  };
}

export function buildStatusFromTelemetry(telemetry) {
  const healthScore = clamp(
    100
      - telemetry.thermal.thermal_alert_level * 8
      - telemetry.faults.length * 6
      - (telemetry.power.alerts.critical_power ? 18 : 0)
      - (telemetry.power.battery_charge_pct < 25 ? 10 : 0),
    0,
    100
  );

  return {
    satellite: {
      temperature: telemetry.thermal.avg_cluster_temp_c,
      battery: telemetry.power.battery_charge_pct,
      healthy_gpus: 8,
    },
    telemetry,
    missions: [
      { name: 'Wildfire Detection', status: 'active', progress: 58 },
      { name: 'Flood Prediction', status: 'active', progress: 64 },
      { name: 'Climate Monitoring', status: 'active', progress: 47 },
    ],
    logs: [],
    health_score: healthScore,
    physics_sync: {
      loop_a_health_pct: telemetry.thermal.loop_a_health_pct,
      active_faults: telemetry.faults,
    },
  };
}

export function stepTelemetry(previous) {
  const base = previous ?? createInitialTelemetry();
  const nextOrbitLatitude = clamp(base.orbit.latitude + 0.18, -90, 90);
  const nextOrbitLongitude = (base.orbit.longitude + 0.43) % 360;
  const nextSolarFlux = clamp(base.sunlight.solar_flux_w_m2 + (base.sunlight.eclipse_state === 'FULL_SUN' ? 3 : -2), 1200, 1400);
  const nextBattery = clamp(base.power.battery_charge_pct + 0.2 + (base.power.net_power_kw > 0 ? 0.15 : -0.05), 10, 100);
  const nextSupercap = clamp(base.power.supercap_charge_pct + 0.08, 0, 100);
  const nextAvgTemp = clamp(base.thermal.avg_cluster_temp_c + 0.06 + (base.thermal.thermal_alert_level > 0 ? 0.2 : 0), 18, 45);
  const nextNodeTemps = base.thermal.node_temperatures_c.map((temp, index) => clamp(temp + (index % 2 === 0 ? 0.04 : -0.03), 18, 42));
  const nextLinkQuality = clamp(base.comms.link_quality_pct + 0.1, 60, 100);
  const nextBandwidth = clamp(base.comms.bandwidth_gbps + 0.02, 10, 25);
  const nextLatency = clamp(base.comms.latency_ms + (base.comms.link_quality_pct < 80 ? 0.4 : -0.2), 20, 60);

  const nextSchedulerWorkloads = (base.scheduler.workloads ?? []).map((workload, index) => ({
    ...workload,
    power_usage: clamp(workload.power_usage + (index % 2 === 0 ? 0.02 : -0.01), 4, 16),
    heat_generation: clamp(workload.heat_generation + (index % 2 === 0 ? 0.01 : -0.01), 2.5, 8),
  }));

  const nextGpuLoad = clamp(base.scheduler.gpu_load_kw + 0.2, 20, 55);

  return {
    ...base,
    timestamp: new Date().toISOString(),
    mission_days: Number((base.mission_days + 0.001).toFixed(4)),
    sim_elapsed_s: Number((base.sim_elapsed_s + 60).toFixed(1)),
    orbit: {
      ...base.orbit,
      latitude: nextOrbitLatitude,
      longitude: nextOrbitLongitude,
      is_sunlit: base.sunlight.eclipse_state === 'FULL_SUN',
    },
    sunlight: {
      ...base.sunlight,
      solar_flux_w_m2: nextSolarFlux,
      sunlight_availability_pct: clamp(base.sunlight.sunlight_availability_pct + (base.sunlight.eclipse_state === 'FULL_SUN' ? 0.2 : -0.4), 70, 100),
      eclipse_duration_minutes: base.sunlight.eclipse_state === 'FULL_SUN' ? 0 : 18,
    },
    adcs: {
      ...base.adcs,
      solar_efficiency_pct: clamp(base.adcs.solar_efficiency_pct + 0.12, 70, 100),
      radiator_view_factor: clamp(base.adcs.radiator_view_factor + (base.thermal.avg_cluster_temp_c > 26 ? 0.007 : -0.003), 0.4, 0.95),
      antenna_alignment_pct: clamp(base.adcs.antenna_alignment_pct + 0.08, 70, 100),
    },
    power: {
      ...base.power,
      solar_generation_kw: clamp(base.power.solar_generation_kw + 0.1, 20, 55),
      total_demand_kw: clamp(base.power.total_demand_kw + 0.05, 22, 50),
      net_power_kw: clamp(base.power.net_power_kw + 0.2, -15, 20),
      battery_charge_pct: nextBattery,
      supercap_charge_pct: nextSupercap,
      power_survivability_hours: clamp(base.power.power_survivability_hours + 0.01, 4, 12),
    },
    thermal: {
      ...base.thermal,
      node_temperatures_c: nextNodeTemps,
      avg_cluster_temp_c: nextAvgTemp,
      max_node_temp_c: clamp(base.thermal.max_node_temp_c + 0.05, 20, 40),
      radiator_temp_c: clamp(base.thermal.radiator_temp_c + (base.thermal.avg_cluster_temp_c > 26 ? 0.04 : -0.02), 10, 26),
      coolant_quality: clamp(base.thermal.coolant_quality + 0.002, 0, 1),
      loop_a_health_pct: clamp(base.thermal.loop_a_health_pct - 0.01, 80, 100),
      loop_b_health_pct: clamp(base.thermal.loop_b_health_pct - 0.005, 80, 100),
      pcm_charge_pct: clamp(base.thermal.pcm_charge_pct + 0.04, 0, 100),
      thermal_headroom_pct: clamp(base.thermal.thermal_headroom_pct - 0.1, 10, 60),
      predicted_temp_10min_c: clamp(nextAvgTemp + 0.35, 18, 45),
      thermal_alert_level: nextAvgTemp > 27 ? 1 : 0,
      emergency_shutdown: false,
    },
    comms: {
      ...base.comms,
      link_quality_pct: nextLinkQuality,
      bandwidth_gbps: nextBandwidth,
      latency_ms: nextLatency,
      packet_loss_pct: clamp(base.comms.packet_loss_pct + 0.01, 0, 5),
    },
    scheduler: {
      ...base.scheduler,
      gpu_load_kw: nextGpuLoad,
      workloads: nextSchedulerWorkloads,
    },
    faults: base.faults.filter((fault) => fault.remaining_s > 0).map((fault) => ({ ...fault, remaining_s: fault.remaining_s - 1 })),
  };
}

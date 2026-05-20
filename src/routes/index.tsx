import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/')({
  component: RiderCalc,
})

function RiderCalc() {
  useEffect(() => {
    const tryInit = () => {
      if (typeof (window as any).initRiderApp === 'function') {
        (window as any).initRiderApp()
      } else {
        setTimeout(tryInit, 50)
      }
    }
    tryInit()
  }, [])

  return (
    <>
      <header>
        <div className="header-top">
          <div className="logo">🛵 RIDER CALC</div>
          <div className="date-badge" id="dateBadge"></div>
        </div>
        <div className="total-row">
          <div>
            <div className="total-label">Total del día</div>
            <div className="total-amount" id="totalDay">Q 0.00</div>
          </div>
          <div className="meta-mini" id="metaMini" style={{ display: 'none' }}></div>
        </div>
        <div className="meta-header-bar">
          <div className="meta-header-fill" id="metaHeaderFill" style={{ width: '0%' }}></div>
        </div>
        <div className="stats-row">
          <div className="stat-chip"><div className="val" id="statPedidos">0</div><div className="lbl">Pedidos</div></div>
          <div className="stat-chip"><div className="val" id="statEntregas">0</div><div className="lbl">Entregas</div></div>
          <div className="stat-chip"><div className="val" id="statKm">0.0</div><div className="lbl">Km</div></div>
          <div className="stat-chip"><div className="val" id="statPromedio">Q0</div><div className="lbl">Prom.</div></div>
          <div className="stat-chip"><div className="val" id="statNeta" style={{ color: 'var(--yellow)' }}>Q0</div><div className="lbl">Neta</div></div>
        </div>
      </header>

      {/* PWA Install Banner */}
      <div className="install-banner" id="installBanner">
        <div className="install-banner-icon">📲</div>
        <div className="install-banner-info">
          <div className="install-banner-title">Instalar como app</div>
          <div className="install-banner-sub">Funciona sin internet · Acceso rápido desde inicio</div>
        </div>
        <button className="install-banner-btn" onClick={() => (window as any).triggerInstall()}>Instalar</button>
        <button onClick={() => (window as any).dismissInstall()} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '18px', cursor: 'pointer', padding: '4px' }}>✕</button>
      </div>

      <div className="tabs">
        <div className="tab active" onClick={() => (window as any).switchTab('calc')}>🧮 Calc</div>
        <div className="tab" onClick={() => (window as any).switchTab('historial')}>📋 Historial</div>
        <div className="tab" onClick={() => (window as any).switchTab('stats')}>📊 Stats</div>
        <div className="tab" onClick={() => (window as any).switchTab('grafica')}>📈 Gráfica</div>
        <div className="tab" onClick={() => (window as any).switchTab('config')}>⚙️ Config</div>
      </div>

      {/* CALCULAR */}
      <div className="tab-content active" id="tab-calc">
        <div className="mult-display">
          <div className="mult-info">
            <div className="mult-label">Multiplicador</div>
            <div className="mult-hint">Tocá para escribir cualquier valor</div>
            <input type="number" className="mult-value" id="multDisplay" defaultValue="1.30" step="0.05" min="1.00" max="9.99" onInput={() => (window as any).onMultInput()} onBlur={() => (window as any).onMultBlur()} />
            <div className="mult-effective" id="multEffective"></div>
            <div className="auto-mult-badge" id="autoMultBadge" style={{ display: 'none' }}>🤖 AUTO-HORARIO ACTIVO</div>
          </div>
          <div className="mult-controls">
            <button className="mult-btn" onClick={() => (window as any).changeMult(0.05)}>+</button>
            <button className="mult-btn" onClick={() => (window as any).changeMult(-0.05)}>−</button>
          </div>
        </div>
        <div className="mult-presets">
          <button className="preset-btn" onClick={() => (window as any).setMult(1.00)}>1.00</button>
          <button className="preset-btn" onClick={() => (window as any).setMult(1.10)}>1.10</button>
          <button className="preset-btn" onClick={() => (window as any).setMult(1.20)}>1.20</button>
          <button className="preset-btn" onClick={() => (window as any).setMult(1.25)}>1.25</button>
          <button className="preset-btn active" onClick={() => (window as any).setMult(1.30)}>1.30</button>
          <button className="preset-btn" onClick={() => (window as any).setMult(1.50)}>1.50</button>
          <button className="preset-btn" onClick={() => (window as any).setMult(2.00)}>2.00</button>
        </div>

        <div className="rain-toggle" onClick={() => (window as any).toggleRain()}>
          <div className="rt-icon">🌧️</div>
          <div className="rt-info"><div className="rt-label">Multiplicador lluvia</div><div className="rt-sub">Se suma al base (ej: 1.30 + 0.25 = 1.55x)</div></div>
          <div className="toggle-switch" id="rainSwitch"><div className="toggle-knob"></div></div>
        </div>
        <div className="rain-extra-input" id="rainInput">
          <label>🌧️ Extra lluvia</label>
          <input type="number" id="rainExtra" placeholder="0.25" step="0.05" defaultValue="0.25" onInput={() => (window as any).updateResult()} />
        </div>

        <div className="section-label">🏪 Restaurante</div>
        <div className="restaurant-box" id="restaurantBox">
          <label>Nombre del restaurante</label>
          <input type="text" id="restaurantInput" placeholder="Ej: McDonald's Metrosur" autoComplete="off" onInput={() => (window as any).handleRestaurantInput()} onFocus={() => (window as any).handleRestaurantInput()} />
          <div className="autocomplete-list" id="autocompleteList"></div>
        </div>

        <div className="section-label">📍 Punto de retiro</div>
        <div className="retiro-box">
          <div className="retiro-icon">🏪</div>
          <div className="retiro-info">
            <label>KM al punto de retiro</label>
            <input type="number" id="kmRetiro" placeholder="0.000" step="0.001" onInput={() => (window as any).updateResult()} />
          </div>
        </div>

        <div className="entregas-header">
          <div className="section-label" style={{ margin: '0' }}>🏠 Puntos de entrega</div>
          <button className="add-entrega-btn" id="addEntregaBtn" onClick={() => (window as any).addEntrega()}>+ Agregar</button>
        </div>
        <div id="entregasContainer"></div>

        <div className="propina-box">
          <label>💚 Propina (opcional)</label>
          <input type="number" id="propina" placeholder="0.00" step="0.50" onInput={() => (window as any).updateResult()} />
        </div>

        <div className="time-section">
          <div className="section-label" style={{ marginBottom: '10px' }}>⏱️ Registro de tiempo</div>
          <div className="time-btns">
            <button className="time-btn" id="btnAceptar" onClick={() => (window as any).setTime('aceptar')}><span className="tb-icon">✅</span>Acepté<div className="tb-time" id="timeAceptar">--:--</div></button>
            <button className="time-btn" id="btnLlegue" onClick={() => (window as any).setTime('llegue')}><span className="tb-icon">🏍️</span>Llegué<div className="tb-time" id="timeLlegue">--:--</div></button>
            <button className="time-btn" id="btnRecogi" onClick={() => (window as any).setTime('recogi')}><span className="tb-icon">📦</span>Recogí<div className="tb-time" id="timeRecogi">--:--</div></button>
            <button className="time-btn" id="btnEntregu" onClick={() => (window as any).setTime('entregu')}><span className="tb-icon">🏠</span>Entregué<div className="tb-time" id="timeEntregu">--:--</div></button>
          </div>
        </div>

        <div className="result-card">
          <div className="result-label">Ganancia este pedido</div>
          <div className="result-amount" id="resultAmount">Q 0.00</div>
          <div className="result-breakdown" id="resultBreakdown"></div>
          <div className="result-neta" id="resultNeta"></div>
        </div>
        <button className="add-btn" onClick={() => (window as any).addOrder()}>✓ AGREGAR AL HISTORIAL</button>
      </div>

      {/* HISTORIAL */}
      <div className="tab-content" id="tab-historial">
        <div className="date-nav">
          <button className="date-nav-btn" onClick={() => (window as any).changeHistDate(-1)}>‹</button>
          <div style={{ textAlign: 'center' }}>
            <div className="date-nav-label" id="histDateLabel">HOY</div>
            <div className="date-nav-today" onClick={() => (window as any).goToToday()}>← Volver a hoy</div>
          </div>
          <button className="date-nav-btn" onClick={() => (window as any).changeHistDate(1)}>›</button>
        </div>
        <div id="histDaySummary"></div>
        <button className="last-delivery-btn" id="lastDeliveryBtn" onClick={() => (window as any).openOdometer()}>🏁 Última entrega del día</button>
        <div id="historyList"><div className="empty-state"><div className="es-icon">📋</div><div className="es-text">Aún no hay pedidos.<br />¡Agregá tu primer pedido!</div></div></div>
      </div>

      {/* STATS */}
      <div className="tab-content" id="tab-stats">
        <div className="widget-card" id="widgetResumen"></div>
        <div className="proyeccion-card" id="proyeccionCard" style={{ display: 'none' }}></div>
        <div id="recordBadge"></div>
        <div id="metaBarSection" style={{ display: 'none' }}>
          <div className="meta-bar-wrap" id="metaBarCard"></div>
        </div>
        <div className="stats-grid">
          <div className="stats-card"><div className="sc-label">Total bruto</div><div className="sc-val green" id="sTotal">Q 0</div></div>
          <div className="stats-card"><div className="sc-label">Ganancia neta</div><div className="sc-val yellow" id="sNeta">Q 0</div></div>
          <div className="stats-card"><div className="sc-label">Pedidos</div><div className="sc-val" id="sPedidos">0</div></div>
          <div className="stats-card"><div className="sc-label">Entregas reales</div><div className="sc-val accent" id="sEntregas">0</div></div>
          <div className="stats-card"><div className="sc-label">Km recorridos</div><div className="sc-val accent" id="sKm">0.0</div></div>
          <div className="stats-card"><div className="sc-label">Costo km</div><div className="sc-val" id="sCostoKm">Q0</div></div>
          <div className="stats-card"><div className="sc-label">Q por km</div><div className="sc-val" id="sQkm">0.00</div></div>
          <div className="stats-card"><div className="sc-label">Total propinas</div><div className="sc-val green" id="sPropinas">Q 0</div></div>
        </div>
        <div className="neta-card" id="netaCard" style={{ display: 'none' }}></div>
        <div className="info-card" id="horaStats">
          <div className="ic-title">🕐 Ganancias por franja horaria</div>
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '14px', fontSize: '13px' }}>Sin datos aún</div>
        </div>
        <div className="info-card" id="timeBreakdown">
          <div className="ic-title">⏱️ Desglose de tiempo</div>
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '14px', fontSize: '13px' }}>Sin datos de tiempo aún</div>
        </div>
        <div className="info-card" id="deadTimeCard">
          <div className="ic-title">💤 Tiempos muertos</div>
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '14px', fontSize: '13px' }}>Sin datos aún</div>
        </div>
        <div className="info-card" id="restaurantStats">
          <div className="ic-title">🏪 Restaurantes más tardados</div>
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '14px', fontSize: '13px' }}>Sin datos aún</div>
        </div>
        <div className="info-card" id="bestWorst">
          <div className="ic-title">🏆 Mejor vs Peor pedido</div>
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '14px', fontSize: '13px' }}>Sin datos aún</div>
        </div>
        <div className="info-card" id="odoStats" style={{ display: 'none' }}>
          <div className="ic-title">🏍️ KM App vs Odómetro</div>
          <div id="odoStatsContent"></div>
        </div>
        <div className="semana-card" id="semanaCard">
          <div className="ic-title">📅 Esta semana vs semana anterior</div>
          <div id="semanaContent" style={{ textAlign: 'center', color: 'var(--muted)', padding: '14px', fontSize: '13px' }}>Sin datos aún</div>
        </div>
      </div>

      {/* GRÁFICA */}
      <div className="tab-content" id="tab-grafica">
        <div className="chart-wrap">
          <div className="chart-title">💰 Ganancias por día (14 días)</div>
          <canvas id="chartGanancias" height={180}></canvas>
        </div>
        <div className="chart-wrap">
          <div className="chart-title">📦 Pedidos y entregas por día</div>
          <canvas id="chartPedidos" height={150}></canvas>
        </div>
        <div className="chart-wrap">
          <div className="chart-title">⏱️ Tiempo promedio por pedido</div>
          <canvas id="chartTiempo" height={150}></canvas>
        </div>
        <div className="chart-wrap">
          <div className="chart-title">💰 Ganancia neta vs bruta</div>
          <canvas id="chartNeta" height={150}></canvas>
        </div>
      </div>

      {/* CONFIG */}
      <div className="tab-content" id="tab-config">
        <div className="config-section">
          <h3>🎯 Meta diaria</h3>
          <div className="config-field">
            <label>Meta de ganancias</label>
            <input type="number" id="cfgMeta" placeholder="500" step="50" />
            <span className="unit">Q</span>
          </div>
          <div className="config-field">
            <label>💰 Base inicial del día</label>
            <input type="number" id="cfgBase" placeholder="0.00" step="0.01" />
            <span className="unit">Q</span>
          </div>
          <button className="save-config-btn" onClick={() => (window as any).saveConfig()}>💾 Guardar</button>
        </div>

        <div className="config-section">
          <h3>⛽ Costos del día</h3>
          <div className="config-field"><label>Precio gasolina / galón</label><input type="number" id="cfgGasPrice" placeholder="32" step="1" /><span className="unit">Q</span></div>
          <div className="config-field"><label>Km por galón (tu moto)</label><input type="number" id="cfgKmGalon" placeholder="40" step="1" /><span className="unit">km</span></div>
          <div className="config-field"><label>Costo mantenimiento diario</label><input type="number" id="cfgMant" placeholder="15" step="5" /><span className="unit">Q</span></div>
          <div className="config-field"><label>Otros gastos del día</label><input type="number" id="cfgOtros" placeholder="0" step="5" /><span className="unit">Q</span></div>
          <button className="save-config-btn" onClick={() => (window as any).saveConfig()}>💾 Guardar</button>
        </div>

        <div className="config-section">
          <h3>🤖 Multiplicador automático</h3>
          <div className="auto-toggle-row" id="autoToggleRow" onClick={() => (window as any).toggleAutoMult()}>
            <span style={{ fontSize: '18px' }}>🤖</span>
            <div style={{ flex: 1 }}><div style={{ fontSize: '13px', fontWeight: 600 }}>Cambio automático por hora</div><div style={{ fontSize: '10px', color: 'var(--muted)' }}>La app ajusta el multiplicador según tu horario</div></div>
            <div className="toggle-switch" id="autoMultSwitch"><div className="toggle-knob"></div></div>
          </div>
          <div id="scheduleList"></div>
          <button className="add-sch-btn" onClick={() => (window as any).addScheduleItem()}>+ Agregar franja horaria</button>
          <button className="save-config-btn" onClick={() => (window as any).saveConfig()}>💾 Guardar horarios</button>
        </div>

        <div className="config-section">
          <h3>📤 Exportar datos</h3>
          <button className="export-btn csv" onClick={() => (window as any).exportCSV()}>📊 Exportar CSV (Excel)</button>
          <button className="export-btn txt" onClick={() => (window as any).exportTXT()}>📄 Exportar resumen TXT</button>
          <button className="export-btn share" onClick={() => (window as any).shareWhatsApp()}>💬 Compartir por WhatsApp</button>
        </div>

        <div className="config-section">
          <h3>💾 Copia de seguridad</h3>
          <button className="export-btn backup" onClick={() => (window as any).exportBackup()}>📦 Exportar todos mis datos (JSON)</button>
          <button className="export-btn restore" onClick={() => (window as any).importBackup()}>📂 Importar datos (restaurar)</button>
        </div>

        <div className="config-section">
          <h3>📲 Instalar como app</h3>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px', lineHeight: '1.6' }}>
            Instalá Rider Calc en tu celular para usarla sin internet y con acceso rápido desde la pantalla de inicio.
          </p>
          <button className="export-btn install" onClick={() => (window as any).triggerInstall()}>📲 Instalar en este dispositivo</button>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--text)' }}>Para generar APK:</strong> visitá <span style={{ color: 'var(--blue)' }}>pwabuilder.com</span> con la URL de esta app para generar un APK instalable en cualquier Android.
          </div>
        </div>
      </div>

      {/* FAB */}
      <button className="fab hidden" id="fab" onClick={() => (window as any).openQuick()}>⚡</button>

      {/* QUICK MODAL */}
      <div className="modal-overlay" id="quickModal" onClick={(e) => (window as any).closeModalOutside(e, 'quickModal')}>
        <div className="modal">
          <div className="modal-handle"></div>
          <button className="modal-close" onClick={() => (window as any).closeModal('quickModal')}>✕</button>
          <div className="modal-title">⚡ Pedido Rápido</div>
          <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Multiplicador</div>
          <div className="quick-mult-row" id="quickPresets"></div>
          <div className="quick-grid">
            <div className="quick-box"><label>📍 KM Retiro</label><input type="number" id="qKmR" placeholder="0.000" step="0.001" onInput={() => (window as any).updateQuick()} /></div>
            <div className="quick-box"><label>🏠 KM Entrega</label><input type="number" id="qKmE" placeholder="0.000" step="0.001" onInput={() => (window as any).updateQuick()} /></div>
            <div className="quick-box"><label>💚 Propina</label><input type="number" id="qProp" placeholder="0.00" step="0.50" onInput={() => (window as any).updateQuick()} /></div>
            <div className="quick-box"><label>🌧️ Extra lluvia</label><input type="number" id="qRain" placeholder="0.00" step="0.05" onInput={() => (window as any).updateQuick()} /></div>
          </div>
          <div className="quick-result"><div className="qr-label">Este pedido</div><div className="qr-amount" id="qResult">Q 0.00</div></div>
          <button className="quick-add-btn" onClick={() => (window as any).quickAdd()}>✓ AGREGAR</button>
        </div>
      </div>

      {/* EDIT MODAL */}
      <div className="modal-overlay" id="editModal" onClick={(e) => (window as any).closeModalOutside(e, 'editModal')}>
        <div className="modal">
          <div className="modal-handle"></div>
          <button className="modal-close" onClick={() => (window as any).closeModal('editModal')}>✕</button>
          <div className="modal-title">✏️ Editar Pedido</div>
          <input type="hidden" id="editOrderId" />
          <div className="edit-field"><label>🏪 Restaurante</label><input type="text" id="editRestaurant" placeholder="Nombre del restaurante" /></div>
          <div className="edit-grid">
            <div className="edit-field"><label>📍 KM Retiro</label><input type="number" id="editKmR" step="0.001" /></div>
            <div className="edit-field"><label>🏠 KM Entrega</label><input type="number" id="editKmE" step="0.001" /></div>
            <div className="edit-field"><label>🔢 Multiplicador</label><input type="number" id="editMult" step="0.05" /></div>
            <div className="edit-field"><label>💚 Propina</label><input type="number" id="editProp" step="0.50" /></div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>⏱️ Tiempos</div>
          <div className="edit-grid">
            <div className="edit-field"><label>✅ Acepté</label><input type="time" id="editTAceptar" /></div>
            <div className="edit-field"><label>🏍️ Llegué</label><input type="time" id="editTLlegue" /></div>
            <div className="edit-field"><label>📦 Recogí</label><input type="time" id="editTRecogi" /></div>
            <div className="edit-field"><label>🏠 Entregué</label><input type="time" id="editTEntregu" /></div>
          </div>
          <button className="save-edit-btn" onClick={() => (window as any).saveEdit()}>💾 GUARDAR CAMBIOS</button>
        </div>
      </div>

      {/* ODO MODAL */}
      <div className="modal-overlay" id="odoModal" onClick={(e) => (window as any).closeModalOutside(e, 'odoModal')}>
        <div className="modal">
          <div className="modal-handle"></div>
          <button className="modal-close" onClick={() => (window as any).closeModal('odoModal')}>✕</button>
          <div className="modal-title">🏁 Cierre del día</div>
          <div className="odo-card">
            <div className="odo-label">KM registrados por la app</div>
            <div className="odo-val" id="odoAppKm">0.0</div>
          </div>
          <div className="odo-input-box">
            <label>🏍️ KM en tu odómetro hoy</label>
            <input type="number" id="odoInput" placeholder="0.0" step="0.1" onInput={() => (window as any).updateOdoDiff()} />
          </div>
          <div className="odo-card" id="odoDiffCard" style={{ display: 'none' }}>
            <div className="odo-label">KM ganados 🎉</div>
            <div className="odo-val" id="odoDiffKm" style={{ color: 'var(--green)' }}>0.0</div>
            <div className="odo-diff" id="odoDiffQ"></div>
          </div>
          <button className="odo-save-btn" onClick={() => (window as any).saveOdoAndReport()}>📊 VER REPORTE DEL DÍA</button>
        </div>
      </div>

      {/* REPORTE MODAL */}
      <div className="modal-overlay" id="reportModal" onClick={(e) => (window as any).closeModalOutside(e, 'reportModal')}>
        <div className="modal">
          <div className="modal-handle"></div>
          <button className="modal-close" onClick={() => (window as any).closeModal('reportModal')}>✕</button>
          <div className="modal-title">📊 Reporte del día</div>
          <div id="reportContent"></div>
          <button className="share-report-btn" onClick={() => (window as any).shareReport()}>💬 Compartir</button>
          <button className="close-report-btn" onClick={() => (window as any).closeModal('reportModal')}>Cerrar</button>
        </div>
      </div>
    </>
  )
}

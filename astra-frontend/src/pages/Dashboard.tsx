// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../services/api';
import type { DashboardStats } from '../types/schema';
import { StatCard, SectionHeader } from '../components/atoms/index';

const AI_RESPONSES: Record<string, { tool: string; text: string }> = {
  'sin horario': {
    tool: 'obtenerResumenEstado({programa_id:"IS",jornada:"Diurna",modalidad:"presencial"})',
    text: 'Hay <strong>80 grupos</strong> en IS Diurna presencial. <strong>32 sin horario asignado</strong> (60% completitud).<br/><br/>· Sin horario: 32 &nbsp;· Propuesto: 14 &nbsp;· Confirmado: 34 &nbsp;· Conflicto: 0<br/><br/>¿Deseas que genere automáticamente los horarios pendientes?',
  },
  'conflict': {
    tool: 'detectarConflictos({periodo:"2025-1",solo_activos:true})',
    text: 'Se detectaron <strong>7 conflictos activos</strong>:<br/><br/>🔴 Críticos: aula solapada AU302 · Lunes D1 | Docente solapado García · Martes D2<br/><br/>🟡 Advertencias: carga excedida Morales, aula incompatible IS-RE-C + 3 menores.',
  },
  'sobrecarga': {
    tool: 'getDocentesConSobrecarga()',
    text: '<strong>3 docentes con sobrecarga:</strong><br/>· P. García (TC) 44h/40h<br/>· P. Morales (MT) 22h/20h<br/>· P. Ramírez (MT) 21h/20h<br/><br/>Recomendación: reasignar 1 grupo a Vargas (0h disponibles).',
  },
  'proponer': {
    tool: 'proponerHorario({grupo_id:"IS-AL-A",restricciones:{jornada:"Diurna"}})',
    text: '✅ Propuesta IS-AL-A · Álgebra Lineal:<br/>· Miércoles · D2 (10:00-13:00)<br/>· Salón AU103 (40 cupos, disponible)<br/>· Docente: P. Vargas (0h asignadas)<br/><br/>Sin conflictos. ¿Confirmo la asignación?',
  },
};

interface AiMsg { role: 'assistant'|'user'; content: string; toolCall?: string; typing?: boolean }

export default function Dashboard() {
  const nav = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [msgs, setMsgs] = useState<AiMsg[]>([{
    role: 'assistant',
    content: '¡Hola! Soy el agente AstraSchedule. Puedo consultar horarios, docentes, salones y conflictos del semestre 2025-1.',
  }]);
  const [input, setInput] = useState('');

  useEffect(() => {
    dashboardApi.getStats()
      .then(r => setStats((r.data as any).stats))
      .catch(() => {});
  }, []);

  const S = stats;

  function sendAI(text?: string) {
    const t = (text ?? input).trim();
    if (!t) return;
    setInput('');
    setMsgs(m => [...m, { role: 'user', content: t }, { role: 'assistant', content: '', typing: true }]);
    const lo = t.toLowerCase();
    let key = 'default';
    if (lo.includes('sin horario') || lo.includes('grupos')) key = 'sin horario';
    else if (lo.includes('conflict')) key = 'conflict';
    else if (lo.includes('sobrecarga') || lo.includes('carga')) key = 'sobrecarga';
    else if (lo.includes('proponer') || lo.includes('asignar') || lo.includes('álgebra')) key = 'proponer';
    const resp = AI_RESPONSES[key];
    setTimeout(() => {
      setMsgs(m => m.filter(x => !x.typing).concat([{
        role: 'assistant',
        content: resp ? resp.text : 'Entendido. Puedo ayudarte con horarios, docentes, salones y conflictos de UNIAJC 2025-1.',
        toolCall: resp?.tool,
      }]));
    }, 1500);
  }

  return (
    <>
      <div className="page-title">Buenos días, Juan</div>
      <div className="page-sub">Gestiona los horarios académicos del semestre 2025-1 · Facultad de Ingeniería UNIAJC.</div>

      {/* Hero cards */}
      <div className="hero-grid">
        {[
          { label: 'Horarios', desc: 'Gestión y asignación de franjas horarias por grupo y docente.', color: 'c-blue', icon: 'calendar', to: '/horarios' },
          { label: 'Conflictos', desc: 'Detección automática de solapamientos y carga excedida.', color: 'c-purple', icon: 'alert-triangle', to: '/conflictos' },
          { label: 'Agente IA', desc: 'Asistente conversacional Groq para asignación automática.', color: 'c-indigo', icon: 'robot', to: '/ai' },
        ].map(h => (
          <div key={h.label} className={`hero-card ${h.color}`} onClick={() => nav(h.to)} role="button" tabIndex={0}>
            <h3>{h.label}</h3>
            <p>{h.desc}</p>
            <button className="hero-launch">
              Ver ahora <i className="ti ti-arrow-up-right" style={{ fontSize: 11 }} aria-hidden="true" />
            </button>
            <i className={`ti ti-${h.icon} hero-icon`} aria-hidden="true" />
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard label="Grupos totales"    value={S?.total_grupos ?? 148}  sub="↑ 12 vs sem. anterior" subVariant="up"   fillColor="var(--blue)"  fillPct={74} />
        <StatCard label="Con horario"       value={S?.grupos_con_horario ?? 116} sub={`${S?.porcentaje_completitud ?? 78.4}% completitud`} fillColor="var(--green)" fillPct={S?.porcentaje_completitud ?? 78} />
        <StatCard label="Conflictos activos" value={S?.conflictos_activos ?? 7} sub="3 críticos sin resolver" subVariant="down" fillColor="var(--red)"   fillPct={18} />
        <StatCard label="Docentes activos" value={S?.docentes_activos ?? 42}  sub="3 con sobrecarga"       subVariant="warn" fillColor="var(--amber)" fillPct={88} />
      </div>

      {/* Accesos + Sesiones */}
      <SectionHeader title="Accesos rápidos" sub="Módulos más utilizados." action={
        <button className="view-all-btn" onClick={() => nav('/horarios')}>
          Ver todos <i className="ti ti-arrow-right" style={{ fontSize: 12 }} aria-hidden="true" />
        </button>
      } />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Módulo</th><th>Programa</th><th>Acción</th></tr></thead>
          <tbody>
            {[
              { name: 'Grupos sin horario IS', mod: 'blue', modLabel: 'Horarios',   to: '/horarios' },
              { name: 'Conflictos críticos',   mod: 'red',  modLabel: 'Conflictos', to: '/conflictos' },
              { name: 'Docentes sobrecargados',mod: 'amber',modLabel: 'Docentes',   to: '/docentes' },
              { name: 'Salones disponibles',   mod: 'green',modLabel: 'Salones',    to: '/salones' },
            ].map(r => (
              <tr key={r.name}>
                <td style={{ fontWeight: 500, color: 'var(--text)' }}>{r.name}</td>
                <td><span className={`tag tag-${r.mod}`}>{r.modLabel}</span></td>
                <td>IS · IE</td>
                <td><button className="action-btn" onClick={() => nav(r.to)}><i className="ti ti-eye" aria-hidden="true" /> Ver</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sesiones + Calendario + AI */}
      <div className="grid-2">
        {/* Sesiones */}
        <div>
          <SectionHeader title="Sesiones recientes" sub="Últimas acciones del sistema." />
          <div className="table-wrap" style={{ marginBottom: 0 }}>
            <table>
              <thead><tr><th>#</th><th>Acción</th><th>Fecha</th><th></th></tr></thead>
              <tbody>
                {[
                  ['1','Asignación IS-BD-A propuesta','24/5/2026, 5:41 PM'],
                  ['2','Conflicto AU302 detectado','24/5/2026, 4:28 PM'],
                  ['3','Carga docente actualizada','24/5/2026, 3:10 PM'],
                  ['4','Contrapropuesta aplicada','23/5/2026, 9:31 AM'],
                ].map(([n,a,d]) => (
                  <tr key={n}>
                    <td>{n}</td>
                    <td style={{ fontWeight: 500, color: 'var(--text)' }}>{a}</td>
                    <td style={{ color: 'var(--text3)' }}>{d}</td>
                    <td><button className="action-btn"><i className="ti ti-eye" aria-hidden="true" /> Ver</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mini calendario */}
        <div>
          <SectionHeader title="Calendario" sub="Vista semanal de franjas." />
          <div className="cal-wrap" style={{ marginBottom: 0 }}>
            <div className="cal-grid">
              <div />
              {['LUN','MAR','MIÉ','JUE'].map(d => <div key={d} className="cal-day-h">{d}</div>)}
              <div className="cal-t">07:00</div>
              <div className="cal-cell"><div className="cal-ev ev-red">Cálc. Dif. A<br/>AU302 · CONFLICTO</div></div>
              <div className="cal-cell"><div className="cal-ev ev-blue">Progr. I B<br/>Lab-201</div></div>
              <div className="cal-cell" />
              <div className="cal-cell"><div className="cal-ev ev-blue">Álgebra A<br/>AU105</div></div>
              <div className="cal-t">10:00</div>
              <div className="cal-cell"><div className="cal-ev ev-blue">Bases BD A<br/>Lab-101</div></div>
              <div className="cal-cell"><div className="cal-ev ev-red">Ing. SW A<br/>AU302 · CONF.</div></div>
              <div className="cal-cell"><div className="cal-ev ev-blue">Redes I C<br/>Lab-202</div></div>
              <div className="cal-cell" />
              <div className="cal-t">13:00</div>
              <div className="cal-cell" />
              <div className="cal-cell"><div className="cal-ev ev-amber">Estadística<br/>AU203</div></div>
              <div className="cal-cell"><div className="cal-ev ev-blue">Cálc. Int.<br/>AU302</div></div>
              <div className="cal-cell"><div className="cal-ev ev-green">POO A<br/>Lab-101</div></div>
            </div>
          </div>
        </div>
      </div>

      {/* AI inline */}
      <SectionHeader title="Agente IA" sub="Consulta rápida al asistente." />
      <div className="ai-panel">
        <div className="ai-panel-top">
          <div className="ai-status-dot" />
          <div className="ai-label">AstraSchedule IA</div>
          <div className="ai-model-chip">llama-3.3-70b</div>
        </div>
        <div className="ai-messages">
          {msgs.map((m, i) => (
            <div key={i} className={`ai-msg ${m.role === 'user' ? 'user' : ''}`}>
              <div className={`ai-av ${m.role === 'user' ? 'user-av' : ''}`}>
                {m.role === 'user' ? 'Tú' : 'IA'}
              </div>
              <div className="ai-bubble">
                {m.typing ? (
                  <div className="ai-typing-wrap">
                    <div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" />
                  </div>
                ) : (
                  <>
                    {m.toolCall && (
                      <div className="ai-tool-call">
                        <div className="ai-tool-name">🔧 {m.toolCall}</div>
                      </div>
                    )}
                    <div dangerouslySetInnerHTML={{ __html: m.content }} />
                    {i === 0 && (
                      <div className="ai-chips">
                        {['¿Cuántos grupos de IS sin horario Diurna?','Lista conflictos críticos activos','¿Docentes con sobrecarga?','Propón horario IS-AL-A Álgebra Lineal'].map(t => (
                          <button key={t} className="ai-chip" onClick={() => sendAI(t)}>{t}</button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="ai-input-row">
          <input
            className="ai-input"
            placeholder="Pregunta al agente... ej: ¿Cuántos grupos sin horario en IS Diurna?"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendAI()}
          />
          <button className="ai-send-btn" onClick={() => sendAI()}>Enviar</button>
        </div>
      </div>
    </>
  );
}

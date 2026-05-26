// src/pages/Conflictos.tsx
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/atoms/index';

const DATA = [
  {tipo:'aula_solapada',   desc:'AU302 doble-asignada D1·Lunes',          sev:'Crítico',    est:'activo'},
  {tipo:'docente_solapado',desc:'P. García · 2 grupos D2·Martes',          sev:'Crítico',    est:'activo'},
  {tipo:'carga_excedida',  desc:'P. Morales: 44h / 40h máx',              sev:'Advertencia',est:'activo'},
  {tipo:'aula_incompatible',desc:'IS-RE-C virtual en salón presencial',    sev:'Advertencia',est:'activo'},
  {tipo:'jornada_incompatible',desc:'Docente Diurna en bloque Nocturno',   sev:'Advertencia',est:'activo'},
  {tipo:'sede_incompatible',desc:'Estudiante Sur en grupo Norte',          sev:'Info',       est:'resuelto'},
  {tipo:'capacidad_excedida',desc:'AU105 30 cupos, 35 inscritos',          sev:'Info',       est:'resuelto'},
];
const SEV_COL: Record<string,string>={Crítico:'var(--red-txt)',Advertencia:'var(--amber-txt)',Info:'var(--text3)'};
const TAG: Record<string,string>={activo:'red',resuelto:'green'};

const RECENT=[
  {color:'#EF4444',title:'Aula solapada · AU302',desc:'Cálc. Diferencial + Física I · D1·Lunes',time:'12m'},
  {color:'#EF4444',title:'Docente solapado · García',desc:'2 grupos simultáneos · Martes D2',time:'1h'},
  {color:'#F59E0B',title:'Carga excedida · Morales',desc:'44h asignadas / 40h máximo',time:'2h'},
  {color:'#F59E0B',title:'Aula incompatible',desc:'IS-RE-C virtual en Lab presencial',time:'3h'},
  {color:'#22C55E',title:'Resuelto · Sede',desc:'Excepción aprobada por decano',time:'ayer'},
];

export default function Conflictos() {
  const nav = useNavigate();
  return (
    <>
      <div className="page-title">Conflictos detectados</div>
      <div className="page-sub">Detección automática y resolución asistida por IA</div>
      <div className="stats-grid">
        <StatCard label="Activos"      value={7}  subVariant="down" />
        <StatCard label="Críticos"     value={2}  subVariant="down" />
        <StatCard label="Advertencias" value={5}  subVariant="warn" />
        <StatCard label="Resueltos"    value={12} subVariant="up" />
      </div>
      <div className="grid-3">
        <div>
          <div className="section-header">
            <div><div className="section-title">Historial</div></div>
            <button className="view-all-btn" onClick={() => nav('/ai')}>
              Resolver con IA <i className="ti ti-arrow-right" style={{fontSize:12}} />
            </button>
          </div>
          <div className="table-wrap" style={{marginBottom:0}}>
            <table style={{tableLayout:'fixed'}}>
              <thead><tr><th style={{width:120}}>Tipo</th><th>Descripción</th><th style={{width:90}}>Severidad</th><th style={{width:78}}>Estado</th></tr></thead>
              <tbody>
                {DATA.map((r,i)=>(
                  <tr key={i}>
                    <td><span className="tag tag-gray" style={{fontFamily:'var(--mono)',fontSize:10}}>{r.tipo}</span></td>
                    <td style={{fontSize:11}}>{r.desc}</td>
                    <td style={{fontSize:11,fontWeight:500,color:SEV_COL[r.sev]}}>{r.sev}</td>
                    <td><span className={`tag tag-${TAG[r.est]}`}>{r.est}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <div className="section-header"><div className="section-title">Recientes</div></div>
          <div className="panel" style={{padding:'12px 14px'}}>
            <div className="conflict-list">
              {RECENT.map((r,i)=>(
                <div key={i} className="conflict-row">
                  <div className="c-dot" style={{background:r.color}} />
                  <div className="c-info">
                    <div className="c-title">{r.title}</div>
                    <div className="c-desc">{r.desc}</div>
                  </div>
                  <div className="c-time">{r.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

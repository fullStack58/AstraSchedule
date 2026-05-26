// src/pages/Analytics.tsx
import { StatCard } from '../components/atoms/index';

const POR_SEDE = [
  {label:'Norte · Diurna',  total:48,con:41,pct:86,tag:'green'},
  {label:'Norte · Nocturna',total:32,con:23,pct:72,tag:'blue'},
  {label:'Sur · Diurna',    total:40,con:32,pct:81,tag:'blue'},
  {label:'Sur · Nocturna',  total:18,con:11,pct:61,tag:'amber'},
  {label:'Virtual (ambas)', total:10,con: 9,pct:90,tag:'green'},
];

export default function Analytics() {
  return (
    <>
      <div className="page-title">Analytics</div>
      <div className="page-sub">Métricas académicas · Semestre 2025-1</div>
      <div className="stats-grid">
        <StatCard label="Completitud global" value="78.4%" sub="Meta: 95%"            fillColor="var(--green)"  fillPct={78} />
        <StatCard label="Ocupación salones"  value="63%"   sub="Promedio semestral"   fillColor="var(--blue)"   fillPct={63} />
        <StatCard label="Eficiencia IA"      value="94%"   sub="Asign. sin conflicto" fillColor="#14B8A6"       fillPct={94} subVariant="up" />
        <StatCard label="Estudiantes"        value="1,248" sub="↑ 3.2% vs 2024-2"    fillColor="#A855F7"       fillPct={85} subVariant="up" />
      </div>
      <div className="grid-2">
        <div className="table-wrap" style={{marginBottom:0}}>
          <table>
            <thead><tr><th>Sede / Jornada</th><th>Total</th><th>Con horario</th><th>Completitud</th></tr></thead>
            <tbody>
              {POR_SEDE.map(r=>(
                <tr key={r.label}>
                  <td>{r.label}</td><td>{r.total}</td><td>{r.con}</td>
                  <td><span className={`tag tag-${r.tag}`}>{r.pct}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-wrap" style={{marginBottom:0}}>
          <table>
            <thead><tr><th>Programa</th><th>Grupos</th><th>Sin horario</th><th>Completitud</th></tr></thead>
            <tbody>
              <tr><td>Ing. Sistemas (IS)</td><td>80</td><td>15</td><td><span className="tag tag-blue">81%</span></td></tr>
              <tr><td>Ing. Electrónica (IE)</td><td>68</td><td>17</td><td><span className="tag tag-amber">75%</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel">
        <div className="section-title" style={{marginBottom:14}}>Distribución de conflictos por tipo</div>
        {[
          {label:'Aula solapada',   pct:35,color:'var(--red)'},
          {label:'Docente solapado',pct:28,color:'var(--amber)'},
          {label:'Carga excedida',  pct:18,color:'#A855F7'},
          {label:'Aula incompatible',pct:12,color:'#14B8A6'},
          {label:'Otros',           pct:7, color:'var(--text3)'},
        ].map(r=>(
          <div key={r.label} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
            <div style={{fontSize:11,color:'var(--text2)',width:148}}>{r.label}</div>
            <div className="prog-bar" style={{flex:1,margin:0}}>
              <div className="prog-fill" style={{width:`${r.pct}%`,background:r.color}} />
            </div>
            <div style={{fontSize:11,color:r.color,width:30,textAlign:'right'}}>{r.pct}%</div>
          </div>
        ))}
      </div>
    </>
  );
}

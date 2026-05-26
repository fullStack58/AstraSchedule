// src/pages/Config.tsx
const REGLAS = [
  {clave:'carga_max_tc',          valor:'40',  tipo:'integer',desc:'Horas máx. semanales docente TC',       mod:true},
  {clave:'carga_max_mt',          valor:'20',  tipo:'integer',desc:'Horas máx. semanales docente MT',       mod:true},
  {clave:'umbral_semestre_virtual',valor:'5',  tipo:'integer',desc:'Semestre mínimo para modalidad virtual', mod:true},
  {clave:'bloqueo_cruce_sede',    valor:'true',tipo:'boolean',desc:'Bloquear inscripción en sede diferente', mod:true},
  {clave:'horas_bloque',          valor:'3',   tipo:'integer',desc:'Duración estándar de bloque en horas',  mod:false},
  {clave:'validar_prerequisitos', valor:'true',tipo:'boolean',desc:'Verificar prerequisitos al inscribir',  mod:true},
];

export default function Config() {
  return (
    <>
      <div className="page-title">Configuración</div>
      <div className="page-sub">Reglas configurables del motor de horarios</div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Clave</th><th>Valor</th><th>Tipo</th><th>Descripción</th><th>Modificable</th></tr></thead>
          <tbody>
            {REGLAS.map(r=>(
              <tr key={r.clave}>
                <td className="mono" style={{fontSize:11,color:'var(--blue)'}}>{r.clave}</td>
                <td className="mono" style={{fontSize:12}}>{r.valor}</td>
                <td><span className={`tag ${r.tipo==='boolean'?'tag-amber':'tag-blue'}`}>{r.tipo}</span></td>
                <td style={{color:'var(--text3)',fontSize:11}}>{r.desc}</td>
                <td><span className={`tag ${r.mod?'tag-green':'tag-red'}`}>{r.mod?'Sí':'No'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

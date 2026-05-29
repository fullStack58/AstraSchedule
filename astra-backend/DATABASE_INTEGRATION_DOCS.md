# Integración del Motor con Base de Datos - Guía Completa

## 📚 Descripción

Se ha integrado exitosamente el motor de asignación con PostgreSQL. El sistema ahora puede:

1. ✅ **Leer datos reales** desde la BD (grupos, docentes, salones, franjas)
2. ✅ **Generar horarios** basados en datos académicos reales
3. ✅ **Guardar asignaciones** de vuelta en la BD
4. ✅ **Validar restricciones** contra datos reales

---

## 🚀 Cómo Usar

### 1. **Preparar la Base de Datos**

Primero, asegúrate de tener datos en la BD:

```bash
cd astra-backend
npm run db:reset      # Crea esquema limpio
npm run seed:all      # Carga datos de prueba
```

Esto cargará:
- 2 sedes (NORTE, SUR)
- 2 programas (IS, IE)
- 10+ materias
- 4+ docentes
- 4+ salones
- 1 período académico activo

### 2. **Ejecutar Demo con Datos Reales**

```bash
npm run demo:scheduling-bd
```

Esto mostrará:
- ✓ Período activo encontrado
- ✓ Datos de la BD cargados
- ✓ Generación Greedy
- ✓ Generación Backtracking
- ✓ Comparación de estrategias

### 3. **Iniciar el Servidor**

```bash
npm run dev
```

El servidor ahora expone nuevos endpoints que usan BD.

---

## 📡 Nuevos Endpoints

### GET `/api/scheduling/generate-db`

Genera horarios usando datos desde la BD.

**Query Parameters:**
- `periodoId` (opcional): ID del período. Si no se proporciona, usa el activo.
- `estrategia` (opcional): `'greedy'` o `'backtracking_simple'` (default)
- `guardar` (opcional): `'true'` para guardar asignaciones en BD (default: `'false'`)

**Ejemplo:**
```bash
# Generar sin guardar (período activo, backtracking)
curl "http://localhost:3001/api/scheduling/generate-db"

# Generar con período específico
curl "http://localhost:3001/api/scheduling/generate-db?periodoId=1"

# Generar con estrategia Greedy
curl "http://localhost:3001/api/scheduling/generate-db?estrategia=greedy"

# Generar Y guardar en BD
curl "http://localhost:3001/api/scheduling/generate-db?guardar=true"
```

**Response:**
```json
{
  "ok": true,
  "message": "Horarios generados: 8/10 grupos asignados",
  "data": {
    "estrategia": "backtracking_simple",
    "estadisticas": {
      "total_grupos": 10,
      "confirmados": 8,
      "conflictos": 2,
      "tasa_exito": "0.80"
    },
    "asignaciones": [
      {
        "grupo": {"id": 1, "nombre": "IS-201 - Grupo A"},
        "status": "confirmado",
        "candidato": {
          "docente": {"id": 1, "nombre": "Dr. Juan Pérez"},
          "salon": {"id": 20, "codigo": "AU-101"},
          "franja": {"id": 100, "dia": "Lunes"}
        }
      }
    ],
    "guardado": {
      "total": 10,
      "guardadas": 8,
      "errores": 0,
      "periodoId": 1
    }
  }
}
```

---

### GET `/api/scheduling/datos-bd/:periodoId`

Obtiene todos los datos de un período (para debugging).

**Ejemplo:**
```bash
curl "http://localhost:3001/api/scheduling/datos-bd/1"
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "resumen": {
      "grupos": 10,
      "docentes": 4,
      "salones": 4,
      "franjas": 14
    },
    "grupos": [
      {
        "id": 1,
        "nombre": "IS-201 - Grupo A",
        "materia_codigo": "IS-201",
        "jornada": "Diurna",
        "modalidad": "presencial",
        "sede_codigo": "NORTE",
        "cupo_max": 30,
        "cupo_estimado": 28
      }
    ],
    "docentes": [...],
    "salones": [...],
    "franjas": [...]
  }
}
```

---

### GET `/api/scheduling/periodo-activo`

Obtiene el período académico activo.

**Ejemplo:**
```bash
curl "http://localhost:3001/api/scheduling/periodo-activo"
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": 1,
    "codigo": "2026-I",
    "nombre": "Semestre I - 2026"
  }
}
```

---

## 🔧 Servicio: DataService

El nuevo `src/services/dataService.js` proporciona métodos para:

### Métodos Principales

#### `obtenerGrupos(periodoId)`
Obtiene todos los grupos activos de un período.

```javascript
const grupos = await DataService.obtenerGrupos(periodoId);
// Retorna: [{id, nombre, jornada, modalidad, cupo_max, ...}, ...]
```

#### `obtenerDocentes()`
Obtiene todos los docentes activos con horas asignadas.

```javascript
const docentes = await DataService.obtenerDocentes();
// Retorna: [{id, nombre, disponibilidad, carga_max_horas, horas_asignadas}, ...]
```

#### `obtenerSalones()`
Obtiene todos los salones disponibles.

```javascript
const salones = await DataService.obtenerSalones();
// Retorna: [{id, codigo, tipo, capacidad, sede_codigo}, ...]
```

#### `obtenerFranjas(periodoId)`
Obtiene todas las franjas horarias de un período.

```javascript
const franjas = await DataService.obtenerFranjas(periodoId);
// Retorna: [{id, dia, jornada, hora_inicio, hora_fin}, ...]
```

#### `obtenerDatosCompletos(periodoId)`
Obtiene todos los datos necesarios de una sola llamada.

```javascript
const datos = await DataService.obtenerDatosCompletos(periodoId);
// Retorna: {grupos: [...], docentes: [...], salones: [...], franjas: [...]}
```

#### `guardarAsignacion(candidato, estado)`
Guarda una asignación individual en la tabla `horario_asignado`.

```javascript
const resultado = await DataService.guardarAsignacion(candidato, 'propuesto');
// Retorna: {id: 123, creado_en: '2026-05-28T...'}
```

#### `guardarAsignacionesLote(asignaciones, periodoId)`
Guarda múltiples asignaciones del resultado del motor.

```javascript
const stats = await DataService.guardarAsignacionesLote(asignaciones, periodoId);
// Retorna: {total: 10, guardadas: 8, errores: 2, periodoId: 1}
```

---

## 📊 Flujo de Integración

```
┌─────────────────────┐
│   PostgreSQL BD     │
│  (grupos, docentes, │
│   salones, franjas) │
└──────────┬──────────┘
           │
           │ DataService.obtenerDatosCompletos()
           ▼
┌─────────────────────┐
│   Datos de BD       │
│ {grupos, docentes,  │
│  salones, franjas}  │
└──────────┬──────────┘
           │
           │ SchedulingService.generarHorarios()
           ▼
┌─────────────────────┐
│ Motor de Asignación │
│ (Greedy o           │
│  Backtracking)      │
└──────────┬──────────┘
           │
           │ Resultado: {asignaciones, estadísticas}
           ▼
┌─────────────────────┐
│ DataService.guardar│
│ AsignacionesLote()  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   horario_asignado  │
│    tabla (BD)       │
└─────────────────────┘
```

---

## 🔍 Queries SQL Utilizadas

### Grupos con Inscripciones

```sql
SELECT
  g.id, g.numero, m.codigo AS materia_codigo, m.nombre AS nombre,
  j.nombre AS jornada, g.modalidad, s.codigo AS sede_codigo,
  g.cupo_max, m.tipo_aula_requerida,
  COUNT(i.id) AS cupo_estimado
FROM grupos g
JOIN materias m ON g.materia_id = m.id
JOIN jornadas j ON g.jornada_id = j.id
LEFT JOIN sedes s ON g.sede_id = s.id
LEFT JOIN inscripciones i ON g.id = i.grupo_id AND i.estado IN ('activa', 'aprobada')
WHERE g.periodo_id = $1 AND g.estado != 'cancelado'
GROUP BY g.id, m.codigo, j.nombre, s.codigo
```

### Docentes con Carga

```sql
SELECT
  d.id, d.nombre, d.disponibilidad, d.carga_max_horas,
  COALESCE(SUM(EXTRACT(EPOCH FROM (bh.hora_fin - bh.hora_inicio)) / 3600), 0) 
    AS horas_asignadas
FROM docentes d
LEFT JOIN horario_asignado ha ON d.id = ha.docente_id
LEFT JOIN franjas_horarias fh ON ha.franja_id = fh.id
LEFT JOIN bloques_horarios bh ON fh.bloque_id = bh.id
WHERE d.activo = TRUE
GROUP BY d.id
```

### Franjas Horarias Completas

```sql
SELECT
  fh.id, fh.dia, j.nombre AS jornada, bh.hora_inicio, bh.hora_fin
FROM franjas_horarias fh
JOIN bloques_horarios bh ON fh.bloque_id = bh.id
JOIN jornadas j ON bh.jornada_id = j.id
WHERE fh.periodo_id = $1
ORDER BY j.id, fh.dia, bh.orden
```

---

## 🎯 Casos de Uso

### 1. **Generar Horarios Diarios**
```bash
# Cada mañana a las 6 AM
GET /api/scheduling/generate-db?guardar=true
```

### 2. **Verificar Datos Antes de Generar**
```bash
GET /api/scheduling/datos-bd/1
# Revisar cantidad de grupos, docentes, salones
```

### 3. **Comparar Estrategias**
```bash
# Greedy
GET /api/scheduling/generate-db?estrategia=greedy

# Backtracking
GET /api/scheduling/generate-db?estrategia=backtracking_simple
```

### 4. **Generar para Período Específico**
```bash
GET /api/scheduling/generate-db?periodoId=2&guardar=true
```

---

## ⚠️ Consideraciones Importantes

### Horas Asignadas
- Las horas se calculan sumando bloques asignados en `horario_asignado`
- Se usa `EXTRACT(EPOCH)` para convertir diferencia de tiempo a segundos
- Luego se divide por 3600 para obtener horas

### Cupo Estimado
- Se cuenta basado en inscripciones activas y aprobadas
- Se usa `MIN(inscripciones, cupo_max)` para no exceder capacidad

### Periodo Activo
- Solo puede haber UN periodo activo a la vez (índice único en BD)
- Si no hay activo, se requiere proporcionar `periodoId`

### Guardado de Asignaciones
- Las asignaciones se guardan con estado `'propuesto'`
- Se pueden cambiar a `'confirmado'` manualmente
- Los conflictos se marcan con estado `'conflicto'`

---

## 🐛 Debugging

### Ver Logs Detallados
```bash
# Los logs del DataService mostrarán:
# ✓ Conexión a BD
# ✓ Datos obtenidos
# ✓ Asignaciones guardadas
```

### Probar Queries Manualmente
```sql
-- Verificar período activo
SELECT * FROM periodos_academicos WHERE activo = TRUE;

-- Verificar grupos
SELECT COUNT(*) FROM grupos WHERE periodo_id = 1 AND estado != 'cancelado';

-- Verificar docentes
SELECT COUNT(*) FROM docentes WHERE activo = TRUE;

-- Ver asignaciones guardadas
SELECT * FROM horario_asignado WHERE estado = 'propuesto';
```

---

## 📝 Notas Técnicas

- **Transacciones**: Cada `guardarAsignacion` es una transacción individual
- **Concurrencia**: Usa pool de conexiones (max 10) para múltiples requests
- **Tolerancia a fallos**: Si guardar falla, el motor continúa (pero registra error)
- **Performance**: Las queries están optimizadas con índices en BD

---

**✅ Integración completada. El motor ahora está conectado a la BD real.**

Para cualquier duda, revisa los logs o consulta los documentos:
- [SCHEDULING_ENGINE_DOCS.md](SCHEDULING_ENGINE_DOCS.md) - Motor
- [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md) - Resumen anterior

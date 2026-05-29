# Integración con Base de Datos - Actualización de Cambios

## 🎯 Objetivo

Integrar el motor de asignación con PostgreSQL para:
- ✅ Leer datos reales (grupos, docentes, salones, franjas)
- ✅ Generar horarios basados en datos académicos reales
- ✅ Guardar resultados en la BD
- ✅ Validar contra datos reales de la universidad

---

## 📁 Archivos Creados

### 1. **Servicio de Datos - DataService**
- **[src/services/dataService.js](src/services/dataService.js)** (600+ líneas)
  - `obtenerGrupos(periodoId)` - Lee grupos de la tabla `grupos` con inscripciones
  - `obtenerDocentes()` - Lee docentes activos y calcula carga actual
  - `obtenerSalones()` - Lee salones disponibles
  - `obtenerFranjas(periodoId)` - Lee franjas horarias con horarios
  - `obtenerDatosCompletos(periodoId)` - Obtiene todo en paralelo
  - `obtenerPeriodoActivo()` - Obtiene período académico activo
  - `guardarAsignacion(candidato, estado)` - Guarda una asignación
  - `guardarAsignacionesLote(asignaciones, periodoId)` - Guarda múltiples

### 2. **Demo con Base de Datos**
- **[demo-scheduling-bd.js](demo-scheduling-bd.js)** (250+ líneas)
  - Demuestra lectura desde BD
  - Generación Greedy
  - Generación Backtracking
  - Comparación de estrategias
  - Datos reales de la universidad

### 3. **Documentación**
- **[DATABASE_INTEGRATION_DOCS.md](DATABASE_INTEGRATION_DOCS.md)** (400+ líneas)
  - Guía completa de uso
  - Descripción de nuevos endpoints
  - Métodos del DataService
  - Queries SQL utilizadas
  - Casos de uso
  - Debugging

---

## 🔧 Archivos Modificados

### [src/routes/scheduling.routes.js](src/routes/scheduling.routes.js)
✅ Importado `DataService`  
✅ Añadidos 4 nuevos endpoints:
- `GET /api/scheduling/generate-db` - Genera con datos de BD
- `GET /api/scheduling/datos-bd/:periodoId` - Obtiene datos para debugging
- `GET /api/scheduling/periodo-activo` - Obtiene período activo

### [package.json](package.json)
✅ Añadido script: `"demo:scheduling-bd": "node demo-scheduling-bd.js"`

---

## 📡 Nuevos Endpoints

### GET `/api/scheduling/generate-db`
Genera horarios usando datos **reales desde la BD**.

**Parámetros:**
- `periodoId` (opcional): ID del período. Si omite, usa el activo
- `estrategia` (opcional): `'greedy'` o `'backtracking_simple'` (default)
- `guardar` (opcional): `'true'` para guardar en BD

**Ejemplo:**
```bash
# Usar período activo, backtracking
curl "http://localhost:3001/api/scheduling/generate-db"

# Guardar resultados en BD
curl "http://localhost:3001/api/scheduling/generate-db?guardar=true"

# Período específico con Greedy
curl "http://localhost:3001/api/scheduling/generate-db?periodoId=1&estrategia=greedy"
```

---

### GET `/api/scheduling/datos-bd/:periodoId`
Obtiene y visualiza todos los datos cargados desde la BD.

```bash
curl "http://localhost:3001/api/scheduling/datos-bd/1"
```

---

### GET `/api/scheduling/periodo-activo`
Identifica el período académico actual.

```bash
curl "http://localhost:3001/api/scheduling/periodo-activo"
```

---

## 🚀 Cómo Usar

### 1. Preparar Datos en BD
```bash
cd astra-backend
npm run db:reset       # Crea esquema limpio
npm run seed:all       # Carga datos de prueba
```

### 2. Ejecutar Demo con BD
```bash
npm run demo:scheduling-bd
```

Muestra:
- ✓ Período activo identificado
- ✓ Datos cargados desde BD
- ✓ Generación Greedy
- ✓ Generación Backtracking
- ✓ Estadísticas comparativas

### 3. Iniciar Servidor
```bash
npm run dev
```

### 4. Probar Endpoints
```bash
# Ver datos del período
curl "http://localhost:3001/api/scheduling/datos-bd/1"

# Generar horarios (sin guardar)
curl "http://localhost:3001/api/scheduling/generate-db"

# Generar y guardar
curl "http://localhost:3001/api/scheduling/generate-db?guardar=true"
```

---

## 📊 Flujo de Datos

```
┌─────────────────────┐
│   PostgreSQL        │
│  (datos académicos) │
└──────────┬──────────┘
           │ DataService
           ▼
┌─────────────────────┐
│  Datos Completos    │
│  {grupos, docentes, │
│   salones, franjas} │
└──────────┬──────────┘
           │ SchedulingService
           ▼
┌─────────────────────┐
│  Motor de Horarios  │
│  (Greedy o          │
│   Backtracking)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Asignaciones       │
│ (confirmadas/       │
│  conflictos)        │
└──────────┬──────────┘
           │ DataService.guardar
           ▼
┌─────────────────────┐
│  horario_asignado   │
│  (tabla BD)         │
└─────────────────────┘
```

---

## 💻 Estructura de Datos desde BD

### Grupos (desde tabla `grupos`)
```json
{
  "id": 1,
  "nombre": "IS-201 - Grupo A",
  "materia_codigo": "IS-201",
  "jornada": "Diurna",
  "modalidad": "presencial",
  "sede_codigo": "NORTE",
  "cupo_max": 30,
  "cupo_estimado": 28,
  "tipo_aula_requerida": "presencial",
  "prioridad": 5
}
```

### Docentes (desde tabla `docentes`)
```json
{
  "id": 1,
  "nombre": "Dr. Juan Pérez",
  "disponibilidad": "Diurna",
  "carga_max_horas": 40,
  "horas_asignadas": 15
}
```

### Salones (desde tabla `salones`)
```json
{
  "id": 20,
  "codigo": "AU-101",
  "tipo": "presencial",
  "capacidad": 30,
  "sede_codigo": "NORTE"
}
```

### Franjas (desde tabla `franjas_horarias`)
```json
{
  "id": 100,
  "dia": "Lunes",
  "jornada": "Diurna",
  "hora_inicio": "07:00",
  "hora_fin": "10:00"
}
```

---

## 🔍 Queries SQL Principales

### Obtener Grupos
```sql
SELECT g.id, m.codigo, m.nombre, j.nombre as jornada,
       g.cupo_max, COUNT(i.id) as cupo_estimado
FROM grupos g
JOIN materias m ON g.materia_id = m.id
JOIN jornadas j ON g.jornada_id = j.id
LEFT JOIN inscripciones i ON g.id = i.grupo_id
WHERE g.periodo_id = $1 AND g.estado != 'cancelado'
GROUP BY g.id, m.codigo, j.nombre
```

### Obtener Docentes con Carga
```sql
SELECT d.id, d.nombre, d.disponibilidad, d.carga_max_horas,
       SUM(EXTRACT(EPOCH FROM (bh.hora_fin - bh.hora_inicio)) / 3600) 
         as horas_asignadas
FROM docentes d
LEFT JOIN horario_asignado ha ON d.id = ha.docente_id
LEFT JOIN franjas_horarias fh ON ha.franja_id = fh.id
LEFT JOIN bloques_horarios bh ON fh.bloque_id = bh.id
WHERE d.activo = TRUE
GROUP BY d.id
```

### Obtener Franjas Completas
```sql
SELECT fh.id, fh.dia, j.nombre as jornada, bh.hora_inicio, bh.hora_fin
FROM franjas_horarias fh
JOIN bloques_horarios bh ON fh.bloque_id = bh.id
JOIN jornadas j ON bh.jornada_id = j.id
WHERE fh.periodo_id = $1
ORDER BY j.id, fh.dia, bh.orden
```

---

## 🎯 Características Clave

| Aspecto | Detalles |
|--------|---------|
| **Lectura de Datos** | Queries optimizadas con JOINs y GROUP BY |
| **Cálculo de Carga** | Suma de horas de bloques asignados |
| **Inscripciones** | Cupo estimado = MIN(inscritos, cupo_max) |
| **Período Activo** | Búsqueda automática o manual via parámetro |
| **Guardado** | Transacciones individuales con manejo de errores |
| **Concurrencia** | Pool de conexiones (max 10) |
| **Logging** | Trazabilidad de cada operación |

---

## ✅ Checklist de Integración

- [x] DataService creado con 8 métodos principales
- [x] Lectura desde tablas `grupos`, `docentes`, `salones`, `franjas_horarias`
- [x] Cálculo de cupo estimado basado en inscripciones
- [x] Cálculo de carga docente basado en asignaciones
- [x] Obtención automática de período activo
- [x] 3 nuevos endpoints GET integrados
- [x] Guardado de asignaciones en tabla `horario_asignado`
- [x] Demo con datos reales de BD
- [x] Documentación completa

---

## 🚨 Casos de Uso Comunes

### Generar horarios automáticamente al cambiar periodo
```bash
GET /api/scheduling/generate-db?guardar=true
```

### Comparar estrategias en mismo período
```bash
# Greedy
GET /api/scheduling/generate-db?estrategia=greedy
# vs
# Backtracking
GET /api/scheduling/generate-db?estrategia=backtracking_simple
```

### Verificar datos antes de generar
```bash
GET /api/scheduling/datos-bd/1
# Revisar cantidad de grupos, docentes, etc.
```

### Generar para período específico
```bash
GET /api/scheduling/generate-db?periodoId=2&guardar=true
```

---

## 📈 Próximos Pasos Opcionales

1. **Validación de Disponibilidad**: Usar tabla `disponibilidad_docente`
2. **Restricciones Complejas**: Integrar tabla `conflictos_detectados`
3. **Audit Trail**: Registrar quién genera horarios y cuándo
4. **Webhooks**: Notificar al frontend cuando se completen
5. **Caché**: Cachear datos por período para performance
6. **Reporting**: Generar reportes de asignaciones
7. **Rollback**: Opción para revertir asignaciones

---

## 📞 Soporte

Para problemas:
1. Revisa [DATABASE_INTEGRATION_DOCS.md](DATABASE_INTEGRATION_DOCS.md)
2. Ejecuta `npm run demo:scheduling-bd` para debugging
3. Verifica logs en consola (incluyen contexto)
4. Revisa queries SQL manuales en PostgreSQL

---

**✅ Integración con BD completada exitosamente**

El motor ahora lee datos reales y puede guardar resultados.

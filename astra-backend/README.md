# AstraSchedule — REST API

Backend Express + PostgreSQL sobre el motor de horarios UNIAJC.

## Instalación

```bash
# Dentro del repo original (AstraSchedule/) crear la carpeta backend:
cd AstraSchedule
mkdir backend && cd backend

# Copiar todos los archivos de este directorio aquí, luego:
npm install
cp .env.example .env
# Editar .env con tus credenciales reales
```

## Estructura del proyecto

```
AstraSchedule/
├── db/                  ← Schema y triggers PostgreSQL (existente)
├── scripts/             ← db.js, setup-db.js, validate-integrity.js (existente)
├── seed/                ← Seeds (existente)
├── tools/               ← 19 funciones del motor (existente — NO se modifica)
├── agent.js             ← CLI original (existente — NO se modifica)
│
└── backend/             ← ★ NUEVO — este proyecto
    ├── src/
    │   ├── config/
    │   │   ├── db.js        ← Pool PostgreSQL
    │   │   └── groq.js      ← Cliente Groq
    │   ├── middleware/
    │   │   ├── asyncWrapper.js
    │   │   ├── errorHandler.js
    │   │   └── validators.js   ← Esquemas Zod
    │   ├── services/           ← Lógica de negocio + queries SQL
    │   │   ├── horarios.service.js
    │   │   ├── docentes.service.js
    │   │   ├── salones.service.js
    │   │   ├── grupos.service.js
    │   │   ├── conflictos.service.js
    │   │   ├── dashboard.service.js
    │   │   └── ai.service.js
    │   ├── routes/
    │   │   ├── horarios.routes.js
    │   │   ├── docentes.routes.js
    │   │   ├── salones.routes.js
    │   │   ├── grupos.routes.js
    │   │   ├── conflictos.routes.js
    │   │   ├── dashboard.routes.js
    │   │   └── ai.routes.js
    │   └── server.js           ← Punto de entrada
    ├── .env.example
    └── package.json
```

## Arranque

```bash
# Modo desarrollo (hot-reload con --watch de Node 18+)
npm run dev

# Producción
npm start
```

## Endpoints completos

### 🩺 Health
```
GET /health
```

### 📊 Dashboard
```
GET  /api/dashboard                              # Stats globales + por programa + por jornada/sede
GET  /api/dashboard/semana?sede_codigo=NORTE&jornada_codigo=Diurna
```

### 📅 Horarios
```
GET  /api/horarios                               # Todos (filtros: estado, programa_id, jornada, sede)
GET  /api/horarios/resumen?programa_id=IS&jornada=Diurna&modalidad=presencial&sede=NORTE
GET  /api/horarios/sin-horario?programa_id=IS&jornada=Diurna&semestre=2
GET  /api/horarios/:id
POST /api/horarios/proponer                      # { grupo_id, restricciones? }
POST /api/horarios/asignar                       # { grupo_id, docente_id, aula_id, dia, hora_inicio, hora_fin, es_definitiva? }
PATCH /api/horarios/:id/estado                   # { nuevo_estado, motivo? }
POST  /api/horarios/:id/contrapropuesta          # { nueva_franja_sugerida: { dia, hora_inicio, hora_fin } }
GET  /api/horarios/reporte/:grupo_id
```

### 👨‍🏫 Docentes
```
GET  /api/docentes                               # Todos (filtros: tipo, disponibilidad, activo)
GET  /api/docentes/sobrecarga                    # Docentes que exceden carga_max_horas
GET  /api/docentes/disponibles?dia=Lunes&hora_inicio=07:00&hora_fin=10:00
GET  /api/docentes/:id
GET  /api/docentes/:id/carga
GET  /api/docentes/:id/disponibilidad
```

### 🏫 Salones
```
GET  /api/salones                                # Todos (filtros: sede_id, tipo, disponible)
GET  /api/salones/disponibles?dia=Lunes&hora_inicio=07:00&hora_fin=10:00&capacidad_minima=30
GET  /api/salones/ocupacion
```

### 👥 Grupos y Materias
```
GET  /api/grupos                                 # Filtros: programa_id, jornada, sede_id, modalidad, semestre
GET  /api/grupos/:id
GET  /api/materias                               # Filtros: programa_id, semestre, activa
```

### ⚠️ Conflictos
```
GET  /api/conflictos                             # Filtros: resuelto, tipo
GET  /api/conflictos/resumen
GET  /api/conflictos/detectar                    # Ejecuta detección activa (queries SQL)
PATCH /api/conflictos/:id/resolver
```

### 🤖 Agente IA
```
POST /api/ai/chat
Body: {
  "message": "¿Cuántos grupos de IS sin horario en jornada Diurna?",
  "history": [],        // opcional — historial para contexto conversacional
  "stream": false       // true para SSE streaming
}
```

**Respuesta normal (stream=false):**
```json
{
  "ok": true,
  "data": {
    "content": "Según el resumen, hay 80 grupos...",
    "tool_calls": [
      {
        "tool": "obtenerResumenEstado",
        "args": { "programa_id": "IS", "jornada": "Diurna", "modalidad": "presencial" },
        "result": { "total_grupos": 80, "sin_horario": 32, ... }
      }
    ]
  }
}
```

**Streaming SSE (stream=true):**
```
data: {"type":"tool_call","payload":{"tool":"obtenerResumenEstado","args":{...},"result":{...}}}
data: {"type":"delta","content":"Según "}
data: {"type":"delta","content":"el resumen, "}
...
data: {"type":"done"}
```

## Formato de respuesta estándar

**Éxito:**
```json
{ "ok": true, "data": {...}, "count": 42 }
```

**Error:**
```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {...} } }
```

## Variables de entorno

Ver `.env.example`. Las mismas que el proyecto original más `PORT` y `CORS_ORIGIN`.

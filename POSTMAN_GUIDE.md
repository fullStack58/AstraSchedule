# Guía: Probar Endpoints con Postman

## 1. Descargar e Instalar Postman
- Descarga desde: https://www.postman.com/downloads/
- Instala la versión desktop (recomendado)
- Abre Postman

## 2. Importar la Colección

### Opción A: Importar archivo JSON (RECOMENDADO)
1. En Postman, haz clic en **"Import"** (arriba a la izquierda)
2. Selecciona **"File"** → **"Upload Files"**
3. Navega a: `AstraSchedule-Scheduling-API.postman_collection.json`
4. Haz clic en **"Import"**
5. ✅ Todos los endpoints aparecerán en el panel izquierdo

### Opción B: Crear manualmente
Si prefieres, puedes crear requests manualmente siguiendo los ejemplos abajo.

---

## 3. Preparar el Servidor

Asegúrate de que el servidor está corriendo:

```powershell
cd "d:\BRYAN ANDRES VASQUEZ\Documents\Proyecto motor\AstraSchedule\astra-backend"
npm start
```

Deberías ver:
```
✅ PostgreSQL conectado → uniajc_horarios
🚀 AstraSchedule API corriendo en http://localhost:3001
```

---

## 4. Endpoints Disponibles

### 🟦 BD Integration (Desde Base de Datos)

#### 1️⃣ Get Active Period
```
GET http://localhost:3001/api/scheduling/periodo-activo
```
**Respuesta:**
```json
{
  "ok": true,
  "data": {
    "id": 3,
    "codigo": "2026-1",
    "nombre": "Primer semestre 2026"
  }
}
```

#### 2️⃣ Get BD Data
```
GET http://localhost:3001/api/scheduling/datos-bd/3
```
**Parámetro:** `3` = ID del período

**Respuesta:**
```json
{
  "ok": true,
  "data": {
    "grupos": [...354 grupos],
    "docentes": [...10 docentes],
    "salones": [...32 salones],
    "franjas": [...20 franjas]
  }
}
```

#### 3️⃣ Generate Schedule (GREEDY - Solo visualizar)
```
GET http://localhost:3001/api/scheduling/generate-db?periodoId=3&estrategia=greedy&guardar=false
```

**Parámetros Query:**
- `periodoId=3` (ID del período)
- `estrategia=greedy` (o `backtracking`)
- `guardar=false` (true = guardar en BD)

**Respuesta:**
```json
{
  "ok": true,
  "data": {
    "asignaciones": [
      {
        "grupo": {...},
        "status": "confirmado",
        "reason": "Asignación greedy",
        "candidato": {...}
      }
    ],
    "estadisticas": {
      "total_grupos": 354,
      "confirmados": 135,
      "conflictos": 219,
      "tasa_exito": "0.38"
    }
  }
}
```

#### 4️⃣ Generate Schedule (BACKTRACKING - Más lento, mejor resultado)
```
GET http://localhost:3001/api/scheduling/generate-db?periodoId=3&estrategia=backtracking&guardar=false
```

#### 5️⃣ Generate Schedule (Guardar en BD)
```
GET http://localhost:3001/api/scheduling/generate-db?periodoId=3&estrategia=greedy&guardar=true
```

---

### 🟦 Manual Input (Datos Hardcodeados)

#### 1️⃣ Generate Schedule (Manual)
```
POST http://localhost:3001/api/scheduling/generate
Content-Type: application/json
```

**Body:**
```json
{
  "grupos": [
    {
      "id": 1,
      "nombre": "IS-101 - Grupo A",
      "materia_codigo": "IS-101",
      "jornada": "Diurna",
      "modalidad": "presencial",
      "sede_codigo": "NORTE",
      "cupo_max": 30,
      "cupo_estimado": 10,
      "tipo_aula_requerida": "presencial",
      "prioridad": 1
    }
  ],
  "docentes": [
    {
      "id": 1,
      "nombre": "Juan García",
      "disponibilidad": "Ambas",
      "carga_max_horas": 20,
      "horas_asignadas": 0
    }
  ],
  "salones": [
    {
      "id": 1,
      "codigo": "N-001",
      "tipo": "presencial",
      "capacidad": 30,
      "sede_codigo": "NORTE"
    }
  ],
  "franjas": [
    {
      "id": 1,
      "dia": "Lunes",
      "jornada": "Diurna",
      "hora_inicio": "07:00",
      "hora_fin": "10:00"
    }
  ],
  "reglas": {
    "permitir_clases_consecutivas": true,
    "requiere_paz_y_salvo": false,
    "validar_prerequisitos": true
  }
}
```

#### 2️⃣ Validate Schedule
```
POST http://localhost:3001/api/scheduling/validate
Content-Type: application/json
```

Mismo body que Generate Schedule (solo valida sin procesar)

#### 3️⃣ Schedule Single Group
```
POST http://localhost:3001/api/scheduling/group
Content-Type: application/json
```

**Body:**
```json
{
  "grupo": {
    "id": 1,
    "nombre": "IS-101 - Grupo A",
    "materia_codigo": "IS-101",
    "jornada": "Diurna",
    "modalidad": "presencial",
    "sede_codigo": "NORTE",
    "cupo_max": 30,
    "cupo_estimado": 10,
    "tipo_aula_requerida": "presencial",
    "prioridad": 1
  },
  "docentes": [
    {
      "id": 1,
      "nombre": "Juan García",
      "disponibilidad": "Ambas",
      "carga_max_horas": 20,
      "horas_asignadas": 0
    }
  ],
  "salones": [
    {
      "id": 1,
      "codigo": "N-001",
      "tipo": "presencial",
      "capacidad": 30,
      "sede_codigo": "NORTE"
    }
  ],
  "franjas": [
    {
      "id": 1,
      "dia": "Lunes",
      "jornada": "Diurna",
      "hora_inicio": "07:00",
      "hora_fin": "10:00"
    }
  ]
}
```

---

## 5. Paso a Paso para Probar

### Flujo Recomendado:

1. **Verifica período activo:**
   - Haz clic en "1. Get Active Period"
   - Haz clic en **Send**
   - Deberías ver `codigo: "2026-1"`

2. **Obtén datos de BD:**
   - Haz clic en "2. Get BD Data by Period"
   - Haz clic en **Send**
   - Verifica que ves 354 grupos, 10 docentes, etc.

3. **Prueba GREEDY (rápido, 38% éxito):**
   - Haz clic en "3. Generate Schedule (GREEDY - No Save)"
   - Haz clic en **Send**
   - Espera ~10-15 segundos
   - Verás: `confirmados: 135, conflictos: 219`

4. **Prueba BACKTRACKING (lento, ~90% éxito):**
   - Haz clic en "3b. Generate Schedule (BACKTRACKING - No Save)"
   - Haz clic en **Send**
   - Espera ~30-60 segundos (más grupos = más tiempo)
   - Deberías ver mayor cantidad de confirmados

5. **Guarda en BD:**
   - Haz clic en "4. Generate Schedule (GREEDY - Save to BD)"
   - Haz clic en **Send**
   - Verás `guardado: true`

---

## 6. Interpretar Respuestas

### Asignación Exitosa
```json
{
  "grupo": {...},
  "status": "confirmado",
  "reason": "Asignación greedy",
  "candidato": {
    "grupo": 1,
    "docente": 1,
    "salon": 1,
    "franja": 1,
    "score": 36.92
  }
}
```

### Sin Candidato Válido
```json
{
  "grupo": {...},
  "status": "conflicto",
  "reason": "No existe candidato válido",
  "candidato": null
}
```

### Estadísticas
```json
{
  "estadisticas": {
    "total_grupos": 354,
    "confirmados": 135,
    "conflictos": 219,
    "tasa_exito": "0.38"
  }
}
```

---

## 7. Troubleshooting

| Problema | Solución |
|----------|----------|
| "Cannot GET /api/scheduling/..." | Asegúrate que npm start está ejecutándose |
| "Connection refused" | Revisa que el puerto 3001 esté libre |
| "Cannot connect to localhost:3001" | Verifica que PostgreSQL está corriendo |
| Endpoint retorna 500 | Revisa los logs del servidor |

---

## 8. Variables de Entorno (Postman)

Para reutilizar valores, puedes crear variables:

1. En Postman, haz clic en "Environments" (arriba)
2. Haz clic en "+" para crear nuevo environment
3. Agrega:
   - `base_url` = `http://localhost:3001`
   - `periodo_id` = `3`
   - `estrategia` = `greedy`

4. En los requests, reemplaza valores:
   - `{{base_url}}/api/scheduling/datos-bd/{{periodo_id}}`

---

## 9. Exportar Resultados

Para guardar resultados de un request:

1. En Postman, haz clic en el botón **"..."** en la respuesta
2. Selecciona **"Save response"**
3. Elige ubicación y nombre

---

**¡Listo!** Ya puedes probar todos los endpoints. 🚀

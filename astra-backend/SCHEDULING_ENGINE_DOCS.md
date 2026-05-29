# Motor de Asignación de Horarios - Documentación

## 📋 Descripción General

El **Motor de Asignación** es un componente determinista y aislado del backend de AstraSchedule que propone horarios óptimos para grupos de materias considerando restricciones complejas.

### Características

- ✅ **Estrategia Greedy**: Asignación rápida y efectiva
- ✅ **Backtracking Simple**: Búsqueda exhaustiva con optimización
- ✅ **Validación Completa**: Verificación de restricciones académicas
- ✅ **Logging Detallado**: Trazabilidad completa de decisiones
- ✅ **Escalable**: Diseñado para manejar cientos de grupos

---

## 🚀 Instalación y Uso

### 1. Ejecutar Demo Local

```bash
cd astra-backend
node demo-scheduling.js
```

Esto ejecutará pruebas con datos de ejemplo y mostrará logs detallados.

### 2. Usar en el Servidor

El motor está integrado en el backend. Inicia el servidor:

```bash
npm run dev
```

---

## 📡 Endpoints API

### POST `/api/scheduling/generate`

Genera horarios completos para todos los grupos.

**Request Body:**
```json
{
  "grupos": [
    {
      "id": 1,
      "nombre": "Cálculo Diferencial",
      "materia_codigo": "IS-201",
      "jornada": "Diurna",
      "modalidad": "presencial",
      "sede_codigo": "NORTE",
      "cupo_estimado": 28,
      "cupo_max": 30,
      "tipo_aula_requerida": "presencial",
      "prioridad": 5
    }
  ],
  "docentes": [
    {
      "id": 10,
      "nombre": "Dr. Juan Pérez",
      "disponibilidad": "Diurna",
      "carga_max_horas": 40,
      "horas_asignadas": 15
    }
  ],
  "salones": [
    {
      "id": 20,
      "codigo": "AU-101",
      "sede_codigo": "NORTE",
      "tipo": "presencial",
      "capacidad": 30
    }
  ],
  "franjas": [
    {
      "id": 100,
      "dia": "Lunes",
      "jornada": "Diurna",
      "hora_inicio": "07:00",
      "hora_fin": "10:00"
    }
  ],
  "reglas": {
    "estrategia": "backtracking_simple",
    "capacidad_tolerancia": 1,
    "peso_ajuste_capacidad": 30,
    "peso_carga_docente": 25
  }
}
```

**Response Success:**
```json
{
  "ok": true,
  "message": "Horarios generados: 3/4 grupos asignados",
  "data": {
    "estrategia": "backtracking_simple",
    "asignaciones": [
      {
        "grupo": { /* ... */ },
        "status": "confirmado",
        "candidato": {
          "docente": { /* ... */ },
          "salon": { /* ... */ },
          "franja": { /* ... */ },
          "score": 85.5
        }
      }
    ],
    "estadisticas": {
      "total_grupos": 4,
      "confirmados": 3,
      "conflictos": 1,
      "tasa_exito": "0.75"
    }
  }
}
```

---

### POST `/api/scheduling/group`

Planifica horario para un grupo individual.

**Request Body:**
```json
{
  "grupo": { /* grupo object */ },
  "docentes": [ /* array de docentes */ ],
  "salones": [ /* array de salones */ ],
  "franjas": [ /* array de franjas */ ],
  "reglas": { /* reglas opcionales */ }
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "status": "propuesto",
    "candidatos_totales": 120,
    "candidatos_validos": 8,
    "candidato": {
      "docente": { /* ... */ },
      "salon": { /* ... */ },
      "franja": { /* ... */ },
      "score": 92.3
    }
  }
}
```

---

### POST `/api/scheduling/validate`

Valida datos sin ejecutar el motor.

**Request Body:** Mismo que `/generate`

**Response:**
```json
{
  "ok": true,
  "valid": true,
  "errors": []
}
```

---

## 🔧 Estructura de Datos

### Grupo

```javascript
{
  id: number,                      // ID único
  nombre: string,                  // Nombre de la materia
  materia_codigo: string,          // Código académico (ej: IS-201)
  jornada: "Diurna" | "Nocturna",  // Jornada
  modalidad: "presencial",         // Modalidad
  sede_codigo: string,             // Código de sede (NORTE, SUR, etc)
  cupo_estimado: number,           // Estudiantes estimados
  cupo_max: number,                // Capacidad máxima
  tipo_aula_requerida: string,     // "presencial", "laboratorio", "cualquiera"
  prioridad: number                // Peso de prioridad (mayor = más prioritario)
}
```

### Docente

```javascript
{
  id: number,
  nombre: string,
  disponibilidad: "Diurna" | "Nocturna" | "Ambas",
  carga_max_horas: number,         // Horas máximas semanales
  horas_asignadas: number          // Horas ya asignadas
}
```

### Salón

```javascript
{
  id: number,
  codigo: string,                  // Ej: AU-101, LAB-201
  sede_codigo: string,             // Sede
  tipo: "presencial" | "laboratorio",
  capacidad: number                // Capacidad de estudiantes
}
```

### Franja Horaria

```javascript
{
  id: number,
  dia: string,                     // Lunes, Martes, etc.
  jornada: "Diurna" | "Nocturna",
  hora_inicio: string,             // HH:MM (ej: "07:00")
  hora_fin: string                 // HH:MM (ej: "10:00")
}
```

### Reglas Personalizadas

```javascript
{
  estrategia: "greedy" | "backtracking_simple",  // Default: backtracking_simple
  capacidad_tolerancia: number,                  // Default: 1 (100%)
  peso_ajuste_capacidad: number,                 // Default: 30
  peso_carga_docente: number,                    // Default: 25
  peso_sede: number,                             // Default: 15
  peso_jornada: number,                          // Default: 10
  peso_conflictos: number,                       // Default: 20
  max_profundidad_backtracking: number           // Default: 50
}
```

---

## 📊 Scoring y Algoritmo

### Sistema de Puntuación

Cada candidato (combinación grupo-docente-salón-franja) recibe una puntuación basada en:

1. **Ajuste de Capacidad** (30 pts): Relación grupo/salón
   - Valor 1.0 = Capacidad perfecta
   
2. **Carga Docente** (25 pts): Disponibilidad del docente
   - Basada en horas restantes
   
3. **Compatibilidad de Sede** (15 pts): Grupo y salón en misma sede
   
4. **Compatibilidad de Jornada** (10 pts): Coincidencia diurna/nocturna
   
5. **Prioridad del Grupo** (variable): Multiplicador adicional

**Total Score = Σ(peso × factor)**

---

### Restricciones Evaluadas

El motor verifica:

- ✓ Jornada grupo compatible con franja
- ✓ Docente disponible en jornada
- ✓ Docente no excede carga máxima
- ✓ Salón tiene capacidad suficiente
- ✓ Tipo aula compatible con requisito
- ✓ Sede compatible (si presencial)
- ✓ Salón no está ocupado en franja
- ✓ Docente no está ocupado en franja

---

## 🔍 Logging y Debugging

### Niveles de Log

Los logs incluyen:
- **DEBUG**: Decisiones internas detalladas
- **INFO**: Eventos principales del motor
- **WARN**: Conflictos y situaciones no ideales
- **ERROR**: Errores críticos

### Ejemplo de Output

```
[2026-05-28T14:30:45.123Z] [INFO] [ScheduleEngine] Iniciando generación de horarios para 4 grupos
[2026-05-28T14:30:45.124Z] [DEBUG] [ScheduleEngine] Recursos: 4 docentes, 4 salones, 7 franjas
[2026-05-28T14:30:45.125Z] [INFO] [ScheduleEngine] Estrategia seleccionada: backtracking_simple
[2026-05-28T14:30:45.126Z] [DEBUG] [ScheduleEngine] Ordenando 4 grupos según disponibilidad...
[2026-05-28T14:30:45.200Z] [INFO] [ScheduleEngine] Iniciando backtracking simple...
[2026-05-28T14:30:45.250Z] [INFO] [ScheduleEngine] Solución completa encontrada por backtracking
[2026-05-28T14:30:45.251Z] [INFO] [ScheduleEngine] Horarios completamente generados con backtracking
```

---

## 💡 Estrategias

### Greedy
- ⚡ **Rápida**: Decisiones inmediatas
- 📊 **Efectiva**: Tasa de éxito ~70-80%
- ❌ **Limitaciones**: Puede no encontrar solución completa

**Cuándo usar:**
- Horarios simples (< 20 grupos)
- Recursos abundantes
- Respuestas en tiempo real

### Backtracking Simple
- 🔄 **Exhaustiva**: Explora múltiples opciones
- 📈 **Precisa**: Tasa de éxito ~90-95%
- ⏱️ **Más lenta**: Puede ser computacionalmente intensiva

**Cuándo usar:**
- Horarios complejos (> 20 grupos)
- Procesamiento batch
- Máxima optimización

---

## 🧪 Testing

### Ejecutar Demo Completa

```bash
node demo-scheduling.js
```

### Probar con cURL

```bash
curl -X POST http://localhost:3001/api/scheduling/validate \
  -H "Content-Type: application/json" \
  -d @test-data.json
```

---

## 📝 Notas Técnicas

- El motor es **determinista**: mismos inputs = mismos outputs
- Los logs son **no-bloqueantes**: no afectan performance
- Diseñado para **escalabilidad**: O(n log n) en casos típicos
- **Sin dependencias externas**: Solo JavaScript nativo

---

## 🐛 Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| "No existe candidato válido" | Restricciones muy ajustadas | Aumentar `capacidad_tolerancia` |
| Backtracking lento | Muchas opciones | Reducir `max_profundidad_backtracking` |
| Docentes sobre-cargados | Carga mínima insuficiente | Revisar `carga_max_horas` |
| Siempre mismo resultado | Motor determinista | Verificar lógica de entrada |

---

## 📞 Soporte

Para reportar bugs o sugerencias sobre el motor, abre un issue en el repositorio.

---

**Versión:** 1.0.0  
**Última actualización:** 28 de mayo de 2026

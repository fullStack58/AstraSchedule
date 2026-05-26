# AstraSchedule — Frontend React

Interfaz enterprise para el sistema de gestión de horarios académicos UNIAJC.  
Construido con **React 18 + TypeScript + Vite**, diseño basado en el mockup HuddleMate proporcionado.

## Estructura

```
astra-frontend/
├── index.html
├── vite.config.ts       ← proxy /api → localhost:3001
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx
    ├── App.tsx           ← React Router (9 rutas)
    ├── index.css         ← Design tokens + todos los estilos
    ├── types/
    │   └── schema.ts     ← Tipos alineados al schema PostgreSQL
    ├── services/
    │   └── api.ts        ← Capa de fetch hacia el backend REST
    ├── layouts/
    │   └── AppLayout.tsx ← Sidebar + Topbar + Outlet
    ├── components/
    │   └── atoms/
    │       └── index.tsx ← Tag, StatCard, ActionBtn, FilterBar, SectionHeader
    └── pages/
        ├── Dashboard.tsx   ← Hero cards + stats + sesiones + calendario + AI inline
        ├── Horarios.tsx    ← Vista semana + tabla de grupos con filtros
        ├── AgenteIA.tsx    ← Chat completo con Groq (full page)
        ├── Docentes.tsx    ← Tabla con barra de carga TC/MT
        ├── Salones.tsx     ← Grid de salones con ocupación
        ├── Grupos.tsx      ← Tabla filtrable de grupos
        ├── Conflictos.tsx  ← Lista + panel de recientes
        ├── Analytics.tsx   ← Métricas y distribución
        └── Config.tsx      ← Reglas configurables
```

## Instalación y arranque

```bash
# 1. Instalar dependencias
npm install

# 2. (Opcional) Levantar el backend primero en puerto 3001
#    cd ../backend && npm run dev

# 3. Arrancar el frontend
npm run dev
# → http://localhost:5173
```

El proxy de Vite redirige `/api/*` → `http://localhost:3001`.  
Si el backend no está corriendo, las páginas muestran datos de muestra (mock).

## Diseño

- Sidebar blanco + topbar, igual al mockup HuddleMate
- Cards hero con gradiente azul para accesos principales
- Tablas con tags de color por estado (`confirmado / propuesto / conflicto / sin_horario`)
- Vista semana de franjas con celdas animadas para conflictos
- Calendario lateral con eventos coloreados por tipo
- Panel IA conversacional con chips de sugerencias y tool calls visibles
- Barras de carga para docentes TC/MT con indicador de sobrecarga
- Grid de salones con indicador de ocupación verde/rojo

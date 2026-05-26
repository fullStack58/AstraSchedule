// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout  from './layouts/AppLayout';
import Dashboard  from './pages/Dashboard';
import Horarios   from './pages/Horarios';
import AgenteIA   from './pages/AgenteIA';
import Docentes   from './pages/Docentes';
import Salones    from './pages/Salones';
import Grupos     from './pages/Grupos';
import Conflictos from './pages/Conflictos';
import Analytics  from './pages/Analytics';
import Config     from './pages/Config';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index          element={<Dashboard />}  />
          <Route path="horarios"   element={<Horarios />}   />
          <Route path="ai"         element={<AgenteIA />}   />
          <Route path="docentes"   element={<Docentes />}   />
          <Route path="salones"    element={<Salones />}    />
          <Route path="grupos"     element={<Grupos />}     />
          <Route path="conflictos" element={<Conflictos />} />
          <Route path="analytics"  element={<Analytics />}  />
          <Route path="config"     element={<Config />}     />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Workspace from './pages/Workspace';
import Settings from './pages/Settings';
import Farewell from './pages/Farewell';

function AppInner() {
  const location = useLocation();
  const showSidebar = location.pathname !== '/farewell';
  return (
    <div className="app-container">
      {showSidebar && <Sidebar />}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/workspace" replace />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/farewell" element={<Farewell />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppInner />
    </Router>
  );
}

export default App;

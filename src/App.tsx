// src/App.tsx
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import TeamPage from './pages/TeamPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

// Wrapper component to pass teamId prop to TeamPage
const TeamWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <p>Invalid team ID</p>;
  return <TeamPage teamId={Number(id)} />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/teams/:id" element={<TeamWrapper />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Routes>
    </Router>
  );
}

export default App;

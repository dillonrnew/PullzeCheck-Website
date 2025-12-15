// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import TourneysPage from './pages/TourneysPage';
import TeamsPage from './pages/TeamsPage';
import SubmissionPage from './pages/SubmissionPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TourneysPage />} />
        <Route path="/tourney/:tournamentId" element={<TeamsPage />} />
        <Route path="/submit/:tournamentId/:teamNumber" element={<SubmissionPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

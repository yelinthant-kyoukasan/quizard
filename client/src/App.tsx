import { Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import AppLayout from "./layouts/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import LearnPage from "./pages/LearnPage";
import SubjectPage from "./pages/SubjectPage";
import QuizPage from "./pages/QuizPage";
import QuizResultPage from "./pages/QuizResultPage";
import ProfilePage from "./pages/ProfilePage";
import RanksPage from "./pages/RanksPage";
import ProtectedRoute from "./components/ProtectedRoute";
import FriendsPage from "./pages/FriendsPage";
import BattlesPage from "./pages/BattlesPage";
import BattlePlayPage from "./pages/BattlePlayPage";
import BattleFinishedPage from "./pages/BattleFinishedPage";
import TournamentPlayPage from "./pages/TournamentPlayPage";
import TournamentFinishedPage from "./pages/TournamentFinishedPage";
import TournamentLeaderboardPage from "./pages/TournamentLeaderboardPage";

// placeholder pages (for now)
const Placeholder = ({ title }: { title: string }) => (
  <div className="rounded-3xl border border-slate-200 bg-white/85 backdrop-blur p-5 shadow-sm">
    <div className="text-lg font-extrabold text-slate-900">{title}</div>
    <div className="text-sm text-slate-600 mt-1">Coming soon.</div>
  </div>
);

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="learn/:subjectId" element={<SubjectPage />} />
        <Route path="quiz/:lessonId" element={<QuizPage />} />
        <Route path="quiz-result" element={<QuizResultPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="leaderboard" element={<RanksPage />} />
        <Route path="friends" element={<FriendsPage />} />
        <Route path="/battles" element={<BattlesPage />} />
        <Route path="/battles/:battleId/finished" element={<BattleFinishedPage />} />
        <Route path="/battles/:battleId/play" element={<BattlePlayPage />} />
        <Route path="/tournaments/:tournamentId/play" element={<TournamentPlayPage />} />
        <Route path="/tournaments/:tournamentId/finished" element={<TournamentFinishedPage />} />
        <Route path="/tournaments/:tournamentId/leaderboard" element={<TournamentLeaderboardPage />} />
        <Route path="/leaderboard" element={<Placeholder title="Leaderboard" />} />
        <Route path="/profile" element={<Placeholder title="Profile" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

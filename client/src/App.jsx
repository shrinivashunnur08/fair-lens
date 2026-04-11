import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Upload from "./pages/Upload";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import TextAnalyzer from "./pages/TextAnalyzer";
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function PublicOrProtectedRoute({ children }) {
  const { loading } = useAuth();
  if (loading) return <PageLoader />;
  return children;
}

function PageLoader() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted font-body text-sm">Loading FairLens…</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Upload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/text-analyze"
          element={
            <ProtectedRoute>
              <TextAnalyzer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/:id"
          element={
            <PublicOrProtectedRoute>
              <Dashboard />
            </PublicOrProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

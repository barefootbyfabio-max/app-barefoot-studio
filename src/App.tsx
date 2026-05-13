import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Aulas from "./pages/Aulas";
import MeusAgendamentos from "./pages/MeusAgendamentos";
import Historico from "./pages/Historico";
import PendingApproval from "./pages/PendingApproval";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAlunos from "./pages/admin/AdminAlunos";
import AdminHorarios from "./pages/admin/AdminHorarios";
import AdminAlunosFixos from "./pages/admin/AdminAlunosFixos";
import AdminAprovacoes from "./pages/admin/AdminAprovacoes";
import AdminPresenca from "./pages/admin/AdminPresenca";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/aguardando-aprovacao" element={<PendingApproval />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/aulas" element={
              <ProtectedRoute>
                <Aulas />
              </ProtectedRoute>
            } />
            <Route path="/meus-agendamentos" element={
              <ProtectedRoute>
                <MeusAgendamentos />
              </ProtectedRoute>
            } />
            <Route path="/historico" element={
              <ProtectedRoute>
                <Historico />
              </ProtectedRoute>
            } />
            {/* Admin routes */}
            <Route path="/admin" element={
              <ProtectedRoute requireProfessor>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/aprovacoes" element={
              <ProtectedRoute requireProfessor>
                <AdminAprovacoes />
              </ProtectedRoute>
            } />
            <Route path="/admin/alunos" element={
              <ProtectedRoute requireProfessor>
                <AdminAlunos />
              </ProtectedRoute>
            } />
            <Route path="/admin/horarios" element={
              <ProtectedRoute requireProfessor>
                <AdminHorarios />
              </ProtectedRoute>
            } />
            <Route path="/admin/alunos-fixos" element={
              <ProtectedRoute requireProfessor>
                <AdminAlunosFixos />
              </ProtectedRoute>
            } />
            <Route path="/admin/presenca" element={
              <ProtectedRoute requireProfessor>
                <AdminPresenca />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

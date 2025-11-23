import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./components/AdminLayout";
import AthleteLayout from "./components/AthleteLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import About from "./pages/About";
import BlogArticlePage from "./pages/BlogArticlePage";
import BlogPage from "./pages/BlogPage";
import Contact from "./pages/Contact";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ArticleEditor from "./pages/admin/ArticleEditor";
import Dashboard from "./pages/admin/Dashboard";
import ExerciseLibrary from "./pages/admin/ExerciseLibrary";
import Login from "./pages/admin/Login";
import UserManagement from "./pages/admin/UserManagement";
import UserWorkouts from "./pages/admin/UserWorkouts";
import WorkoutEditor from "./pages/admin/WorkoutEditor";
import AthleteDashboard from "./pages/athlete/AthleteDashboard";
import WorkoutDetail from "./pages/athlete/WorkoutDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <LanguageProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogArticlePage />} />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="login" element={<Login />} />
                <Route
                  path="dashboard"
                  element={<Navigate to="/admin/users" replace />}
                />
                <Route path="articles" element={<Dashboard />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="exercises" element={<ExerciseLibrary />} />
                <Route path="editor" element={<ArticleEditor />} />
                <Route path="editor/:id" element={<ArticleEditor />} />
                <Route
                  path="users/:userId/workouts"
                  element={<UserWorkouts />}
                />
                <Route
                  path="users/:userId/workouts/new"
                  element={<WorkoutEditor />}
                />
                <Route
                  path="users/:userId/workouts/edit/:workoutId"
                  element={<WorkoutEditor />}
                />
              </Route>
              <Route
                path="/athlete"
                element={
                  <ProtectedRoute>
                    <AthleteLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<AthleteDashboard />} />
                <Route path="workout/:workoutId" element={<WorkoutDetail />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </LanguageProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

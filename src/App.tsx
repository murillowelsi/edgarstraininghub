import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import About from "./pages/About";
import BlogArticlePage from "./pages/BlogArticlePage";
import BlogPage from "./pages/BlogPage";
import Contact from "./pages/Contact";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/Login";
import AdminPostForm from "./pages/admin/PostForm";
import AdminPosts from "./pages/admin/Posts";
import AdminUserForm from "./pages/admin/UserForm";
import AdminUsers from "./pages/admin/Users";
import AdminWorkoutEditor from "./pages/admin/WorkoutEditor";
import AdminWorkouts from "./pages/admin/Workouts";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AuthProvider>
          <LanguageProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Index />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogArticlePage />} />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route
                  path="/admin/posts"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminPosts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/posts/new"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminPostForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/posts/:id/edit"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminPostForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminUsers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users/new"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminUserForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users/:id/edit"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminUserForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/workouts"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminWorkouts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/workouts/new"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminWorkoutEditor />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/workouts/:id/edit"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminWorkoutEditor />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

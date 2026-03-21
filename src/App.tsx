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
import AppEntry from "./pages/AppEntry";
import BlogArticlePage from "./pages/BlogArticlePage";
import BlogPage from "./pages/BlogPage";
import Contact from "./pages/Contact";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminCalendar from "./pages/admin/Calendar";
import AdminLogin from "./pages/admin/Login";
import AdminPostForm from "./pages/admin/PostForm";
import AdminPosts from "./pages/admin/Posts";
import AdminUserForm from "./pages/admin/UserForm";
import AdminUsers from "./pages/admin/Users";
import AdminStrengthWorkoutEditor from "./pages/admin/StrengthWorkoutEditor";
import AdminWorkoutEditor from "./pages/admin/WorkoutEditor";
import AdminWorkouts from "./pages/admin/Workouts";
import AthleteCalendarView from "./pages/athlete/CalendarView";
import AthleteHome from "./pages/athlete/Home";
import AthleteStrengthSession from "./pages/athlete/StrengthWorkoutSession";
import AthleteWorkoutsList from "./pages/athlete/WorkoutsList";
import AthleteWorkoutView from "./pages/athlete/WorkoutView";
import AdminChat from "./pages/admin/Chat";
import AthleteChat from "./pages/athlete/Chat";

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
                {/* PWA entry point — redirects to app based on auth state */}
                <Route path="/app" element={<AppEntry />} />

                {/* Public Routes */}
                <Route path="/" element={<Index />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogArticlePage />} />

                {/* Login Route */}
                <Route path="/login" element={<AdminLogin />} />

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
                <Route
                  path="/admin/workouts/strength/new"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminStrengthWorkoutEditor />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/workouts/strength/:id/edit"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminStrengthWorkoutEditor />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/calendar"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminCalendar />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/chat"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminChat />
                    </ProtectedRoute>
                  }
                />

                {/* Athlete Routes */}
                <Route
                  path="/athlete"
                  element={
                    <ProtectedRoute requireAthlete>
                      <AthleteHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/athlete/calendar"
                  element={
                    <ProtectedRoute requireAthlete>
                      <AthleteCalendarView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/athlete/workouts"
                  element={
                    <ProtectedRoute requireAthlete>
                      <AthleteWorkoutsList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/athlete/workout/:id"
                  element={
                    <ProtectedRoute requireAthlete>
                      <AthleteWorkoutView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/athlete/workout/:id/session"
                  element={
                    <ProtectedRoute requireAthlete>
                      <AthleteStrengthSession />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/athlete/chat"
                  element={
                    <ProtectedRoute requireAthlete>
                      <AthleteChat />
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

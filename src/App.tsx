import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PullToRefresh } from "./components/PullToRefresh";
import ScrollToTop from "./components/ScrollToTop";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TopBarMenuProvider } from "./contexts/TopBarMenuContext";
import { TimelineActionsProvider } from "./contexts/TimelineActionsContext";
import About from "./pages/About";
import AppEntry from "./pages/AppEntry";
import BlogArticlePage from "./pages/BlogArticlePage";
import BlogPage from "./pages/BlogPage";
import Contact from "./pages/Contact";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminCalendar from "./pages/admin/Calendar";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminLogin from "./pages/admin/Login";
import AdminPostForm from "./pages/admin/PostForm";
import AdminPosts from "./pages/admin/Posts";
import AdminUserForm from "./pages/admin/UserForm";
import AdminUsers from "./pages/admin/Users";
import AdminAthleteHistory from "./pages/admin/AthleteHistory";
import AdminStrengthWorkoutEditor from "./pages/admin/StrengthWorkoutEditor";
import AdminWorkoutEditor from "./pages/admin/WorkoutEditor";
import AdminWorkouts from "./pages/admin/Workouts";
import AthleteCalendarView from "./pages/athlete/CalendarView";
import AthleteHome from "./pages/athlete/Home";
import AthleteStrengthSession from "./pages/athlete/StrengthWorkoutSession";
import AthleteWorkoutsList from "./pages/athlete/WorkoutsList";
import AthleteWorkoutView from "./pages/athlete/WorkoutView";
import AdminChat from "./pages/admin/Chat";
import AdminTeams from "./pages/admin/Teams";
import AdminTeamDetail from "./pages/admin/TeamDetail";
import AdminTeamStats from "./pages/admin/TeamStats";
import AthleteChat from "./pages/athlete/Chat";
import AthleteTeams from "./pages/athlete/Teams";
import AthleteTeamDetail from "./pages/athlete/TeamDetail";
import JoinTeam from "./pages/JoinTeam";
import AdminTimeline from "./pages/admin/Timeline";
import AthleteTimeline from "./pages/athlete/Timeline";
import AthleteProfile from "./pages/athlete/Profile";
import AthleteActivityDetail from "./pages/athlete/ActivityDetail";
import AthleteEventDetail from "./pages/athlete/EventDetail";
import StravaCallback from "./pages/athlete/StravaCallback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AuthProvider>
          <LanguageProvider>
            <TopBarMenuProvider>
            <TimelineActionsProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <PullToRefresh />
              <Routes>
                {/* PWA entry point — redirects to app based on auth state */}
                <Route path="/app" element={<AppEntry />} />

                {/* Public Routes */}
                <Route path="/" element={<Index />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogArticlePage />} />
                {/* Team invite — public, no ProtectedRoute */}
                <Route path="/join/:inviteToken" element={<JoinTeam />} />

                {/* Login Route */}
                <Route path="/login" element={<AdminLogin />} />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
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
                  path="/admin/athletes/:athleteId"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminAthleteHistory />
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
                <Route
                  path="/admin/teams"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminTeams />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/teams/:teamId"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminTeamDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/teams/:teamId/stats"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminTeamStats />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/timeline"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminTimeline />
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
                <Route
                  path="/athlete/timeline"
                  element={
                    <ProtectedRoute requireAthlete>
                      <AthleteTimeline />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/athlete/teams"
                  element={
                    <ProtectedRoute requireAthlete>
                      <AthleteTeams />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/athlete/teams/:teamId"
                  element={
                    <ProtectedRoute requireAthlete>
                      <AthleteTeamDetail />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/athlete/profile"
                  element={
                    <ProtectedRoute requireAthlete>
                      <AthleteProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/athlete/events/:id"
                  element={
                    <ProtectedRoute requireAthlete>
                      <AthleteEventDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/athlete/activity/:id"
                  element={
                    <ProtectedRoute requireAthlete>
                      <AthleteActivityDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/strava/callback"
                  element={
                    <ProtectedRoute requireAthlete>
                      <StravaCallback />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            </TimelineActionsProvider>
            </TopBarMenuProvider>
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

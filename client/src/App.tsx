import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import NotFound from "@/pages/not-found";

// Landing page
import MainPage from "./pages/MainPage";

// Auth Pages
import AdminLogin from "@/pages/auth/AdminLogin";
import StudentLogin from "@/pages/auth/StudentLogin";

// Admin Pages
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminUsers from "@/pages/admin/Users";
import AdminCourses from "@/pages/admin/Courses";
import AdminClasses from "@/pages/admin/Classes";
import AdminTests from "@/pages/admin/Tests";
import AdminAssignments from "@/pages/admin/Assignments";
import AdminLeaderboard from "@/pages/admin/Leaderboard";
import AdminProfile from "@/pages/admin/Profile";

// Student Pages
import StudentDashboard from "@/pages/student/Dashboard";
import StudentCourses from "@/pages/student/MyCourses";
import CourseDetail from "@/pages/student/CourseDetail";
import StudentDailyTests from "@/pages/student/DailyTests";
import StudentLeaderboard from "@/pages/student/Leaderboard";
import StudentProfile from "@/pages/student/Profile";
import ClassView from "@/pages/student/ClassView";
import TestView from "@/pages/student/TestView";
import TestResults from "@/pages/student/TestResults";
import AssignmentResults from "@/pages/student/AssignmentResults";
import StudentAssignments from "@/pages/student/Assignments";
import AssignmentView from "@/pages/student/AssignmentView";

// Logout handler
import { useEffect } from "react";
import { logout } from "./lib/auth";

function LogoutHandler() {
  useEffect(() => {
    logout();
  }, []);
  return null;
}

function RootRedirect() {
  const [location, setLocation] = useLocation();
  const { isAdmin, isStudent } = useAuth();

  useEffect(() => {
    if (isAdmin) {
      setLocation("/admin/dashboard");
    } else if (isStudent) {
      setLocation("/student/dashboard");
    }
  }, [isAdmin, isStudent, setLocation]);

  return null;
}

function Router() {
  const { isLoggedIn } = useAuth();

  return (
    <Switch>
      {/* Auth Routes */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/student/login" component={StudentLogin} />
      <Route path="/logout" component={LogoutHandler} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/courses" component={AdminCourses} />
      <Route path="/admin/classes" component={AdminClasses} />
      <Route path="/admin/tests" component={AdminTests} />
      <Route path="/admin/assignments" component={AdminAssignments} />
      <Route path="/admin/leaderboard" component={AdminLeaderboard} />
      <Route path="/admin/profile" component={AdminProfile} />

      {/* Student Routes */}
      <Route path="/student/dashboard" component={StudentDashboard} />
      {/* <Route path="/student/courses" component={StudentCourses} /> */} {/* Hidden for students */}
      {/* <Route path="/student/courses/:id" component={CourseDetail} /> */} {/* Hidden for students */}
      {/* <Route path="/student/classes/:id" component={ClassView} /> */} {/* Hidden for students */}
      <Route path="/student/daily-tests" component={StudentDailyTests} /> {/* Hidden for students */}
      <Route path="/student/tests/:id" component={TestView} />
      <Route path="/student/tests/:id/results" component={TestResults} />
      <Route path="/student/assignments/:id" component={AssignmentView} />
      <Route path="/student/assignments/:id/results" component={AssignmentResults} />
      <Route path="/student/assignments" component={StudentAssignments} />
      <Route path="/student/leaderboard" component={StudentLeaderboard} />
      <Route path="/student/profile" component={StudentProfile} />

      {/* Root route with auth check */}
      <Route path="/">
        {() => {
          if (!isLoggedIn) {
            return <MainPage />;
          }
          return <RootRedirect />;
        }}
      </Route>

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

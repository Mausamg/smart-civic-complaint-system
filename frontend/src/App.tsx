import { Navigate,Route,Routes,useLocation } from "react-router-dom";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { PublicLayout } from "./components/layout/PublicLayout";
import { ToastContainer } from "./components/ui/Toast";
import { AppProvider,useApp } from "./context/AppContext";

// Public Pages
import { AboutPage } from "./pages/public/AboutPage";
import { ContactPage } from "./pages/public/ContactPage";
import { FAQPage } from "./pages/public/FAQPage";
import { LandingPage } from "./pages/public/LandingPage";
import { PublicMapPage } from "./pages/public/PublicMapPage";
import { TrackPage } from "./pages/public/TrackPage";

// Auth Pages
import { ForgotPasswordPage } from "./pages/auth/ForgetPasswordPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegsiterPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";

// Citizen Pages
import { AnnouncementsPage } from "./pages/citizen/AnnouncementsPage";
import { CitizenDashboard } from "./pages/citizen/CitizenDashboard";
import { ComplaintDetailsPage } from "./pages/citizen/ComplaintDetailsPage";
import {
  FeedbackPage,
  HelpSupportPage,
  SavedDraftsPage,
} from "./pages/citizen/MiscPages";
import { MyComplaintsPage } from "./pages/citizen/MyComplaintsPage";
import { AdminNotificationsPage } from "./pages/admin/AdminNotificationsPage";
import { CitizenNotificationsPage } from "./pages/citizen/CitizenNotificationsPage";
import { ProfileSettingsPage } from "./pages/citizen/ProfileSettingsPage";
import { ReportComplaintPage } from "./pages/citizen/ReportComplaintPage";
import { PublicMapPage as CitizenMapPage } from "./pages/public/PublicMapPage";

// Staff Pages
import { StaffAssignedPage } from "./pages/staff/StaffComplaintPage";
import { StaffDashboard } from "./pages/staff/StaffDashboard";
import { StaffComplaintDetailsPage } from "./pages/staff/StaffComplaintDetailsPage";
import { StaffMapPage } from "./pages/staff/StaffMapPage";
import { StaffNotificationsPage } from "./pages/staff/StaffNotificationsPage";
import { StaffMessagesPage } from "./pages/staff/StaffMessagesPage";

// Admin Pages
import { AdminComplaintsLive } from "./components/complaints/AdminComplaintsLive";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminComplaintDetailsPage } from "./pages/admin/AdminComplaintDetailsPage";
import { AnalyticsPage } from "./pages/admin/AnalyticsPage";
import { AdminAssignmentLive } from "./pages/admin/AdminAssignmentLive";
import { DepartmentsPage } from "./pages/admin/DepartmentsPage";
import { AdminStaffLive } from "./pages/admin/AdminStaffLive";
import { AdminStaffDetailsPage } from "./pages/admin/AdminStaffDetailsPage";
import { EscalationsPage } from "./pages/admin/EscalationsPage";

function RequireRole({ role, children }: { role: 'citizen' | 'staff' | 'admin'; children: React.ReactNode }) {
  const { role:current } = useApp();
  const location = useLocation();
  if (!current) return <Navigate to="/login" state={{ from:location }} replace />;
  if ( current !== role) return <Navigate to={`/${current}/dashboard`} replace />;
  return <>{children}</>
  }

function AppRoutes() {
  const { role, authLoading } = useApp();

  if (authLoading) {
    return (
        <div
            role="status"
            className="flex min-h-screen items-center justify-center bg-ink-50 text-ink-600 dark:bg-ink-950 dark:text-ink-300"
        >
          Restoring your CivicLink session...
        </div>
    );
  }
  return(
    <>
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicLayout><LandingPage/></PublicLayout>}/>
      <Route path="/about" element={<PublicLayout><AboutPage/></PublicLayout>}/>
      <Route path="/contact" element={<PublicLayout><ContactPage/></PublicLayout>}/>
      <Route path="/faq" element={<PublicLayout><FAQPage/></PublicLayout>}/>
      <Route path="/track" element={<PublicLayout><TrackPage/></PublicLayout>}/>
      <Route path="/map" element={<PublicLayout><PublicMapPage/></PublicLayout>}/>
      <Route path="/report" element={role === 'citizen'? <Navigate to="/citizen/report" replace />:<PublicLayout><ReportComplaintPage/></PublicLayout>}/>

      {/* Auth Routes */}
      <Route path="/login" element={ role? <Navigate to={`/${role}/dashboard`} replace />:<LoginPage/>}/>
      <Route path="/register" element={ role? <Navigate to={`/${role}/dashboard`} replace />:<RegisterPage/>}/>
      <Route path="/forgot-password" element={<ForgotPasswordPage/>}/>
      <Route path="/reset-password" element={<ResetPasswordPage/>}/>
      <Route path="/verify-email" element={<Navigate to="/register" replace />} />

      {/* Citizen Routes */}
      <Route path="/citizen" element={<RequireRole role="citizen"><DashboardLayout /></RequireRole>}>
        <Route index element={<Navigate to="/citizen/dashboard" replace/>}/>
        <Route path="dashboard" element={<CitizenDashboard/>}/>
        <Route path="report" element={<ReportComplaintPage/>}/>
        <Route path="complaints" element={<MyComplaintsPage/>}/>
        <Route path="complaints/:id" element={<ComplaintDetailsPage/>}/>
        <Route path="map" element={<CitizenMapPage/>}/>
        <Route path="drafts" element={<SavedDraftsPage/>}/>
        <Route path="notifications" element={<CitizenNotificationsPage/>}/>
        <Route path="announcements" element={<AnnouncementsPage/>}/>
        <Route path="feedback" element={<FeedbackPage/>}/>
        <Route path="profile" element={<ProfileSettingsPage linkPrefix="/citizen"/>}/>
        <Route path="settings" element={<ProfileSettingsPage linkPrefix="/citizen"/>}/>
        <Route path="help" element={<HelpSupportPage/>}/>
        </Route>

      {/* Staff Routes */}
      <Route path="/staff" element={<RequireRole role="staff"><DashboardLayout /></RequireRole>}>
        <Route index element={<Navigate to="/staff/dashboard" replace/>}/>
        <Route path="dashboard" element={<StaffDashboard/>}/>
        <Route path="assigned" element={<StaffAssignedPage/>}/>
        <Route path="queue" element={<StaffAssignedPage/>}/>
        <Route path="complaints/:id" element={<StaffComplaintDetailsPage/>}/>
        <Route path="map" element={<StaffMapPage/>}/>
        <Route path="messages" element={<StaffMessagesPage/>}/>
        <Route path="notifications" element={<StaffNotificationsPage/>}/>
        <Route path="reports" element={<AnalyticsPage/>}/>
        <Route path="profile" element={<ProfileSettingsPage linkPrefix="/staff"/>}/>
        <Route path="settings" element={<ProfileSettingsPage linkPrefix="/staff"/>}/>
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<RequireRole role="admin"><DashboardLayout /></RequireRole>}>
        <Route index element={<Navigate to="/admin/dashboard" replace/>}/>
        <Route path="dashboard" element={<AdminDashboard/>}/>
        <Route path="complaints" element={<AdminComplaintsLive/>}/>
        <Route path="complaints/:id" element={<AdminComplaintDetailsPage/>}/>
        <Route path="assignment" element={<AdminAssignmentLive/>}/>
        <Route path="departments" element={<DepartmentsPage/>}/>
        <Route path="staff" element={<AdminStaffLive/>}/>
        <Route path="staff/:id" element={<AdminStaffDetailsPage/>}/>
        <Route path="map" element={<CitizenMapPage/>}/>
        <Route path="announcements" element={<AnnouncementsPage/>}/>
        <Route path="analytics" element={<AnalyticsPage/>}/>
        <Route path="escalations" element={<EscalationsPage/>}/>
        <Route path="notifications" element={<AdminNotificationsPage/>}/>
        <Route path="profile" element={<ProfileSettingsPage linkPrefix="/admin"/>}/>
        <Route path="settings" element={<ProfileSettingsPage linkPrefix="/admin"/>}/>
        <Route path="help" element={<HelpSupportPage/>}/>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
    <ToastContainer/>
    </>
  )
}

export default function App(){
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}

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
import { NotificationsPage } from "./pages/citizen/NotificationsPage";
import { ProfileSettingsPage } from "./pages/citizen/ProfileSettingsPage";
import { ReportComplaintPage } from "./pages/citizen/ReportComplaintPage";
import { PublicMapPage as CitizenMapPage } from "./pages/public/PublicMapPage";

// Staff Pages
import {
  StaffAssignedPage,
  StaffComplaintManagePage,
} from "./pages/staff/StaffComplaintPage";
import { StaffDashboard } from "./pages/staff/StaffDashboard";

// Admin Pages
import { AdminComplaintsPage } from "./pages/admin/AdminComplaintsPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AnalyticsPage } from "./pages/admin/AnalyticsPage";
import { AssignmentPage } from "./pages/admin/AssignmentPage";
import { DepartmentsPage } from "./pages/admin/DepartmentsPage";
import { EscalationsPage } from "./pages/admin/EscalationsPage";

function RequireRole({ role, children }: { role: 'citizen' | 'staff' | 'admin'; children: React.ReactNode }) {
  const { role:current } = useApp();
  const location = useLocation();
  if (!current) return <Navigate to="/login" state={{ from:location }} replace />;
  if ( current !== role) return <Navigate to={`/${current}/dashboard`} replace />;
  return <>{children}</>
  }

function AppRoutes() {
  const { role } = useApp();

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
        <Route path="notifications" element={<NotificationsPage linkPrefix="/citizen"/>}/>
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
        <Route path="complaints/:id" element={<StaffComplaintManagePage/>}/>
        <Route path="map" element={<CitizenMapPage/>}/>
        <Route path="messages" element={<NotificationsPage linkPrefix="/staff"/>}/>
        <Route path="notifications" element={<NotificationsPage linkPrefix="/staff"/>}/>
        <Route path="reports" element={<AnalyticsPage/>}/>
        <Route path="profile" element={<ProfileSettingsPage linkPrefix="/staff"/>}/>
        <Route path="settings" element={<ProfileSettingsPage linkPrefix="/staff"/>}/>
      </Route>
      
      {/* Admin Routes */}
      <Route path="/admin" element={<RequireRole role="admin"><DashboardLayout /></RequireRole>}>
        <Route index element={<Navigate to="/admin/dashboard" replace/>}/>
        <Route path="dashboard" element={<AdminDashboard/>}/>
        <Route path="complaints" element={<AdminComplaintsPage/>}/>
        <Route path="complaints/:id" element={<StaffComplaintManagePage/>}/>
        <Route path="assignment" element={<AssignmentPage/>}/>
        <Route path="departments" element={<DepartmentsPage/>}/>
        <Route path="staff" element={<DepartmentsPage/>}/>
        <Route path="map" element={<CitizenMapPage/>}/>
        <Route path="announcements" element={<AnnouncementsPage/>}/>
        <Route path="analytics" element={<AnalyticsPage/>}/>
        <Route path="escalations" element={<EscalationsPage/>}/>
        <Route path="notifications" element={<NotificationsPage linkPrefix="/admin"/>}/>
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

import {Routes,Route,Navigate,useLocation} from "react-router-dom";
import { LandingPage } from "./pages/public/LandingPage";
import { AppProvider, useApp } from "./context/AppContext";
import { PublicLayout } from "./components/layout/PublicLayout";
import { Chatbot } from "./components/common/Chatbot";
import { AboutPage } from "./pages/public/AboutPage";
import { ToastContainer } from "./components/ui/Toast";
import { ContactPage } from "./pages/public/ContactPage";
import { FAQPage } from "./pages/public/FAQPage";
import { PublicMapPage } from "./pages/public/PublicMapPage";
import { TrackPage } from "./pages/public/TrackPage";
import { ReportComplaintPage } from "./pages/citizen/ReportComplaintPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegsiterPage";
import { ForgotPasswordPage } from "./pages/auth/ForgetPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/auth/VerifyEmailPage";

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
      <Route path="/verify-email" element={<VerifyEmailPage/>}/>

      {/* Citizen Routes */}
      <Route path="/citizen" element={<RequireRole role="citizen"><DashboardLayout /></RequireRole>}>
        
      </Route>

    </Routes>
    <Chatbot/>
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

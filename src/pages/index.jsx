import Layout from "./Layout.jsx";

import RootRedirect from "./RootRedirect";

import Home from "./Home";

import Businesses from "./Businesses";

import BusinessDetail from "./BusinessDetail";

import MyTickets from "./MyTickets";

import TicketView from "./TicketView";

import ManageSubscription from "./ManageSubscription";

import BusinessDashboard from "./BusinessDashboard";

import BusinessHome from "./BusinessHome";

import BusinessSettings from "./BusinessSettings";

import BusinessAccess from "./BusinessAccess";

import Settings from "./Settings";

import Dashboard from "./Dashboard";

import Onboarding from "./Onboarding";

import MyAppointments from "./MyAppointments";

import BusinessSubscription from "./BusinessSubscription";

import AppointmentManage from "./AppointmentManage";

import StripeCheckout from "./StripeCheckout";

import BusinessManageSubscription from "./BusinessManageSubscription";

import CustomerPortal from "./CustomerPortal";

import BusinessQueues from "./BusinessQueues";

import BusinessServices from "./BusinessServices";

import PaymentSuccess from "./PaymentSuccess";

import Profile from "./Profile";

import TicketPublic from "./TicketPublic";

import BusinessSupport from "./BusinessSupport";

import Support from "./Support";

import AdminSupport from "./AdminSupport";

import BusinessStaff from "./BusinessStaff";

import StaffInviteAccept from "./StaffInviteAccept";

import BusinessProfileSetup from "./BusinessProfileSetup";

import AdminActivate from "./AdminActivate";

import PainelTV from "./PainelTV";

import Login from "./Login";

import Register from "./Register";

import ForgotPassword from "./ForgotPassword";

import ResetPassword from "./ResetPassword";

import PrivacyPolicy from "./PrivacyPolicy";

import TermsOfUse from "./TermsOfUse";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Home: Home,
    
    Businesses: Businesses,
    
    BusinessDetail: BusinessDetail,
    
    MyTickets: MyTickets,
    
    TicketView: TicketView,
    
    ManageSubscription: ManageSubscription,
    
    BusinessDashboard: BusinessDashboard,
    
    BusinessHome: BusinessHome,
    
    BusinessSettings: BusinessSettings,
    
    BusinessAccess: BusinessAccess,
    
    Settings: Settings,
    
    Dashboard: Dashboard,
    
    Onboarding: Onboarding,
    
    MyAppointments: MyAppointments,
    
    BusinessSubscription: BusinessSubscription,
    
    AppointmentManage: AppointmentManage,
    
    StripeCheckout: StripeCheckout,
    
    BusinessManageSubscription: BusinessManageSubscription,
    
    CustomerPortal: CustomerPortal,
    
    BusinessQueues: BusinessQueues,
    
    BusinessServices: BusinessServices,
    
    PaymentSuccess: PaymentSuccess,
    
    Profile: Profile,
    
    TicketPublic: TicketPublic,
    
    BusinessSupport: BusinessSupport,
    
    Support: Support,
    
    AdminSupport: AdminSupport,
    
    BusinessStaff: BusinessStaff,
    
    StaffInviteAccept: StaffInviteAccept,
    
    BusinessProfileSetup: BusinessProfileSetup,
    
    AdminActivate: AdminActivate,
    
    PainelTV: PainelTV,
    
    Login: Login,
    
    Register: Register,
    
    PrivacyPolicy: PrivacyPolicy,
    
    TermsOfUse: TermsOfUse,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    // Convert kebab-case to PascalCase for matching with PAGES keys
    const urlInPascalCase = urlLastPart
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
    
    const pageName = Object.keys(PAGES).find(page => 
        page.toLowerCase() === urlLastPart.toLowerCase() || 
        page === urlInPascalCase
    );
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    // Painel TV sem Layout (fullscreen)
    if (location.pathname === '/painel-tv') {
        return <PainelTV />;
    }
    
    // Login e Register sem Layout
    if (location.pathname === '/login') {
        return <Login />;
    }
    
    if (location.pathname === '/register') {
        return <Register />;
    }
    
    // Forgot Password e Reset Password sem Layout
    if (location.pathname === '/forgot-password') {
        return <ForgotPassword />;
    }
    
    if (location.pathname === '/reset-password') {
        return <ResetPassword />;
    }
    
    // Ticket Public sem Layout (página pública para QR codes)
    if (location.pathname === '/ticket-public') {
        return <TicketPublic />;
    }
    
    // Privacy Policy e Terms of Use sem Layout (páginas públicas)
    if (location.pathname === '/privacy-policy') {
        return <PrivacyPolicy />;
    }
    
    if (location.pathname === '/terms-of-use') {
        return <TermsOfUse />;
    }
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<RootRedirect />} />
                
                
                <Route path="/home" element={<Home />} />
                <Route path="/Home" element={<Home />} />
                
                <Route path="/businesses" element={<Businesses />} />
                <Route path="/Businesses" element={<Businesses />} />
                
                <Route path="/business-detail" element={<BusinessDetail />} />
                <Route path="/BusinessDetail" element={<BusinessDetail />} />
                
                <Route path="/my-tickets" element={<MyTickets />} />
                <Route path="/MyTickets" element={<MyTickets />} />
                
                <Route path="/ticket-view" element={<TicketView />} />
                <Route path="/TicketView" element={<TicketView />} />
                
                <Route path="/manage-subscription" element={<ManageSubscription />} />
                <Route path="/ManageSubscription" element={<ManageSubscription />} />
                
                <Route path="/business-dashboard" element={<BusinessDashboard />} />
                <Route path="/BusinessDashboard" element={<BusinessDashboard />} />
                
                <Route path="/business-home" element={<BusinessHome />} />
                <Route path="/BusinessHome" element={<BusinessHome />} />
                
                <Route path="/business-settings" element={<BusinessSettings />} />
                <Route path="/BusinessSettings" element={<BusinessSettings />} />
                
                <Route path="/business-access" element={<BusinessAccess />} />
                <Route path="/BusinessAccess" element={<BusinessAccess />} />
                
                <Route path="/settings" element={<Settings />} />
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/Onboarding" element={<Onboarding />} />
                
                <Route path="/my-appointments" element={<MyAppointments />} />
                <Route path="/MyAppointments" element={<MyAppointments />} />
                
                <Route path="/business-subscription" element={<BusinessSubscription />} />
                <Route path="/BusinessSubscription" element={<BusinessSubscription />} />
                
                <Route path="/appointment-manage" element={<AppointmentManage />} />
                <Route path="/AppointmentManage" element={<AppointmentManage />} />
                
                <Route path="/stripe-checkout" element={<StripeCheckout />} />
                <Route path="/StripeCheckout" element={<StripeCheckout />} />
                
                <Route path="/business-manage-subscription" element={<BusinessManageSubscription />} />
                <Route path="/BusinessManageSubscription" element={<BusinessManageSubscription />} />
                
                <Route path="/customer-portal" element={<CustomerPortal />} />
                <Route path="/CustomerPortal" element={<CustomerPortal />} />
                
                <Route path="/business-queues" element={<BusinessQueues />} />
                <Route path="/BusinessQueues" element={<BusinessQueues />} />
                
                <Route path="/business-services" element={<BusinessServices />} />
                <Route path="/BusinessServices" element={<BusinessServices />} />
                
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/PaymentSuccess" element={<PaymentSuccess />} />
                
                <Route path="/profile" element={<Profile />} />
                <Route path="/Profile" element={<Profile />} />
                
                <Route path="/support" element={<Support />} />
                <Route path="/Support" element={<Support />} />
                
                <Route path="/business-support" element={<BusinessSupport />} />
                <Route path="/BusinessSupport" element={<BusinessSupport />} />
                
                <Route path="/admin-support" element={<AdminSupport />} />
                <Route path="/AdminSupport" element={<AdminSupport />} />
                
                <Route path="/business-staff" element={<BusinessStaff />} />
                <Route path="/BusinessStaff" element={<BusinessStaff />} />
                
                <Route path="/staff-invite-accept" element={<StaffInviteAccept />} />
                <Route path="/StaffInviteAccept" element={<StaffInviteAccept />} />
                
                <Route path="/business-profile-setup" element={<BusinessProfileSetup />} />
                <Route path="/BusinessProfileSetup" element={<BusinessProfileSetup />} />
                
                <Route path="/admin-activate" element={<AdminActivate />} />
                <Route path="/AdminActivate" element={<AdminActivate />} />
                
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
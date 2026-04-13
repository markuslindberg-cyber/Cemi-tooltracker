import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import HandTools from './pages/HandTools';
import ArbetskläderUtrustning from './pages/ArbetskläderUtrustning';
import LocationDetails from './pages/LocationDetails';
import InventoryReports from './pages/InventoryReports';
import CheckoutReports from './pages/CheckoutReports';
import SåldaRedskap from './pages/SåldaRedskap';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/HandTools" element={<LayoutWrapper currentPageName="HandTools"><HandTools /></LayoutWrapper>} />
      <Route path="/locations/:locationId" element={<LayoutWrapper currentPageName="Locations"><LocationDetails /></LayoutWrapper>} />
      <Route path="/InventoryReports" element={<LayoutWrapper currentPageName="InventoryReports"><InventoryReports /></LayoutWrapper>} />
      <Route path="/ArbetskläderUtrustning" element={<LayoutWrapper currentPageName="ArbetskläderUtrustning"><ArbetskläderUtrustning /></LayoutWrapper>} />
      <Route path="/Arbetsklader/CheckoutReports" element={<LayoutWrapper currentPageName="CheckoutReports"><CheckoutReports /></LayoutWrapper>} />
      <Route path="/Inventory/SaldaRedskap" element={<LayoutWrapper currentPageName="SåldaRedskap"><SåldaRedskap /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
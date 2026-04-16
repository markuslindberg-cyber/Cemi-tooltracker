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
import Inventarier from './pages/Inventarier';
import RequestWorkwear from './pages/RequestWorkwear';
import ArbetskläderRequestWorkwear from './pages/ArbetskläderRequestWorkwear';
import LokalvardUttag from './pages/LokalvardUttag';
import LokalvardNyttUttag from './pages/LokalvardNyttUttag';
import LokalvardBegaranAttGodkanna from './pages/LokalvardBegaranAttGodkanna';
import LokalvardKostnadPerKund from './pages/LokalvardKostnadPerKund';
import LokalvardKunder from './pages/LokalvardKunder';
import LokalvardLager from './pages/LokalvardLager';
import LokalvardArtikelDetaljer from './pages/LokalvardArtikelDetaljer';
import LokalvardInköpImport from './pages/LokalvardInköpImport';
import LokalvardUttagImport from './pages/LokalvardUttagImport';
import LocationDetails from './pages/LocationDetails';
import InventoryReports from './pages/InventoryReports';
import CheckoutReports from './pages/CheckoutReports';
import SåldaRedskap from './pages/SåldaRedskap';
import ServicePage from './pages/ServicePage';
import ServiceMallar from './pages/ServiceMallar';
import Huvudmaskiner from './pages/Huvudmaskiner';
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
      <Route path="/ArbetskladerUtrustning" element={<LayoutWrapper currentPageName="ArbetskläderUtrustning"><ArbetskläderUtrustning /></LayoutWrapper>} />
      <Route path="/Arbetsklader/CheckoutReports" element={<LayoutWrapper currentPageName="CheckoutReports"><CheckoutReports /></LayoutWrapper>} />
      <Route path="/Inventory/SaldaRedskap" element={<LayoutWrapper currentPageName="SåldaRedskap"><SåldaRedskap /></LayoutWrapper>} />
      <Route path="/RequestWorkwear" element={<LayoutWrapper currentPageName="RequestWorkwear"><RequestWorkwear /></LayoutWrapper>} />
      <Route path="/ArbetskläderRequestWorkwear" element={<LayoutWrapper currentPageName="ArbetskläderRequestWorkwear"><ArbetskläderRequestWorkwear /></LayoutWrapper>} />
      <Route path="/Inventarier" element={<LayoutWrapper currentPageName="Inventarier"><Inventarier /></LayoutWrapper>} />
      <Route path="/Lokalvard/Uttag" element={<LayoutWrapper currentPageName="LokalvardUttag"><LokalvardUttag /></LayoutWrapper>} />
      <Route path="/Lokalvard/BegaranAttGodkanna" element={<LayoutWrapper currentPageName="LokalvardBegaranAttGodkanna"><LokalvardBegaranAttGodkanna /></LayoutWrapper>} />
      <Route path="/Lokalvard/KostnadPerKund" element={<LayoutWrapper currentPageName="LokalvardKostnadPerKund"><LokalvardKostnadPerKund /></LayoutWrapper>} />
      <Route path="/Lokalvard/Kunder" element={<LayoutWrapper currentPageName="LokalvardKunder"><LokalvardKunder /></LayoutWrapper>} />
      <Route path="/Lokalvard/NyttUttag" element={<LayoutWrapper currentPageName="LokalvardNyttUttag"><LokalvardNyttUttag /></LayoutWrapper>} />
      <Route path="/Lokalvard/Lager" element={<LayoutWrapper currentPageName="LokalvardLager"><LokalvardLager /></LayoutWrapper>} />
      <Route path="/Lokalvard/InköpImport" element={<LayoutWrapper currentPageName="LokalvardInköpImport"><LokalvardInköpImport /></LayoutWrapper>} />
      <Route path="/Lokalvard/UttagImport" element={<LayoutWrapper currentPageName="LokalvardUttagImport"><LokalvardUttagImport /></LayoutWrapper>} />
      <Route path="/Lokalvard/Artikel/:artikelnummer" element={<LayoutWrapper currentPageName="ArtikelDetaljer"><LokalvardArtikelDetaljer /></LayoutWrapper>} />
      <Route path="/Service" element={<LayoutWrapper currentPageName="Service"><ServicePage /></LayoutWrapper>} />
      <Route path="/ServiceMallar" element={<LayoutWrapper currentPageName="ServiceMallar"><ServiceMallar /></LayoutWrapper>} />
      <Route path="/Huvudmaskiner" element={<LayoutWrapper currentPageName="Huvudmaskiner"><Huvudmaskiner /></LayoutWrapper>} />
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
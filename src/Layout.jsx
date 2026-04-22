import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard,
  Package,
  Users,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ChevronLeft,
  Wrench,
  Shovel,
  Shirt,
  SprayCan,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const LOKALVARDARE_ROLES = ['lokalvårdare', 'admin_lokalvård', 'ägare'];
const NOT_LOKALVARDARE = ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare'];

// Top-level routes that are "root" tabs (no back button shown)
const ROOT_PATHS = ['/', '/Inventory', '/HandTools', '/Team', '/Dashboard'];

const navigation = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  {
    name: 'Maskiner',
    path: '/Inventory',
    icon: Package,
    roles: NOT_LOKALVARDARE,
    children: [
      { name: 'Översikt', path: '/Inventory' },
      { name: 'Huvudmaskiner', path: '/Huvudmaskiner' },
      { name: 'Sålda & Kasserade', path: '/Inventory/SaldaRedskap' },
      { name: 'Lån av utrustning', path: '/Transfers' },
      { name: 'Service', path: '/Service' },
      { name: 'Importera maskiner', path: '/Inventory/ToolImport', desktopOnly: true, devOnly: true },
    ]
  },
  { name: 'Handredskap', path: '/HandTools', icon: Shovel, roles: NOT_LOKALVARDARE },
  {
    name: 'Arbetskläder',
    path: '/ArbetskladerUtrustning',
    icon: Shirt,
    children: [
      { name: 'Arbetskläder och skyddsutrustning', path: '/ArbetskladerUtrustning' },
      { name: 'Uttagsrapporter', path: '/Arbetsklader/CheckoutReports' },
      { name: 'Begäran om uttag', path: '/ArbetskläderRequestWorkwear' },
      { name: 'Förfrågan', path: '/Arbetsklader/Forfragan' },
    ]
  },
  {
    name: 'Lokalvård',
    path: '/Lokalvard',
    icon: SprayCan,
    roles: LOKALVARDARE_ROLES,
    children: [
      { name: 'Lager', path: '/Lokalvard/Lager', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Importera inköp', path: '/Lokalvard/InköpImport', desktopOnly: true, devOnly: true, roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Importera uttag', path: '/Lokalvard/UttagImport', desktopOnly: true, devOnly: true, roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Uttag', path: '/Lokalvard/Uttag', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Begäran & uttag', path: '/Lokalvard/BegaranAttGodkanna', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Kostnad per kund', path: '/Lokalvard/KostnadPerKund', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Kunder', path: '/Lokalvard/Kunder', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Begäran om uttag av lokalvårdsartiklar', path: '/RequestWorkwear' },
    ]
  },
  {
    name: 'Inventeringskontroll',
    path: '/InventoryCheck',
    icon: Wrench,
    roles: NOT_LOKALVARDARE,
    children: [
      { name: 'Inventering', path: '/InventoryCheck' },
      { name: 'Inventeringsrapporter', path: '/InventoryReports' },
    ]
  },
  {
    name: 'Administration',
    path: '/Administration',
    icon: Users,
    roles: NOT_LOKALVARDARE,
    children: [
      { name: 'Platser', path: '/Locations' },
      { name: 'Personal', path: '/Team' },
      { name: 'Kategorier', path: '/Administration/Kategorier' },
      { name: 'Papperskorg', path: '/Administration/Papperskorg', desktopOnly: true, devOnly: true },
    ]
  },
];

// Bottom tab bar items
const BOTTOM_TABS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Maskiner', path: '/Inventory', icon: Package },
  { name: 'Handredskap', path: '/HandTools', icon: Shovel },
  { name: 'Team', path: '/Team', icon: Users },
];

const slideVariants = {
  initial: { x: '4%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '-4%', opacity: 0 },
};

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({});
  const [user, setUser] = useState(null);

  const toggleMenu = (name) => setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
  const location = useLocation();
  const navigate = useNavigate();

  const isRootPath = ROOT_PATHS.includes(location.pathname);

  // Auto-open parent menu when on a child path
  useEffect(() => {
    const autoOpen = {};
    navigation.forEach(item => {
      if (item.children) {
        const anyChildActive = item.children.some(child => location.pathname === child.path || location.pathname.startsWith(child.path + '/'));
        if (anyChildActive) autoOpen[item.name] = true;
      }
    });
    setOpenMenus(prev => ({ ...prev, ...autoOpen }));
  }, [location.pathname]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isActivePath = (path) => {
    if (path === '/') return location.pathname === '/';
    if (location.pathname === path) return true;
    return location.pathname.startsWith(path + '/');
  };

  // Get current page title for mobile header
  const currentPageTitle = (() => {
    for (const item of navigation) {
      if (item.children) {
        const child = item.children.find(c => c.path === location.pathname);
        if (child) return child.name;
      }
      if (item.path === location.pathname) return item.name;
    }
    return 'ToolTrack';
  })();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-screen w-[280px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800" style={{ paddingTop: 'var(--sat)' }}>
            <Link to="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#8B1E1E] rounded-xl flex items-center justify-center shadow-lg shadow-[#8B1E1E]/25">
                <Wrench className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">ToolTrack</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2.5 -mr-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {navigation.filter(item => {
              if (!item.roles) return true;
              return item.roles.includes(user?.role);
            }).map((item) => {
              const isActive = isActivePath(item.path);

              if (item.children) {
                const isOpen = openMenus[item.name];
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98]",
                        isActive
                          ? "bg-[#8B1E1E]/10 text-[#8B1E1E]"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          isActive ? "bg-[#8B1E1E]/15" : "bg-gray-100 dark:bg-gray-800"
                        )}>
                          <item.icon className={cn(
                            "w-4 h-4",
                            isActive ? "text-[#8B1E1E]" : "text-gray-500 dark:text-gray-400"
                          )} />
                        </div>
                        <span>{item.name}</span>
                      </div>
                      <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0", isOpen && "rotate-180")} />
                    </button>
                    {isOpen && (
                      <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-gray-100 dark:border-gray-700 pl-3">
                        {item.children.filter(child => {
                          if (child.devOnly && !window.location.hostname.includes('base44.app')) return false;
                          if (child.desktopOnly && window.innerWidth < 1024) return false;
                          if (child.roles && !child.roles.includes(user?.role)) return false;
                          return true;
                        }).map((child) => (
                          <Link
                            key={child.name}
                            to={child.path}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.98]",
                              child.desktopOnly ? "hidden lg:flex" : "",
                              location.pathname === child.path
                                ? "text-[#8B1E1E] bg-[#8B1E1E]/10"
                                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                            )}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98]",
                    isActive
                      ? "bg-[#8B1E1E]/10 text-[#8B1E1E]"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    isActive ? "bg-[#8B1E1E]/15" : "bg-gray-100 dark:bg-gray-800"
                  )}>
                    <item.icon className={cn(
                      "w-4 h-4",
                      isActive ? "text-[#8B1E1E]" : "text-gray-500 dark:text-gray-400"
                    )} />
                  </div>
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          {user && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <Avatar className="w-10 h-10 border-2 border-gray-100">
                      <AvatarFallback className="bg-[#8B1E1E]/10 text-[#8B1E1E] font-semibold">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {user.full_name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => base44.auth.logout()}
                    className="text-[#8B1E1E]"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-[280px]">
        {/* Mobile Header */}
        <header className="lg:hidden h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-3 sticky top-0 z-30" style={{ paddingTop: 'var(--sat)' }}>
          {/* Left: back button on child routes, menu on root routes */}
          {isRootPath ? (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Center: always show logo linking to dashboard */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#8B1E1E] rounded-lg flex items-center justify-center">
              <Wrench className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">ToolTrack</span>
          </Link>

          {/* Right: menu button always visible */}
          {!isRootPath ? (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
          ) : (
            <div className="w-10" />
          )}
        </header>

        {/* Page Content with slide animation */}
        <main className="min-h-[calc(100vh-4rem)] lg:min-h-screen pb-16 lg:pb-0" style={{ paddingBottom: 'calc(4rem + var(--sab))' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex z-30"
          style={{ paddingBottom: 'var(--sab)' }}
        >
          {BOTTOM_TABS.map((tab) => {
            const active = isActivePath(tab.path);
            return (
              <Link
                key={tab.name}
                to={tab.path}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors",
                  active ? "text-[#8B1E1E]" : "text-gray-400 dark:text-gray-500"
                )}
              >
                <tab.icon className={cn("w-5 h-5", active ? "text-[#8B1E1E]" : "text-gray-400 dark:text-gray-500")} />
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
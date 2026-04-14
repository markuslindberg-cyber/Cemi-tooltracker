import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard,
  Package,
  MapPin,
  Users,
  Menu,
  X,
  LogOut,
  ChevronDown,
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
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Rollbaserad navigering
// roles: array av roller som har tillgång. Tom array = alla roller.
const allNavigation = [
  {
    name: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
    roles: ['ägare', 'admin', 'admin_lokalvård', 'verktygsförvaltare', 'lokalvårdare'],
  },
  {
    name: 'Maskiner',
    path: '/Inventory',
    icon: Package,
    roles: ['ägare', 'admin', 'admin_lokalvård', 'verktygsförvaltare'],
    children: [
      { name: 'Översikt', path: '/Inventory', roles: ['ägare', 'admin', 'admin_lokalvård', 'verktygsförvaltare'] },
      { name: 'Sålda & Kasserade', path: '/Inventory/SaldaRedskap', roles: ['ägare', 'admin', 'admin_lokalvård', 'verktygsförvaltare'] },
      { name: 'Förflyttningar', path: '/Transfers', roles: ['ägare', 'admin', 'admin_lokalvård', 'verktygsförvaltare'] },
    ]
  },
  {
    name: 'Handredskap',
    path: '/HandTools',
    icon: Shovel,
    roles: ['ägare', 'admin', 'admin_lokalvård', 'verktygsförvaltare'],
  },
  {
    name: 'Arbetskläder',
    path: '/ArbetskladerUtrustning',
    icon: Shirt,
    roles: ['ägare', 'admin', 'admin_lokalvård'],
    children: [
      { name: 'Arbetskläder och skyddsutrustning', path: '/ArbetskladerUtrustning', roles: ['ägare', 'admin', 'admin_lokalvård'] },
      { name: 'Uttagsrapporter', path: '/Arbetsklader/CheckoutReports', roles: ['ägare', 'admin', 'admin_lokalvård'] },
    ]
  },
  {
    name: 'Lokalvård',
    path: '/Lokalvard',
    icon: SprayCan,
    roles: ['ägare', 'admin_lokalvård', 'lokalvårdare'],
    children: [
      { name: 'Lager', path: '/Inventarier', roles: ['ägare', 'admin_lokalvård'] },
      { name: 'Uttag', path: '/Lokalvard/Uttag', roles: ['ägare', 'admin_lokalvård'] },
      { name: 'Begäran att godkänna', path: '/Lokalvard/BegaranAttGodkanna', roles: ['ägare', 'admin_lokalvård'] },
      { name: 'Kostnad per kund', path: '/Lokalvard/KostnadPerKund', roles: ['ägare', 'admin_lokalvård'] },
      { name: 'Kunder', path: '/Lokalvard/Kunder', roles: ['ägare', 'admin_lokalvård'] },
      { name: 'Begäran om uttag av lokalvårdsartiklar', path: '/RequestWorkwear', roles: ['ägare', 'admin_lokalvård', 'lokalvårdare'] },
      { name: 'Nytt uttag', path: '/Lokalvard/NyttUttag', roles: ['ägare', 'admin_lokalvård'] },
    ]
  },
  {
    name: 'Inventeringskontroll',
    path: '/InventoryCheck',
    icon: Wrench,
    roles: ['ägare', 'admin', 'admin_lokalvård', 'verktygsförvaltare'],
    children: [
      { name: 'Inventering', path: '/InventoryCheck', roles: ['ägare', 'admin', 'admin_lokalvård', 'verktygsförvaltare'] },
      { name: 'Inventeringsrapporter', path: '/InventoryReports', roles: ['ägare', 'admin', 'admin_lokalvård', 'verktygsförvaltare'] },
    ]
  },
  {
    name: 'Platser',
    path: '/Locations',
    icon: MapPin,
    roles: ['ägare', 'admin', 'admin_lokalvård'],
    children: [
      { name: 'Kontor', path: '/Locations', roles: ['ägare', 'admin', 'admin_lokalvård'] },
    ]
  },
  {
    name: 'Team',
    path: '/Team',
    icon: Users,
    roles: ['ägare', 'admin', 'admin_lokalvård'],
    children: [
      { name: 'Personal', path: '/Team', roles: ['ägare', 'admin', 'admin_lokalvård'] },
    ]
  },
];

function hasAccess(itemRoles, userRole) {
  if (!userRole) return false;
  if (userRole === 'ägare') return true;
  return itemRoles.includes(userRole);
}

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({});
  const [user, setUser] = useState(null);
  const location = useLocation();

  const toggleMenu = (name) => setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isActivePath = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const userRole = user?.role;

  // Filtrera navigering baserat på roll
  const navigation = allNavigation
    .filter(item => hasAccess(item.roles, userRole))
    .map(item => ({
      ...item,
      children: item.children
        ? item.children.filter(child => hasAccess(child.roles, userRole))
        : undefined,
    }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#8B1E1E] rounded-xl flex items-center justify-center shadow-lg shadow-[#8B1E1E]/25">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">ToolTrack</span>
            </Link>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = isActivePath(item.path);

              if (item.children && item.children.length > 0) {
                const isOpen = openMenus[item.name];
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={cn(
                        "flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-[#8B1E1E]/10 text-[#8B1E1E]"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={cn(
                          "w-5 h-5",
                          isActive ? "text-[#8B1E1E]" : "text-gray-400"
                        )} />
                        {item.name}
                      </div>
                      <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform duration-200", isOpen && "rotate-180")} />
                    </button>
                    {isOpen && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-3">
                        {item.children.map((child) => (
                          <Link
                            key={child.name}
                            to={child.path}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                              location.pathname === child.path
                                ? "text-[#8B1E1E] bg-[#8B1E1E]/10"
                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
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
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-[#8B1E1E]/10 text-[#8B1E1E]"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5",
                    isActive ? "text-[#8B1E1E]" : "text-gray-400"
                  )} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          {user && (
            <div className="p-4 border-t border-gray-100">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 transition-colors">
                    <Avatar className="w-10 h-10 border-2 border-gray-100">
                      <AvatarFallback className="bg-[#8B1E1E]/10 text-[#8B1E1E] font-semibold">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.full_name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      {userRole && (
                        <p className="text-xs text-[#8B1E1E] truncate capitalize">{userRole}</p>
                      )}
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
      <div className="lg:pl-72">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-30">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-600 hover:text-gray-900"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-[#8B1E1E] rounded-lg flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">ToolTrack</span>
          </Link>
          <div className="w-10" />
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-4rem)] lg:min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
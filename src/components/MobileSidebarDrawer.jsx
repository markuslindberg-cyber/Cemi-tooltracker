import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Shovel, Shirt, SprayCan, Wrench,
  Users, Settings, Star, Boxes, X, ChevronRight, LogOut,
  SlidersHorizontal, Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { base44 } from '@/api/base44Client';
import UnitSwitcher from '@/components/UnitSwitcher';

const NOT_LOKALVARDARE_ROLES = ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare', 'mekaniker'];

const SECTIONS = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    path: '/',
  },
  {
    name: 'Maskiner',
    icon: Package,
    roles: NOT_LOKALVARDARE_ROLES,
    children: [
      { name: 'Översikt', path: '/Inventory' },
      { name: 'Huvudmaskiner', path: '/Huvudmaskiner' },
      { name: 'Sålda & Kasserade', path: '/Inventory/SaldaRedskap' },
      { name: 'Lån av utrustning', path: '/Transfers' },
      { name: 'Service', path: '/Service' },
    ]
  },
  {
    name: 'Handredskap',
    icon: Shovel,
    path: '/HandTools',
    roles: NOT_LOKALVARDARE_ROLES,
  },
  {
    name: 'Arbetskläder',
    icon: Shirt,
    children: [
      { name: 'Översikt', path: '/ArbetskladerUtrustning', roles: NOT_LOKALVARDARE_ROLES },
      { name: 'Uttagsrapporter', path: '/Arbetsklader/CheckoutReports', roles: NOT_LOKALVARDARE_ROLES },
      { name: 'Begäran', path: '/ArbetskläderRequestWorkwear' },
      { name: 'Förfrågan', path: '/Arbetsklader/Forfragan', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Streckkoder', path: '/Arbetsklader/Streckkodhantering', roles: ['admin_lokalvård', 'ägare'] },
    ]
  },
  {
    name: 'Lokalvård',
    icon: SprayCan,
    roles: ['lokalvårdare', 'admin_lokalvård', 'ägare'],
    children: [
      { name: 'Begäran', path: '/LokalvardRequestArtikel' },
      { name: 'Lager', path: '/Lokalvard/Lager', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Plocka ut', path: '/Lokalvard/NyttUttag', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Uttag', path: '/Lokalvard/Uttag', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Godkänna', path: '/Lokalvard/BegaranAttGodkanna', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Kostnad/kund', path: '/Lokalvard/KostnadPerKund', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Kunder', path: '/Lokalvard/Kunder', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Statistik', path: '/Lokalvard/Produktstatistik', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Inköp', path: '/Lokalvard/Inkopshistorik', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Fakturering', path: '/Lokalvard/Fakturering', roles: ['admin_lokalvård', 'ägare'] },
    ]
  },
  {
    name: 'Inventering',
    icon: Wrench,
    roles: NOT_LOKALVARDARE_ROLES,
    children: [
      { name: 'Inventering', path: '/InventoryCheck' },
      { name: 'Rapporter', path: '/InventoryReports' },
      { name: 'Manual', path: '/InventeringsManual' },
    ]
  },
  {
    name: 'Materialbanken',
    icon: Boxes,
    roles: NOT_LOKALVARDARE_ROLES,
    children: [
      { name: 'Översikt', path: '/Materialbanken' },
      { name: 'Uttag', path: '/Materialbanken/Uttag' },
    ]
  },
  {
    name: 'Administration',
    icon: Users,
    roles: NOT_LOKALVARDARE_ROLES,
    children: [
      { name: 'Platser', path: '/Locations' },
      { name: 'Personal', path: '/Team' },
      { name: 'Kategorier', path: '/Administration/Kategorier', roles: ['admin', 'ägare', 'mekaniker'] },
    ]
  },
];

function getInitials(name) {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function MobileSidebarDrawer({ user, onDeactivate }) {
  const [open, setOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const location = useLocation();
  const userRole = user?.role;

  const filteredSections = SECTIONS.filter(section => {
    if (section.roles && !section.roles.includes(userRole)) return false;
    if (section.children) {
      const hasAccessibleChild = section.children.some(child =>
        !child.roles || child.roles.includes(userRole)
      );
      if (!hasAccessibleChild) return false;
    }
    return true;
  });

  const handleLinkClick = () => {
    setOpen(false);
    setExpandedSection(null);
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
      >
        <Menu className="w-6 h-6" />
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setExpandedSection(null); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0">
          {/* Header with user info */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#8B1E1E] rounded-xl flex items-center justify-center shadow-lg shadow-[#8B1E1E]/25">
                  <Wrench className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">ToolTrack</span>
              </div>
              <UnitSwitcher />
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9 border-2 border-gray-100">
                  <AvatarFallback className="bg-[#8B1E1E]/10 text-[#8B1E1E] font-semibold text-sm">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.full_name || 'User'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
            )}
          </div>

          {/* Grid navigation */}
          <div className="p-4">
            {expandedSection === null ? (
              <div className="grid grid-cols-3 gap-3">
                {filteredSections.map((section) => {
                  const Icon = section.icon;
                  const active = section.path
                    ? isActive(section.path)
                    : section.children?.some(c => isActive(c.path));

                  if (section.path && !section.children) {
                    return (
                      <Link
                        key={section.name}
                        to={section.path}
                        onClick={handleLinkClick}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all active:scale-95",
                          active
                            ? "bg-[#8B1E1E]/10 border-[#8B1E1E]/20 text-[#8B1E1E]"
                            : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                        )}
                      >
                        <div className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center",
                          active ? "bg-[#8B1E1E]/15" : "bg-white dark:bg-gray-700"
                        )}>
                          <Icon className={cn("w-5 h-5", active ? "text-[#8B1E1E]" : "text-gray-500 dark:text-gray-400")} />
                        </div>
                        <span className="text-xs font-medium text-center leading-tight">{section.name}</span>
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={section.name}
                      onClick={() => setExpandedSection(section.name)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all active:scale-95",
                        active
                          ? "bg-[#8B1E1E]/10 border-[#8B1E1E]/20 text-[#8B1E1E]"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                      )}
                    >
                      <div className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center",
                        active ? "bg-[#8B1E1E]/15" : "bg-white dark:bg-gray-700"
                      )}>
                        <Icon className={cn("w-5 h-5", active ? "text-[#8B1E1E]" : "text-gray-500 dark:text-gray-400")} />
                      </div>
                      <span className="text-xs font-medium text-center leading-tight">{section.name}</span>
                      <ChevronRight className="w-3 h-3 text-gray-400" />
                    </button>
                  );
                })}

                {/* Genvägar */}
                <Link
                  to="/NavInstellningar"
                  onClick={handleLinkClick}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl border bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95"
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white dark:bg-gray-700">
                    <SlidersHorizontal className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <span className="text-xs font-medium text-center leading-tight">Genvägar</span>
                </Link>

                {/* Ägare extras */}
                {userRole === 'ägare' && (
                  <>
                    <Link
                      to="/OwnerOverview"
                      onClick={handleLinkClick}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl border bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95"
                    >
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white dark:bg-gray-700">
                        <Star className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <span className="text-xs font-medium text-center leading-tight">Ägaröversikt</span>
                    </Link>
                    <Link
                      to="/AdminLayoutEditor"
                      onClick={handleLinkClick}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl border bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95"
                    >
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white dark:bg-gray-700">
                        <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <span className="text-xs font-medium text-center leading-tight">Layout</span>
                    </Link>
                  </>
                )}
              </div>
            ) : (
              /* Expanded sub-section */
              <div>
                <button
                  onClick={() => setExpandedSection(null)}
                  className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 active:scale-95 transition-transform"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Tillbaka
                </button>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">{expandedSection}</h3>
                <div className="space-y-1">
                  {filteredSections
                    .find(s => s.name === expandedSection)
                    ?.children?.filter(child => !child.roles || child.roles.includes(userRole))
                    .map(child => {
                      const childActive = isActive(child.path);
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={handleLinkClick}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98]",
                            childActive
                              ? "bg-[#8B1E1E]/10 text-[#8B1E1E]"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                          )}
                        >
                          <span className="flex-1">{child.name}</span>
                          {childActive && <div className="w-2 h-2 rounded-full bg-[#8B1E1E]" />}
                        </Link>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Footer: sign out */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
            <button
              onClick={() => { handleLinkClick(); base44.auth.logout(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#8B1E1E] hover:bg-[#8B1E1E]/5 transition-colors active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4" />
              Logga ut
            </button>
            <button
              onClick={() => { handleLinkClick(); onDeactivate?.(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors active:scale-[0.98]"
            >
              Inaktivera konto
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
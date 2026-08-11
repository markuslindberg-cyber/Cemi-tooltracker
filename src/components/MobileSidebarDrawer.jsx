import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Shovel, Shirt, SprayCan, Wrench,
  Users, Settings, Star, Boxes, ChevronDown,
  SlidersHorizontal, Menu, X, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';

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

export default function MobileSidebarDrawer({ user }) {
  const [open, setOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
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
  };

  const toggleSection = (name) => {
    setExpandedSections(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Auto-expand section that contains the active page
  React.useEffect(() => {
    if (!open) return;
    const auto = {};
    filteredSections.forEach(section => {
      if (section.children?.some(c => isActive(c.path))) {
        auto[section.name] = true;
      }
    });
    setExpandedSections(prev => ({ ...prev, ...auto }));
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Full-screen slide-in drawer — portaled to body to escape header stacking context */}
      {createPortal(
        <AnimatePresence>
          {open && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/40 z-[100]"
                onClick={() => setOpen(false)}
              />
              {/* Drawer panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[340px] bg-white dark:bg-gray-900 z-[100] flex flex-col shadow-2xl"
                style={{ paddingTop: 'var(--sat)', paddingBottom: 'var(--sab)' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#8B1E1E] rounded-lg flex items-center justify-center">
                      <Wrench className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-base font-bold text-gray-900 dark:text-gray-100">Meny</span>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Navigation list */}
                <nav className="flex-1 overflow-y-auto py-2 px-3">
                  <div className="space-y-0.5">
                    {filteredSections.map((section) => {
                      const Icon = section.icon;
                      const hasChildren = section.children && section.children.length > 0;
                      const isExpanded = expandedSections[section.name];
                      const sectionActive = section.path
                        ? isActive(section.path)
                        : section.children?.some(c => isActive(c.path));

                      if (!hasChildren) {
                        return (
                          <Link
                            key={section.name}
                            to={section.path}
                            onClick={handleLinkClick}
                            className={cn(
                              "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors active:scale-[0.98]",
                              sectionActive
                                ? "bg-[#8B1E1E]/10 text-[#8B1E1E]"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                              sectionActive ? "bg-[#8B1E1E]/15" : "bg-gray-100 dark:bg-gray-800"
                            )}>
                              <Icon className={cn("w-4 h-4", sectionActive ? "text-[#8B1E1E]" : "text-gray-500 dark:text-gray-400")} />
                            </div>
                            <span className="flex-1">{section.name}</span>
                            {sectionActive && <div className="w-1.5 h-1.5 rounded-full bg-[#8B1E1E]" />}
                          </Link>
                        );
                      }

                      const visibleChildren = section.children.filter(c => !c.roles || c.roles.includes(userRole));

                      return (
                        <div key={section.name}>
                          <button
                            onClick={() => toggleSection(section.name)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors active:scale-[0.98]",
                              sectionActive
                                ? "bg-[#8B1E1E]/10 text-[#8B1E1E]"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                              sectionActive ? "bg-[#8B1E1E]/15" : "bg-gray-100 dark:bg-gray-800"
                            )}>
                              <Icon className={cn("w-4 h-4", sectionActive ? "text-[#8B1E1E]" : "text-gray-500 dark:text-gray-400")} />
                            </div>
                            <span className="flex-1 text-left">{section.name}</span>
                            <span className="text-[10px] text-gray-400 mr-1">{visibleChildren.length}</span>
                            <ChevronDown className={cn(
                              "w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0",
                              isExpanded && "rotate-180"
                            )} />
                          </button>

                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="ml-5 pl-3 border-l-2 border-gray-100 dark:border-gray-700 py-1 space-y-0.5">
                                  {visibleChildren.map(child => {
                                    const childActive = isActive(child.path);
                                    return (
                                      <Link
                                        key={child.path}
                                        to={child.path}
                                        onClick={handleLinkClick}
                                        className={cn(
                                          "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors active:scale-[0.98]",
                                          childActive
                                            ? "text-[#8B1E1E] font-semibold bg-[#8B1E1E]/5"
                                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                                        )}
                                      >
                                        <span className="flex-1">{child.name}</span>
                                        {childActive && <div className="w-1.5 h-1.5 rounded-full bg-[#8B1E1E]" />}
                                      </Link>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

                  {/* Utilities section */}
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
                    <Link
                      to="/NavInstellningar"
                      onClick={handleLinkClick}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors active:scale-[0.98]",
                        isActive('/NavInstellningar')
                          ? "bg-[#8B1E1E]/10 text-[#8B1E1E]"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        isActive('/NavInstellningar') ? "bg-[#8B1E1E]/15" : "bg-gray-100 dark:bg-gray-800"
                      )}>
                        <SlidersHorizontal className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      Genvägar
                    </Link>

                    {userRole === 'ägare' && (
                      <>
                        <Link
                          to="/OwnerOverview"
                          onClick={handleLinkClick}
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors active:scale-[0.98]",
                            isActive('/OwnerOverview')
                              ? "bg-[#8B1E1E]/10 text-[#8B1E1E]"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            isActive('/OwnerOverview') ? "bg-[#8B1E1E]/15" : "bg-gray-100 dark:bg-gray-800"
                          )}>
                            <Star className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </div>
                          Ägaröversikt
                        </Link>
                        <Link
                          to="/AdminLayoutEditor"
                          onClick={handleLinkClick}
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors active:scale-[0.98]",
                            isActive('/AdminLayoutEditor')
                              ? "bg-[#8B1E1E]/10 text-[#8B1E1E]"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            isActive('/AdminLayoutEditor') ? "bg-[#8B1E1E]/15" : "bg-gray-100 dark:bg-gray-800"
                          )}>
                            <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </div>
                          Redigera layout
                        </Link>
                      </>
                    )}
                  </div>
                </nav>

                {/* User profile & logout — always visible at bottom */}
                <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 px-4 py-3">
                  {user && (
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-[#8B1E1E]/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-[#8B1E1E]">
                          {user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.full_name || 'Användare'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => base44.auth.logout()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-[#8B1E1E] bg-[#8B1E1E]/10 hover:bg-[#8B1E1E]/20 transition-colors active:scale-[0.98]"
                  >
                    <LogOut className="w-4 h-4" />
                    Logga ut
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
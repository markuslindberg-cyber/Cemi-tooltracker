import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Shovel, Shirt, SprayCan, Wrench,
  MapPin, Users, Settings, Star, Boxes, MoreHorizontal, X,
  SlidersHorizontal, LogOut, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

const ICON_MAP = {
  LayoutDashboard, Package, Users, Wrench, Shovel, Shirt, SprayCan,
  MapPin, Settings, Star, Boxes, SlidersHorizontal,
};

// All sections available in the "More" grid menu, role-filtered at render
const MORE_SECTIONS = [
  {
    name: 'Maskiner',
    icon: Package,
    roles: ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare', 'mekaniker'],
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
    roles: ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare', 'mekaniker'],
  },
  {
    name: 'Arbetskläder',
    icon: Shirt,
    children: [
      { name: 'Översikt', path: '/ArbetskladerUtrustning', roles: ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare', 'mekaniker'] },
      { name: 'Uttagsrapporter', path: '/Arbetsklader/CheckoutReports', roles: ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare', 'mekaniker'] },
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
    roles: ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare', 'mekaniker'],
    children: [
      { name: 'Inventering', path: '/InventoryCheck' },
      { name: 'Rapporter', path: '/InventoryReports' },
      { name: 'Manual', path: '/InventeringsManual' },
    ]
  },
  {
    name: 'Materialbanken',
    icon: Boxes,
    roles: ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare', 'mekaniker'],
    children: [
      { name: 'Översikt', path: '/Materialbanken' },
      { name: 'Uttag', path: '/Materialbanken/Uttag' },
    ]
  },
  {
    name: 'Administration',
    icon: Users,
    roles: ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare', 'mekaniker'],
    children: [
      { name: 'Platser', path: '/Locations' },
      { name: 'Personal', path: '/Team' },
      { name: 'Kategorier', path: '/Administration/Kategorier', roles: ['admin', 'ägare', 'mekaniker'] },
    ]
  },
];

export default function MobileMoreMenu({ user }) {
  const [open, setOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const location = useLocation();

  const userRole = user?.role;

  const filteredSections = MORE_SECTIONS.filter(section => {
    if (!section.roles) return true;
    return section.roles.includes(userRole);
  });

  const handleLinkClick = () => {
    setOpen(false);
    setExpandedSection(null);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex-none w-14 flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium transition-colors min-h-[56px]",
          open ? "text-[#8B1E1E]" : "text-gray-400 dark:text-gray-500"
        )}
      >
        <MoreHorizontal className="w-5 h-5" />
        <span>Mer</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto p-0 gap-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Alla sidor</h2>
          </div>

          {/* Grid of sections */}
          <div className="p-4">
            {expandedSection === null ? (
              <div className="grid grid-cols-3 gap-3">
                {filteredSections.map((section) => {
                  const Icon = section.icon;
                  const isActive = section.path
                    ? location.pathname === section.path
                    : section.children?.some(c => location.pathname === c.path);

                  if (section.path && !section.children) {
                    return (
                      <Link
                        key={section.name}
                        to={section.path}
                        onClick={handleLinkClick}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all active:scale-95",
                          isActive
                            ? "bg-[#8B1E1E]/10 border-[#8B1E1E]/20 text-[#8B1E1E]"
                            : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                        )}
                      >
                        <div className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center",
                          isActive ? "bg-[#8B1E1E]/15" : "bg-white dark:bg-gray-700"
                        )}>
                          <Icon className={cn("w-5 h-5", isActive ? "text-[#8B1E1E]" : "text-gray-500 dark:text-gray-400")} />
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
                        isActive
                          ? "bg-[#8B1E1E]/10 border-[#8B1E1E]/20 text-[#8B1E1E]"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                      )}
                    >
                      <div className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center",
                        isActive ? "bg-[#8B1E1E]/15" : "bg-white dark:bg-gray-700"
                      )}>
                        <Icon className={cn("w-5 h-5", isActive ? "text-[#8B1E1E]" : "text-gray-500 dark:text-gray-400")} />
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

                {/* Ägaröversikt for ägare */}
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
              /* Expanded section view */
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
                    ?.children?.filter(child => {
                      if (!child.roles) return true;
                      return child.roles.includes(userRole);
                    })
                    .map(child => {
                      const isActive = location.pathname === child.path;
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={handleLinkClick}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98]",
                            isActive
                              ? "bg-[#8B1E1E]/10 text-[#8B1E1E]"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                          )}
                        >
                          <span className="flex-1">{child.name}</span>
                          {isActive && <div className="w-2 h-2 rounded-full bg-[#8B1E1E]" />}
                        </Link>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
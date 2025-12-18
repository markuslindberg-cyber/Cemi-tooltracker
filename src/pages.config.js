import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Locations from './pages/Locations';
import Team from './pages/Team';
import Transfers from './pages/Transfers';
import InventoryCheck from './pages/InventoryCheck';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Inventory": Inventory,
    "Locations": Locations,
    "Team": Team,
    "Transfers": Transfers,
    "InventoryCheck": InventoryCheck,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
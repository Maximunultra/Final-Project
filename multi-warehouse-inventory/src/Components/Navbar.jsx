import { Link } from "react-router-dom";
import { LayoutDashboard, Package, Warehouse, Truck, AlertTriangle } from "lucide-react";

const Sidebar = () => {
  return (
    <div className="h-screen w-64 bg-gray-900 text-white flex flex-col p-4 shadow-lg">
      <h1 className="text-xl font-bold text-center mb-6">Inventory System</h1>
      
      <nav className="space-y-4">
        <SidebarLink to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
        <SidebarLink to="/products" icon={<Package size={20} />} label="Products" />
        <SidebarLink to="/warehouses" icon={<Warehouse size={20} />} label="Warehouses" />
        <SidebarLink to="/stock-movement" icon={<Truck size={20} />} label="Stock Movements" />
        <SidebarLink to="/low-stock" icon={<AlertTriangle size={20} />} label="Low Stock Alerts" />
      </nav>
    </div>
  );
};

const SidebarLink = ({ to, icon, label }) => {
  return (
    <Link to={to} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-700">
      {icon}
      <span>{label}</span>
    </Link>
  );
};

export default Sidebar;

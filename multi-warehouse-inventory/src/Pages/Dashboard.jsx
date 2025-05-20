import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
  const [role, setRole] = useState('');
  const [stats, setStats] = useState({
    products: 0,
    warehouses: 0,
    stock: 0,
    users: 0,
    lowStock: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return navigate('/login');

    axios.get(`http://localhost:5000/api/auth/role?email=${user.email}`)
      .then((res) => setRole(res.data.role))
      .catch(() => navigate('/login'));

    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        const [productsRes, warehousesRes, stockRes, usersRes] = await Promise.all([
          axios.get('http://localhost:5000/api/products'),
          axios.get('http://localhost:5000/api/warehouses'),
          axios.get('http://localhost:5000/api/stock'),
          axios.get('http://localhost:5000/api/users'),
        ]);
        // Calculate low stock (example: quantity < 10)
        const lowStock = stockRes.data.filter(s => s.quantity < 10).length;

        setStats({
          products: productsRes.data.length,
          warehouses: warehousesRes.data.length,
          stock: stockRes.data.reduce((sum, s) => sum + (s.quantity || 0), 0),
          users: usersRes.data.length,
          lowStock,
        });
      } catch (err) {
        // Handle errors or show fallback stats
      }
    };
    fetchStats();
  }, [navigate]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <span className="text-2xl font-bold text-blue-600">{stats.products}</span>
          <span className="text-gray-600 mt-2">Products</span>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <span className="text-2xl font-bold text-green-600">{stats.warehouses}</span>
          <span className="text-gray-600 mt-2">Warehouses</span>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <span className="text-2xl font-bold text-yellow-600">{stats.stock}</span>
          <span className="text-gray-600 mt-2">Total Stock</span>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <span className="text-2xl font-bold text-red-600">{stats.lowStock}</span>
          <span className="text-gray-600 mt-2">Low Stock Items</span>
        </div>
      </div>

      <div className="mb-8">
        {role === 'admin' && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded mb-2">
            <strong>Admin:</strong> You can manage products, warehouses, users, and view all reports.
          </div>
        )}
        {role === 'manager' && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded mb-2">
            <strong>Warehouse Manager:</strong> You can transfer stock and manage warehouse inventory.
          </div>
        )}
        {role === 'staff' && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded mb-2">
            <strong>Staff:</strong> You can view stock levels and product information.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/inventory" className="block bg-white hover:bg-yellow-50 rounded-lg shadow p-6 text-center transition">
          <div className="text-lg font-semibold text-yellow-700 mb-2">Stock Movements</div>
          <div className="text-gray-500">Transfer and track stock</div>
        </Link>
        <Link to="/warehouses" className="block bg-white hover:bg-green-50 rounded-lg shadow p-6 text-center transition">
          <div className="text-lg font-semibold text-green-700 mb-2">Manage Warehouses</div>
          <div className="text-gray-500">View and organize warehouses</div>
        </Link>
        <Link to="/transfer" className="block bg-white hover:bg-blue-50 rounded-lg shadow p-6 text-center transition">
          <div className="text-lg font-semibold text-blue-700 mb-2">Manage Products</div>
          <div className="text-gray-500">Add, edit, or remove products</div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
  const [role, setRole] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) navigate('/login');

    axios.get(`http://localhost:5000/api/auth/role?email=${user.email}`)
      .then((res) => setRole(res.data.role))
      .catch(() => navigate('/login'));
  }, [navigate]);

  return (
    <div className="p-6">
      <h1 className="text-2xl">Welcome to the Dashboard</h1>
      {role === 'admin' && <p>You are an <strong>Admin</strong>. You can manage everything.</p>}
      {role === 'manager' && <p>You are a <strong>Warehouse Manager</strong>. You can transfer stock.</p>}
      {role === 'staff' && <p>You are a <strong>Staff Member</strong>. You can view stock levels.</p>}
    </div>
  );
};

export default Dashboard;

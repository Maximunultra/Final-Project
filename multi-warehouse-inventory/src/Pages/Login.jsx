import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) return alert('Please enter email and password');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password,
      });

      const { token, user } = res.data;
      console.log('Logged in user:', user);  // Debugging: Check if user is correct

      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user)); // Store user info in localStorage

        alert(`Welcome, ${user.role.toUpperCase()}!`);
        
        if (user.role === 'admin') {
          navigate('/');  // Redirect to the dashboard for admin
        } else if (user.role === 'staff') {
          navigate('/products');   // Redirect to products page for staff
        } else {
          navigate('/manager-dashboard');  // Redirect to manager dashboard
        }     
      } else {
        alert('Invalid response from server.');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Login failed!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
      <h2>Login</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
      />
      <button onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: '10px' }}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </div>
  );
}

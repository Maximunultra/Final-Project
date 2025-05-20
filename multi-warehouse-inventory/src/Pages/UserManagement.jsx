import { useEffect, useState } from "react";
import axios from "axios";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "staff" });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/users");
      setUsers(res.data);
    } catch (err) {
      setError("Failed to fetch users.");
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Don't send password if not changed
        const updateData = { ...form };
        if (!form.password) delete updateData.password;
        await axios.put(`http://localhost:5000/api/users/${editingId}`, updateData);
      } else {
        await axios.post("http://localhost:5000/api/users", form);
      }
      setForm({ full_name: "", email: "", password: "", role: "staff" });
      setEditingId(null);
      fetchUsers();
      setError("");
    } catch (err) {
      setError("Failed to save user.");
    }
  };

  const handleEdit = (user) => {
    setForm({ full_name: user.full_name, email: user.email, password: "", role: user.role });
    setEditingId(user.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/users/${id}`);
      fetchUsers();
    } catch (err) {
      setError("Failed to delete user.");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">User Management</h2>
      {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap gap-2 items-end">
        <input
          type="text"
          name="full_name"
          placeholder="Full Name"
          value={form.full_name}
          onChange={handleChange}
          className="border p-2 rounded"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="border p-2 rounded"
          required
        />
        <input
          type="password"
          name="password"
          placeholder={editingId ? "New Password (leave blank to keep)" : "Password"}
          value={form.password}
          onChange={handleChange}
          className="border p-2 rounded"
          required={!editingId}
        />
        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          className="border p-2 rounded"
        >
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
        </select>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          {editingId ? "Update User" : "Add User"}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setForm({ full_name: "", email: "", password: "", role: "staff" });
              setEditingId(null);
            }}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
          >
            Cancel
          </button>
        )}
      </form>

      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 border">Full Name</th>
            <th className="py-2 px-4 border">Email</th>
            <th className="py-2 px-4 border">Role</th>
            <th className="py-2 px-4 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="py-2 px-4 border">{user.full_name}</td>
              <td className="py-2 px-4 border">{user.email}</td>
              <td className="py-2 px-4 border capitalize">{user.role}</td>
              <td className="py-2 px-4 border">
                <button
                  onClick={() => handleEdit(user)}
                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserManagement;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, Trash2, RefreshCw, Search, LogOut } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const AdminPage = () => {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState('');

    // Check local storage for session
    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (token) {
            setIsAuthenticated(true);
            loadItems();
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/index/admin/login`, { username, password });

            if (res.data.success) {
                localStorage.setItem('adminToken', res.data.token);
                setIsAuthenticated(true);
                loadItems();
            } else {
                setError('Invalid credentials');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        setIsAuthenticated(false);
        setItems([]);
    };

    const loadItems = async (query = '') => {
        setLoading(true);
        try {
            const endpoint = query
                ? `${API_URL}/index/search?query=${query}&limit=100`
                : `${API_URL}/index/search?query=a&limit=50`;

            const res = await axios.get(endpoint);
            setItems(res.data.results || []);
        } catch (err) {
            console.error('Failed to load items', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        if (!window.confirm('Are you sure you want to force sync? This will run in the background.')) return;

        setSyncing(true);
        try {
            const res = await axios.post(`${API_URL}/index/sync`);
            if (res.data.success) {
                alert('Sync started! The page will update automatically when finished.');

                const pollInterval = setInterval(async () => {
                    try {
                        const statusRes = await axios.get(`${API_URL}/index/sync/status`);
                        const status = statusRes.data;

                        if (!status.isSyncing) {
                            clearInterval(pollInterval);
                            setSyncing(false);

                            if (status.error) {
                                alert('Sync failed: ' + status.error);
                            } else {
                                alert(`Sync Complete!\nProcessed: ${status.totalFetched}\nNew: ${status.totalNew}\nUpdated: ${status.totalUpdated}`);
                                loadItems(searchQuery);
                            }
                        }
                    } catch (e) {
                        console.error('Poll failed', e);
                        clearInterval(pollInterval);
                        setSyncing(false);
                    }
                }, 2000);
            } else {
                alert('Sync failed to start: ' + res.data.error);
                setSyncing(false);
            }
        } catch (err) {
            alert('Sync request failed: ' + (err.response?.data?.details || err.message));
            setSyncing(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete "${name}" (${id})?`)) return;

        try {
            const res = await axios.delete(`${API_URL}/index/${id}`);
            if (res.data.success) {
                setItems(items.filter(i => i.id !== id));
            } else {
                alert('Delete failed: ' + res.data.error);
            }
        } catch (err) {
            alert('Delete request failed: ' + (err.response?.data?.details || err.message));
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white p-4">
                <div className="w-full max-w-md bg-[#1a1a1a] p-8 rounded-lg shadow-lg border border-gray-800">
                    <h1 className="text-2xl font-bold mb-6 text-center text-purple-500">Admin Login</h1>
                    {error && <div className="bg-red-500/20 text-red-400 p-3 rounded mb-4">{error}</div>}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-2 focus:border-purple-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-2 focus:border-purple-500 outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-purple-600 hover:bg-purple-700 p-2 rounded font-bold transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-purple-500">Index Admin</h1>
                    <div className="flex gap-4">
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Syncing...' : 'Force Sync'}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-bold transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            Logout
                        </button>
                    </div>
                </div>

                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search anime to manage..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (e.target.value.length > 2) loadItems(e.target.value);
                            }}
                            className="w-full bg-[#1a1a1a] border border-gray-800 rounded-lg pl-10 pr-4 py-3 focus:border-purple-500 outline-none"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader className="w-12 h-12 animate-spin text-purple-500" />
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {items.map(item => (
                            <div key={item.id} className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <img
                                        src={item.poster}
                                        alt={item.name}
                                        className="w-12 h-16 object-cover rounded"
                                        onError={(e) => e.target.src = 'https://via.placeholder.com/48x64?text=?'}
                                    />
                                    <div>
                                        <h3 className="font-bold text-lg">{item.name}</h3>
                                        <p className="text-gray-400 text-sm">{item.type} • {item.year} • ID: {item.id}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(item.id, item.name)}
                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                                    title="Delete from Index"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                        {items.length === 0 && (
                            <div className="text-center text-gray-500 py-12">
                                No items found. Try searching or syncing.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPage;

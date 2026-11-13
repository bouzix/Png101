import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { Image as ImageIcon, Download, Eye, HardDrive, Monitor, Globe } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import StatCard from '@/components/ui/StatCard';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

export default function AdminAnalytics() {
    const [timeRange, setTimeRange] = useState('30d');
    const [stats, setStats] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const [statsRes, dlRes] = await Promise.all([
                fetch(`/api/analytics/stats?range=${timeRange}`),
                fetch(`/api/analytics/downloads?range=${timeRange}`),
            ]);
            if (statsRes.ok) {
                setStats(await statsRes.json());
            }
            if (dlRes.ok) {
                const dl = await dlRes.json();
                setChartData(Array.isArray(dl) ? dl : dl.data || []);
            }
        } catch (err) {
            console.error('Failed to load analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    return (
        <AdminLayout>
            <Head title="Analytics - Png101 Admin" />
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
                        <p className="text-sm text-foreground/60 mt-1">Track downloads, views, devices, and popular PNG assets</p>
                    </div>

                    <div className="flex items-center gap-1.5 bg-card-bg border border-card-border p-1 rounded-xl">
                        {['1h', '24h', '7d', '30d', '90d', '1y'].map(r => (
                            <button
                                key={r}
                                onClick={() => setTimeRange(r)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-colors cursor-pointer ${
                                    timeRange === r ? 'bg-primary-glow text-white' : 'text-foreground/60 hover:text-foreground'
                                }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Top Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Total PNGs" value={stats?.totalImages ?? 0} icon={<ImageIcon className="w-6 h-6" />} />
                    <StatCard title="Downloads" value={stats?.totalDownloads ?? 0} icon={<Download className="w-6 h-6" />} />
                    <StatCard title="Page Views" value={stats?.totalViews ?? 0} icon={<Eye className="w-6 h-6" />} />
                    <StatCard title="Storage Used" value={formatBytes(stats?.totalStorage ?? 0)} icon={<HardDrive className="w-6 h-6" />} />
                </div>

                {/* Main Downloads Chart */}
                <div className="bg-card-bg border border-card-border rounded-2xl p-6 shadow-xl">
                    <h3 className="text-lg font-bold text-foreground mb-6">Downloads &amp; Views Trend</h3>
                    <div className="h-80 w-full">
                        {loading ? (
                            <div className="h-full flex items-center justify-center text-foreground/50">Loading chart...</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorDl" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                                    <YAxis stroke="#94a3b8" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#0f172a',
                                            borderColor: '#1e293b',
                                            borderRadius: '12px',
                                            color: '#f8fafc',
                                        }}
                                    />
                                    <Area type="monotone" dataKey="downloads" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorDl)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Devices & Countries */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-card-bg border border-card-border rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center gap-2 mb-4">
                            <Monitor className="w-5 h-5 text-primary-glow" />
                            <h3 className="text-lg font-bold text-foreground">Devices</h3>
                        </div>
                        {stats?.devices && stats.devices.length > 0 ? (
                            <div className="h-60">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={stats.devices} dataKey="count" nameKey="device" cx="50%" cy="50%" outerRadius={80} label>
                                            {stats.devices.map((_, idx) => (
                                                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-sm text-foreground/50 py-12 text-center">No device data yet</p>
                        )}
                    </div>

                    <div className="bg-card-bg border border-card-border rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center gap-2 mb-4">
                            <Globe className="w-5 h-5 text-primary-glow" />
                            <h3 className="text-lg font-bold text-foreground">Top Countries</h3>
                        </div>
                        {stats?.countries && stats.countries.length > 0 ? (
                            <div className="space-y-3">
                                {stats.countries.slice(0, 6).map((c, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm">
                                        <span className="text-foreground/80 font-medium">{c.name || c.code}</span>
                                        <span className="font-mono text-primary-glow font-semibold">{c.count}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-foreground/50 py-12 text-center">No geographic data yet</p>
                        )}
                    </div>
                </div>

                {/* Popular Images */}
                <div className="bg-card-bg border border-card-border rounded-2xl p-6 shadow-xl">
                    <h3 className="text-lg font-bold text-foreground mb-4">Most Popular PNGs</h3>
                    {stats?.popularImages && stats.popularImages.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-card-border text-foreground/50 text-xs uppercase">
                                        <th className="pb-3">Asset</th>
                                        <th className="pb-3">Downloads</th>
                                        <th className="pb-3">Views</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-card-border">
                                    {stats.popularImages.map(img => (
                                        <tr key={img.id}>
                                            <td className="py-3 flex items-center gap-3">
                                                <img src={img.path} alt={img.name} className="w-10 h-10 object-contain rounded bg-foreground/5 p-1" />
                                                <Link href={`/images/${img.id}`} className="font-medium text-foreground hover:text-primary-glow">
                                                    {img.name}
                                                </Link>
                                            </td>
                                            <td className="py-3 font-mono font-semibold text-primary-glow">{img.downloads}</td>
                                            <td className="py-3 font-mono text-foreground/70">{img.views ?? 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-foreground/50 py-8 text-center">No download activity recorded yet</p>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}


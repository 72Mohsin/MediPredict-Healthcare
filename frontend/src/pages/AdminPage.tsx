import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users, ShieldCheck, Trash2, ShieldOff, Shield,
  Search, RefreshCw, AlertTriangle, Activity, Calendar,
  TrendingUp, Brain,
} from 'lucide-react';
import { format } from 'date-fns';

interface AdminUser {
  id: string;
  username: string;
  role: 'user' | 'admin';
  created_at: string;
  prediction_count: number;
  last_prediction?: string;
}

interface AdminStats {
  total_users: number;
  total_predictions: number;
  total_chats: number;
  active_today: number;
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function authHeaders() {
  const token = localStorage.getItem('medipredict_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { ...opts, headers: { ...authHeaders(), ...(opts.headers as Record<string, string> || {}) } });
  if (!res.ok) { const e = await res.json().catch(() => ({ detail: res.statusText })); throw new Error(e.detail || 'Request failed'); }
  return res.json();
}

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/dashboard');
  }, [user, navigate]);

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [usersData, statsData] = await Promise.all([
        apiFetch<AdminUser[]>('/admin/users'),
        apiFetch<AdminStats>('/admin/stats'),
      ]);
      setUsers(usersData);
      setStats(statsData);
    } catch (e) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRoleToggle = async (u: AdminUser) => {
    setActionLoading(u.id);
    try {
      const newRole = u.role === 'admin' ? 'user' : 'admin';
      await apiFetch(`/admin/users/${u.id}/role`, { method: 'PUT', body: JSON.stringify({ role: newRole }) });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x));
    } catch (e) { setError((e as Error).message); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    try {
      await apiFetch(`/admin/users/${deleteTarget.id}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(x => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) { setError((e as Error).message); }
    finally { setActionLoading(null); }
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container max-w-6xl py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Admin Panel</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage all registered users and system stats</p>
          </div>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Users', value: stats.total_users, icon: Users, color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
              { label: 'Total Predictions', value: stats.total_predictions, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50' },
              { label: 'Chat Sessions', value: stats.total_chats, icon: Brain, color: 'text-violet-500', bg: 'bg-violet-50/50 dark:bg-violet-900/10 border-violet-200/50' },
              { label: 'Active Today', value: stats.active_today, icon: Activity, color: 'text-amber-500', bg: 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className={`border ${bg} shadow-sm`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background border ${bg}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Users table */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Users className="h-5 w-5 text-primary" />All Users ({filtered.length})
              </CardTitle>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">Loading users…</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {search ? 'No users match your search.' : 'No users found.'}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Table header */}
                <div className="hidden sm:grid grid-cols-[1fr_80px_80px_100px_auto] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <span>User</span><span>Role</span><span>Predictions</span><span>Joined</span><span className="text-right">Actions</span>
                </div>
                {filtered.map(u => (
                  <div key={u.id} className="grid sm:grid-cols-[1fr_80px_80px_100px_auto] gap-3 sm:gap-4 items-center rounded-xl border bg-muted/10 p-4 hover:bg-muted/30 transition-colors">
                    {/* Username + ID */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{u.username}</p>
                          {u.id === user.id && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">You</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">{u.id.slice(0, 8)}…</p>
                      </div>
                    </div>

                    {/* Role badge */}
                    <div>
                      <Badge className={u.role === 'admin'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs'
                        : 'bg-muted text-muted-foreground text-xs'}>
                        {u.role === 'admin' ? <><Shield className="mr-1 h-3 w-3" />Admin</> : 'User'}
                      </Badge>
                    </div>

                    {/* Prediction count */}
                    <div className="text-sm font-medium text-center">{u.prediction_count}</div>

                    {/* Joined date */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : 'N/A'}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline" size="sm"
                        disabled={actionLoading === u.id || u.id === user.id}
                        onClick={() => handleRoleToggle(u)}
                        className="text-xs h-8">
                        {u.role === 'admin'
                          ? <><ShieldOff className="mr-1.5 h-3 w-3" />Demote</>
                          : <><Shield className="mr-1.5 h-3 w-3" />Promote</>}
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        disabled={actionLoading === u.id || u.id === user.id}
                        onClick={() => setDeleteTarget(u)}
                        className="text-xs h-8 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20">
                        <Trash2 className="mr-1.5 h-3 w-3" />Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-500" />Delete User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.username}</strong>? This will permanently remove their account, all predictions, and chat history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-500 hover:bg-rose-600 text-white">
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

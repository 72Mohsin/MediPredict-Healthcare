import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Activity, FileText, TrendingUp, AlertTriangle, Plus, Calendar,
  ArrowRight, Brain, ShieldCheck, Stethoscope, Sparkles,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';
import { format } from 'date-fns';

type RiskLevel = 'low' | 'medium' | 'high';

const RISK_CONFIG: Record<RiskLevel, { badge: string; dot: string }> = {
  low:    { badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  medium: { badge: 'bg-amber-100  text-amber-800  dark:bg-amber-900/40  dark:text-amber-300',  dot: 'bg-amber-500'  },
  high:   { badge: 'bg-rose-100   text-rose-800   dark:bg-rose-900/40   dark:text-rose-300',   dot: 'bg-rose-500'   },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.predictions.list(20).then(setPredictions).catch(console.error).finally(() => setLoading(false));
  }, []);

  const riskOrder: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3 };
  const chartData = [...predictions].reverse().slice(-10).map(p => ({
    date: p.created_at ? format(new Date(p.created_at as string), 'MMM d') : '',
    risk: riskOrder[(p.risk_level as RiskLevel)] || 1,
    confidence: p.confidence_score as number,
  }));

  const latestRisk = (predictions[0]?.risk_level as RiskLevel) || null;
  const latestRiskCfg = latestRisk ? RISK_CONFIG[latestRisk] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, <span className="text-primary">{user?.username}</span>!
            </h1>
            <p className="text-muted-foreground mt-1">Monitor your health and chat with MediBot AI</p>
          </div>
          {user?.role === 'admin' && (
            <Button asChild variant="outline" className="self-start md:self-auto border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20">
              <Link to="/admin"><ShieldCheck className="mr-2 h-4 w-4" />Admin Panel</Link>
            </Button>
          )}
        </div>

        <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
            <strong>Medical Disclaimer:</strong> For educational purposes only. Not a substitute for professional medical advice.
          </AlertDescription>
        </Alert>

        {/* Stats row */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            {
              title: 'Total Predictions', icon: FileText,
              value: loading ? '—' : String(predictions.length),
              sub: 'Health assessments', color: 'text-primary', bg: 'bg-primary/5 border-primary/20',
            },
            {
              title: 'Latest Risk', icon: TrendingUp,
              value: loading ? '—' : latestRisk?.toUpperCase() || 'N/A',
              sub: 'From last assessment', color: 'text-amber-500', bg: 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30',
            },
            {
              title: 'AI Engine', icon: Brain,
              value: 'DeepSeek-R1', sub: 'Local AI model active', color: 'text-violet-500', bg: 'bg-violet-50/50 dark:bg-violet-900/10 border-violet-200/50 dark:border-violet-800/30',
            },
            {
              title: 'Symptoms DB', icon: Activity,
              value: '171', sub: 'Tracked symptoms', color: 'text-emerald-500', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/30',
            },
          ].map(({ title, icon: Icon, value, sub, color, bg }) => (
            <Card key={title} className={`border ${bg} shadow-sm`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart + Quick actions */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />Risk Level Trend
              </CardTitle>
              <CardDescription>Your last 10 predictions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading || chartData.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
                  {loading ? 'Loading...' : 'No prediction data yet — create your first one below!'}
                </div>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 3]} ticks={[1, 2, 3]} tickFormatter={v => ['', 'Low', 'Med', 'High'][v]}
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v: number) => [['', 'Low Risk', 'Medium Risk', 'High Risk'][v], 'Risk Level']}
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }}
                      />
                      <Line type="monotone" dataKey="risk" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {[
              { to: '/predict', icon: Plus, title: 'New Prediction', desc: 'Analyze symptoms with ML + AI', variant: 'default' as const, accent: 'border-primary/30 bg-primary/5' },
              { to: '/chat', icon: Brain, title: 'MediBot Chat', desc: 'Chat with DeepSeek-R1 AI', variant: 'secondary' as const, accent: 'border-secondary/30 bg-secondary/5' },
              { to: '/profile', icon: Stethoscope, title: 'Medical Profile', desc: 'Update your health info', variant: 'outline' as const, accent: 'border-muted' },
            ].map(({ to, icon: Icon, title, desc, variant, accent }) => (
              <Card key={to} className={`border ${accent} shadow-sm hover:shadow-md transition-shadow`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground truncate">{desc}</p>
                  </div>
                  <Button asChild variant={variant} size="sm" className="shrink-0">
                    <Link to={to}><ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent predictions */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" />Recent Predictions
                </CardTitle>
                <CardDescription>Your latest health assessments</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild><Link to="/history">View All</Link></Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : predictions.length === 0 ? (
              <div className="py-14 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 font-semibold">No predictions yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">Create your first health assessment to get started</p>
                <Button asChild><Link to="/predict"><Plus className="mr-2 h-4 w-4" />Create First Prediction</Link></Button>
              </div>
            ) : (
              <div className="space-y-3">
                {predictions.slice(0, 5).map((p) => {
                  const diseases = (p.predicted_diseases as Array<{ disease_name: string }>) || [];
                  const rLevel = p.risk_level as RiskLevel;
                  const cfg = RISK_CONFIG[rLevel] || RISK_CONFIG.low;
                  return (
                    <div key={p.id as string} className="flex items-center gap-4 rounded-xl border bg-muted/10 p-4 hover:bg-muted/30 transition-colors group">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
                            {rLevel?.toUpperCase()} RISK
                          </span>
                          <span className="text-xs text-muted-foreground">{p.confidence_score as number}% confidence</span>
                        </div>
                        <p className="text-sm font-medium truncate">{diseases.map(d => d.disease_name).join(', ')}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {p.created_at ? format(new Date(p.created_at as string), 'MMM dd, yyyy') : ''}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link to={`/results/${p.id as string}`}>Details <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

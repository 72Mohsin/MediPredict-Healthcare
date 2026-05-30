import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle, ArrowLeft, Activity, Stethoscope, ClipboardList,
  AlertCircle, CheckCircle2, TrendingUp, Home, Sparkles, Heart,
  Thermometer, Droplets, Zap,
} from 'lucide-react';
import { AIChatPanel } from '@/components/AIChatPanel';
import { NearbyDoctors } from '@/components/NearbyDoctors';
import { api } from '@/lib/api';
import { format } from 'date-fns';

type RiskLevel = 'low' | 'medium' | 'high';

const RISK_CONFIG: Record<RiskLevel, { gradient: string; glow: string; badge: string; label: string; icon: string }> = {
  low:    { gradient: 'from-emerald-500 to-teal-400',  glow: 'shadow-emerald-500/30', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', label: 'LOW RISK',    icon: '✓' },
  medium: { gradient: 'from-amber-500 to-orange-400',  glow: 'shadow-amber-500/30',   badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',           label: 'MEDIUM RISK', icon: '⚡' },
  high:   { gradient: 'from-rose-500 to-red-500',      glow: 'shadow-rose-500/30',    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',               label: 'HIGH RISK',   icon: '⚠' },
};

const DISEASE_COLORS = ['#0ea5e9', '#22d3ee', '#6366f1', '#8b5cf6', '#a78bfa'];

const ConfidenceGauge = ({ value }: { value: number }) => {
  const color = value >= 75 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444';
  const data = [{ value, fill: color }];
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-36 w-36">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="60%" innerRadius="70%" outerRadius="100%" startAngle={180} endAngle={0} data={data}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" background={{ fill: 'rgba(255,255,255,0.2)' }} cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
          <span className="text-3xl font-bold text-white">{value}%</span>
          <span className="text-xs text-white/70">confidence</span>
        </div>
      </div>
    </div>
  );
};

export default function PredictionResults() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.predictions.get(id).then(setPrediction).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="container max-w-7xl py-10 space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-48 rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6"><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>
        <Skeleton className="h-[600px] rounded-2xl" />
      </div>
    </div>
  );

  if (!prediction) return (
    <div className="container max-w-7xl py-10">
      <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Not found</AlertTitle><AlertDescription>This prediction does not exist.</AlertDescription></Alert>
      <Button className="mt-4" onClick={() => navigate('/dashboard')}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
    </div>
  );

  const risk = (prediction.risk_level as RiskLevel) || 'low';
  const riskCfg = RISK_CONFIG[risk] || RISK_CONFIG.low;
  const confidence = prediction.confidence_score as number;
  const diseases = (prediction.predicted_diseases as Array<{ disease_name: string; probability: number; risk_level: string }>) || [];
  const symptoms = (prediction.symptoms as string[]) || [];
  const recs = prediction.recommendations as Record<string, unknown> | undefined;
  const vitals = prediction.vitals as Record<string, number> | null;
  const homeRemedies = (recs?.home_remedies as string[]) || [];
  const tests = (recs?.recommended_tests as string[]) || [];
  const doctors = (recs?.doctor_specialties as string[]) || [];
  const actions = (recs?.immediate_actions as string[]) || [];

  const barData = diseases.map((d, i) => ({
    name: d.disease_name.length > 18 ? d.disease_name.slice(0, 16) + '…' : d.disease_name,
    fullName: d.disease_name,
    probability: d.probability,
    color: DISEASE_COLORS[i % DISEASE_COLORS.length],
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container max-w-7xl py-8 space-y-6">

        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="group text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />Back to Dashboard
        </Button>

        {/* Hero risk banner */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${riskCfg.gradient} p-6 text-white shadow-2xl`}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1 opacity-80">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">Health Prediction Results</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">{riskCfg.icon} {riskCfg.label}</h1>
              <p className="mt-1 text-sm opacity-75">
                {prediction.created_at ? format(new Date(prediction.created_at as string), 'MMMM dd, yyyy • h:mm a') : 'Just generated'}
              </p>
              {prediction.ai_enriched && (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                  <Sparkles className="h-3 w-3" />AI-enriched by DeepSeek-R1
                </span>
              )}
            </div>
            <ConfidenceGauge value={confidence} />
          </div>
        </div>

        {recs?.emergency_warning && (
          <Alert variant="destructive" className="border-2">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg font-bold">⚠️ EMERGENCY — Seek Immediate Care</AlertTitle>
            <AlertDescription className="mt-1">{recs.emergency_message as string}</AlertDescription>
          </Alert>
        )}

        <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
            <strong>Medical Disclaimer:</strong> For educational purposes only. Always consult a licensed healthcare professional.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">

            {/* Disease probability chart */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Activity className="h-5 w-5 text-primary" />Predicted Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {barData.length > 0 && (
                  <div className="h-52 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" width={130}
                          tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(v: number, _n: string, props: { payload?: { fullName?: string } }) => [`${v}%`, props?.payload?.fullName || 'Probability']}
                          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }}
                        />
                        <Bar dataKey="probability" radius={[0, 6, 6, 0]} maxBarSize={28}>
                          {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="space-y-3">
                  {diseases.map((d, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border bg-muted/20 p-3 hover:bg-muted/40 transition-colors">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold"
                        style={{ background: DISEASE_COLORS[i % DISEASE_COLORS.length] }}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{d.disease_name}</p>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-border overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${d.probability}%`, background: DISEASE_COLORS[i % DISEASE_COLORS.length] }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">{d.probability}%</p>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${RISK_CONFIG[d.risk_level as RiskLevel]?.badge || 'bg-muted text-muted-foreground'}`}>
                          {d.risk_level}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Reasoning */}
            {prediction.reasoning && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <TrendingUp className="h-5 w-5 text-primary" />Clinical Analysis
                    {prediction.ml_powered === false && (
                      <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        ⚠ Rule-based mode — ML model not loaded
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {prediction.ml_powered === false && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                      <strong>Action needed:</strong> Copy <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">model.pkl</code>, <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">label_encoder.pkl</code> and <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">symptom_list.pkl</code> from your original project into the <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">backend/</code> folder, then restart the server.
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{prediction.reasoning as string}</p>
                </CardContent>
              </Card>
            )}

            {/* Symptoms */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <ClipboardList className="h-5 w-5 text-primary" />Reported Symptoms ({symptoms.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {symptoms.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium hover:bg-muted transition-colors">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />{s}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Vitals */}
            {vitals && Object.values(vitals).some(Boolean) && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Heart className="h-5 w-5 text-rose-500" />Vital Signs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {vitals.blood_pressure_systolic && (
                      <div className="flex items-center gap-3 rounded-xl border bg-rose-50/50 dark:bg-rose-900/10 p-3">
                        <Heart className="h-7 w-7 text-rose-400 shrink-0" />
                        <div><p className="text-xs text-muted-foreground">Blood Pressure</p>
                          <p className="font-bold text-sm">{vitals.blood_pressure_systolic}/{vitals.blood_pressure_diastolic} <span className="font-normal text-xs text-muted-foreground">mmHg</span></p></div>
                      </div>
                    )}
                    {vitals.blood_sugar && (
                      <div className="flex items-center gap-3 rounded-xl border bg-amber-50/50 dark:bg-amber-900/10 p-3">
                        <Droplets className="h-7 w-7 text-amber-400 shrink-0" />
                        <div><p className="text-xs text-muted-foreground">Blood Sugar</p>
                          <p className="font-bold text-sm">{vitals.blood_sugar} <span className="font-normal text-xs text-muted-foreground">mg/dL</span></p></div>
                      </div>
                    )}
                    {vitals.heart_rate && (
                      <div className="flex items-center gap-3 rounded-xl border bg-blue-50/50 dark:bg-blue-900/10 p-3">
                        <Zap className="h-7 w-7 text-blue-400 shrink-0" />
                        <div><p className="text-xs text-muted-foreground">Heart Rate</p>
                          <p className="font-bold text-sm">{vitals.heart_rate} <span className="font-normal text-xs text-muted-foreground">bpm</span></p></div>
                      </div>
                    )}
                    {vitals.temperature && (
                      <div className="flex items-center gap-3 rounded-xl border bg-orange-50/50 dark:bg-orange-900/10 p-3">
                        <Thermometer className="h-7 w-7 text-orange-400 shrink-0" />
                        <div><p className="text-xs text-muted-foreground">Temperature</p>
                          <p className="font-bold text-sm">{vitals.temperature}° <span className="font-normal text-xs text-muted-foreground">F</span></p></div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {recs && (
              <Card className="border-0 shadow-lg overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Stethoscope className="h-5 w-5 text-primary" />What To Do Now
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {tests.length > 0 && (
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                        <CheckCircle2 className="h-4 w-4" />Recommended Tests
                      </h3>
                      <div className="space-y-2">
                        {tests.map((t, i) => (
                          <div key={i} className="flex items-start gap-3 rounded-xl bg-primary/5 border border-primary/10 p-3">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white mt-0.5">{i + 1}</span>
                            <span className="text-sm">{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {doctors.length > 0 && (
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-secondary">
                        <Stethoscope className="h-4 w-4" />Consult These Specialists
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {doctors.map((d, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 border border-secondary/20 px-3 py-1.5 text-xs font-medium text-secondary dark:text-secondary">
                            <Stethoscope className="h-3 w-3" />{d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {actions.length > 0 && (
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-4 w-4" />Immediate Actions
                      </h3>
                      <div className="space-y-2">
                        {actions.map((a, i) => (
                          <div key={i} className="flex items-start gap-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30 p-3">
                            <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                            <span className="text-sm">{a}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {homeRemedies.length > 0 && (
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        <Home className="h-4 w-4" />Home Remedies
                      </h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {homeRemedies.map((r, i) => (
                          <div key={i} className="flex items-start gap-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/30 p-3">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                            <span className="text-sm">{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Nearby doctors */}
            <NearbyDoctors
              doctors={doctors}
              diseaseName={diseases[0]?.disease_name}
            />

            <Separator />
            <div className="flex gap-3 pb-8">
              <Button asChild className="shadow-md"><Link to="/predict">New Prediction</Link></Button>
              <Button variant="outline" asChild><Link to="/history">View History</Link></Button>
            </div>
          </div>

          {/* AI Chat panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <AIChatPanel
                symptoms={symptoms.map(s => s.split(' (')[0])}
                predictionId={id}
                className="h-full"
                initialMessage={`I've reviewed your prediction. You have **${riskCfg.label}** with ${diseases[0]?.disease_name || 'detected conditions'} at ${diseases[0]?.probability || 0}% probability. Would you like me to explain these results, suggest home remedies, or help you understand which specialist to see first?`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

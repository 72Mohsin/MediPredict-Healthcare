import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Plus, X, Loader2, Brain, Sparkles } from 'lucide-react';
import { AIChatPanel } from '@/components/AIChatPanel';
import { api } from '@/lib/api';

interface Symptom { name: string; severity: string; }

export default function PredictionForm() {
  const navigate = useNavigate();
  const [allSymptoms, setAllSymptoms] = useState<string[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<Symptom[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [vitals, setVitals] = useState({ blood_pressure_systolic: '', blood_pressure_diastolic: '', blood_sugar: '', cholesterol: '', heart_rate: '', temperature: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    // Load all 171 symptoms from backend ML model
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/symptoms`)
      .then(r => r.json())
      .then(data => setAllSymptoms(data.symptoms || []))
      .catch(() => setAllSymptoms([]));
  }, []);

  const filtered = allSymptoms.filter(
    s => s.toLowerCase().includes(searchTerm.toLowerCase()) && !selectedSymptoms.some(sel => sel.name === s)
  );

  const addSymptom = (name: string) => { setSelectedSymptoms(p => [...p, { name, severity: 'Moderate' }]); setSearchTerm(''); };
  const removeSymptom = (name: string) => setSelectedSymptoms(p => p.filter(s => s.name !== name));
  const updateSeverity = (name: string, severity: string) =>
    setSelectedSymptoms(p => p.map(s => s.name === name ? { ...s, severity } : s));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSymptoms.length === 0) { setError('Please add at least one symptom'); return; }
    setError(''); setLoading(true);
    try {
      const vitalsData = Object.fromEntries(Object.entries(vitals).filter(([, v]) => v).map(([k, v]) => [k, Number(v)]));
      const result = await api.predictions.create(selectedSymptoms, Object.keys(vitalsData).length > 0 ? vitalsData : undefined) as { id: string };
      navigate(`/results/${result.id}`);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const symptomNames = selectedSymptoms.map(s => s.name);

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Health Prediction</h1>
        <p className="text-muted-foreground">
          {allSymptoms.length > 0 ? <>ML model with <strong>{allSymptoms.length}</strong> symptoms across 42 diseases, enriched by DeepSeek-R1 AI</> : <span className="text-muted-foreground text-sm">Loading symptom database…</span>}
        </p>
      </div>

      <Alert className="mb-8 border-warning bg-warning/10">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertDescription className="text-sm">
          <strong>Medical Disclaimer:</strong> For educational purposes only. Not a substitute for professional medical advice. Always consult a healthcare professional.
        </AlertDescription>
      </Alert>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Symptoms</CardTitle>
                <CardDescription>Search from {allSymptoms.length || "171+"} symptoms — heart attack, stroke, diabetes, liver failure and more</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Search Symptoms</Label>
                  <Input placeholder="e.g. chest pain, jaundice, tremors..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  {searchTerm && filtered.length > 0 && (
                    <div className="max-h-52 overflow-y-auto rounded-md border bg-background shadow-md z-10">
                      {filtered.slice(0, 12).map(s => (
                        <button key={s} type="button" onClick={() => addSymptom(s)}
                          className="flex w-full items-center justify-between p-3 text-left hover:bg-muted border-b last:border-0 transition-colors">
                          <span className="text-sm font-medium">{s}</span>
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                      {filtered.length > 12 && (
                        <p className="p-2 text-xs text-center text-muted-foreground">{filtered.length - 12} more — keep typing to narrow down</p>
                      )}
                    </div>
                  )}
                  {searchTerm && filtered.length === 0 && (
                    <p className="text-sm text-muted-foreground p-2">No matching symptoms found. Try different keywords.</p>
                  )}
                </div>

                {selectedSymptoms.length > 0 && (
                  <>
                    <Separator />
                    <Label>Selected Symptoms ({selectedSymptoms.length})</Label>
                    <div className="space-y-2">
                      {selectedSymptoms.map(s => (
                        <div key={s.name} className="flex items-center gap-3 rounded-lg border p-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{s.name}</p>
                            <div className="mt-2 flex gap-2">
                              {['Mild', 'Moderate', 'Severe'].map(sev => (
                                <Badge key={sev}
                                  variant={s.severity === sev ? 'default' : 'outline'}
                                  className="cursor-pointer text-xs"
                                  onClick={() => updateSeverity(s.name, sev)}>
                                  {sev}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeSymptom(s.name)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Vitals <span className="text-sm font-normal text-muted-foreground">(Optional — improves accuracy)</span></CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {[
                  { id: 'bps', label: 'BP Systolic', key: 'blood_pressure_systolic', placeholder: '120' },
                  { id: 'bpd', label: 'BP Diastolic', key: 'blood_pressure_diastolic', placeholder: '80' },
                  { id: 'bs', label: 'Blood Sugar (mg/dL)', key: 'blood_sugar', placeholder: '100' },
                  { id: 'ch', label: 'Cholesterol (mg/dL)', key: 'cholesterol', placeholder: '200' },
                  { id: 'hr', label: 'Heart Rate (bpm)', key: 'heart_rate', placeholder: '72' },
                  { id: 'tp', label: 'Temperature (°F)', key: 'temperature', placeholder: '98.6' },
                ].map(({ id, label, key, placeholder }) => (
                  <div key={id} className="space-y-2">
                    <Label htmlFor={id}>{label}</Label>
                    <Input id={id} type="number" step="0.1" placeholder={placeholder}
                      value={vitals[key as keyof typeof vitals]}
                      onChange={e => setVitals(v => ({ ...v, [key]: e.target.value }))} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button type="submit" size="lg" disabled={loading || selectedSymptoms.length === 0} className="flex-1">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing with ML + AI...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Prediction</>}
              </Button>
              {selectedSymptoms.length > 0 && (
                <Button type="button" variant="outline" size="lg" onClick={() => setShowChat(!showChat)}>
                  <Brain className="mr-2 h-4 w-4" />{showChat ? 'Hide Chat' : 'Ask MediBot'}
                </Button>
              )}
            </div>

            {loading && (
              <div className="text-center text-sm text-muted-foreground animate-pulse">
                Running ML model + asking DeepSeek-R1 for clinical insights... (15-40 seconds)
              </div>
            )}
          </form>
        </div>

        <div>
          {showChat ? (
            <AIChatPanel symptoms={symptomNames} className="h-full min-h-[600px]"
              initialMessage={`I can see you're experiencing: ${symptomNames.slice(0, 3).join(', ')}${symptomNames.length > 3 ? ` and ${symptomNames.length - 3} more symptoms` : ''}. Let me ask you some follow-up questions. How long have you been experiencing these symptoms?`} />
          ) : (
            <div className="flex h-full min-h-[500px] items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 text-center p-8">
              <div>
                <Brain className="h-14 w-14 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground font-medium text-lg">MediBot AI Chat</p>
                <p className="text-sm text-muted-foreground/60 mt-2 max-w-xs">
                  Add symptoms then click "Ask MediBot" to get follow-up questions, home remedies, and specialist recommendations from DeepSeek-R1
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

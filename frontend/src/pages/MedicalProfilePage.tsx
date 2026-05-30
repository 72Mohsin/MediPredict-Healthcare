import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, Save, X, Plus, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { MedicalProfile } from '@/types';

export default function MedicalProfilePage() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<Partial<MedicalProfile>>({
    age: null, gender: null, height: null, weight: null, bmi: null,
    existing_diseases: [], family_history: [],
    smoking_status: null, alcohol_consumption: null, exercise_habits: null, sleep_pattern: null,
  });
  const [newDisease, setNewDisease] = useState('');
  const [newHistory, setNewHistory] = useState('');

  useEffect(() => {
    if (!user) return;
    api.profile.get().then((data) => { if (data) setProfile(data as Partial<MedicalProfile>); }).catch(console.error);
  }, [user]);

  useEffect(() => {
    if (profile.height && profile.weight) {
      const bmi = Number(profile.weight) / Math.pow(Number(profile.height) / 100, 2);
      setProfile((p) => ({ ...p, bmi: Math.round(bmi * 10) / 10 }));
    }
  }, [profile.height, profile.weight]);

  const addItem = (key: 'existing_diseases' | 'family_history', val: string, setter: (s: string) => void) => {
    if (!val.trim()) return;
    setProfile((p) => ({ ...p, [key]: [...(p[key] || []), val.trim()] }));
    setter('');
  };

  const removeItem = (key: 'existing_diseases' | 'family_history', item: string) => {
    setProfile((p) => ({ ...p, [key]: (p[key] || []).filter((x) => x !== item) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    await api.profile.save(profile as Record<string, unknown>);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Medical Profile</h1>
        <p className="text-muted-foreground">Complete your medical profile for more accurate health predictions</p>
      </div>

      {saved && (
        <Alert className="mb-6 border-secondary bg-secondary/10">
          <CheckCircle2 className="h-4 w-4 text-secondary" />
          <AlertDescription>Profile saved successfully!</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Basic Information</CardTitle>
            <CardDescription>Your personal health metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input id="age" type="number" placeholder="Enter your age" value={profile.age || ''}
                  onChange={(e) => setProfile({ ...profile, age: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={profile.gender || ''} onValueChange={(v) => setProfile({ ...profile, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { id: 'height', label: 'Height (cm)', key: 'height', placeholder: 'e.g., 170' },
                { id: 'weight', label: 'Weight (kg)', key: 'weight', placeholder: 'e.g., 70' },
              ].map(({ id, label, key, placeholder }) => (
                <div key={id} className="space-y-2">
                  <Label htmlFor={id}>{label}</Label>
                  <Input id={id} type="number" placeholder={placeholder}
                    value={profile[key as keyof typeof profile] as number || ''}
                    onChange={(e) => setProfile({ ...profile, [key]: e.target.value ? Number(e.target.value) : null })} />
                </div>
              ))}
              <div className="space-y-2">
                <Label>BMI (auto-calculated)</Label>
                <Input type="number" value={profile.bmi || ''} disabled className="bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medical History</CardTitle>
            <CardDescription>Your existing conditions and family history</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              { label: 'Existing Diseases', key: 'existing_diseases' as const, val: newDisease, setter: setNewDisease, placeholder: 'Add a disease or condition' },
              { label: 'Family Medical History', key: 'family_history' as const, val: newHistory, setter: setNewHistory, placeholder: 'Add family medical history' },
            ].map(({ label, key, val, setter, placeholder }, idx) => (
              <div key={label}>
                {idx > 0 && <Separator className="mb-6" />}
                <div className="space-y-3">
                  <Label>{label}</Label>
                  <div className="flex gap-2">
                    <Input placeholder={placeholder} value={val} onChange={(e) => setter(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(key, val, setter))} />
                    <Button type="button" onClick={() => addItem(key, val, setter)}><Plus className="h-4 w-4" /></Button>
                  </div>
                  {(profile[key] || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(profile[key] || []).map((item, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {item}
                          <button type="button" onClick={() => removeItem(key, item)} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lifestyle Information</CardTitle>
            <CardDescription>Your daily habits and lifestyle factors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Smoking Status</Label>
                <Select value={profile.smoking_status || ''} onValueChange={(v) => setProfile({ ...profile, smoking_status: v })}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Never">Never</SelectItem>
                    <SelectItem value="Former">Former</SelectItem>
                    <SelectItem value="Current">Current</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alcohol Consumption</Label>
                <Select value={profile.alcohol_consumption || ''} onValueChange={(v) => setProfile({ ...profile, alcohol_consumption: v })}>
                  <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Never">Never</SelectItem>
                    <SelectItem value="Occasional">Occasional</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="Heavy">Heavy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exercise">Exercise Habits</Label>
              <Textarea id="exercise" placeholder="e.g., 30 minutes daily walk, gym 3x per week"
                value={profile.exercise_habits || ''} onChange={(e) => setProfile({ ...profile, exercise_habits: e.target.value })} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sleep">Sleep Pattern</Label>
              <Textarea id="sleep" placeholder="e.g., 7-8 hours per night, irregular schedule"
                value={profile.sleep_pattern || ''} onChange={(e) => setProfile({ ...profile, sleep_pattern: e.target.value })} rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? 'Saving...' : <><Save className="mr-2 h-4 w-4" />Save Profile</>}
          </Button>
        </div>
      </form>
    </div>
  );
}

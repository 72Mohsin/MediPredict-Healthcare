import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, ExternalLink, Search, Stethoscope, Phone, Navigation } from 'lucide-react';

// ── Specialty metadata (fully offline) ────────────────────────────────────────
const SPECIALTY_INFO: Record<string, { icon: string; what: string; when: string; searchTerms: string[] }> = {
  'Cardiologist':                   { icon: '❤️', what: 'Heart & blood vessel specialist',      when: 'Chest pain, palpitations, high BP',         searchTerms: ['cardiologist', 'heart specialist', 'cardiac clinic'] },
  'General Physician':              { icon: '🩺', what: 'First-contact doctor for most issues',  when: 'Initial consultation, mild-moderate illness', searchTerms: ['general physician', 'GP clinic', 'family doctor'] },
  'Pulmonologist':                  { icon: '🫁', what: 'Lung & respiratory specialist',         when: 'Breathing issues, chronic cough, asthma',     searchTerms: ['pulmonologist', 'chest specialist', 'respiratory doctor'] },
  'Neurologist':                    { icon: '🧠', what: 'Brain & nervous system specialist',     when: 'Headaches, seizures, numbness, dizziness',    searchTerms: ['neurologist', 'neurology clinic', 'brain specialist'] },
  'Gastroenterologist':             { icon: '🫀', what: 'Digestive system specialist',           when: 'Stomach pain, IBS, liver issues',             searchTerms: ['gastroenterologist', 'stomach specialist', 'gastro clinic'] },
  'Endocrinologist':                { icon: '💉', what: 'Hormones & metabolism specialist',      when: 'Diabetes, thyroid, weight issues',             searchTerms: ['endocrinologist', 'diabetes specialist', 'thyroid doctor'] },
  'Orthopedist':                    { icon: '🦴', what: 'Bone & joint specialist',               when: 'Joint pain, fractures, spine problems',        searchTerms: ['orthopedist', 'orthopaedic surgeon', 'bone specialist'] },
  'Rheumatologist':                 { icon: '🦾', what: 'Arthritis & autoimmune specialist',     when: 'Joint inflammation, arthritis, lupus',         searchTerms: ['rheumatologist', 'arthritis specialist'] },
  'Nephrologist':                   { icon: '🫘', what: 'Kidney specialist',                     when: 'Kidney disease, high creatinine, dialysis',    searchTerms: ['nephrologist', 'kidney specialist'] },
  'Urologist':                      { icon: '🔬', what: 'Urinary system specialist',             when: 'UTI, kidney stones, bladder issues',           searchTerms: ['urologist', 'urology clinic'] },
  'Hematologist':                   { icon: '🩸', what: 'Blood disorder specialist',             when: 'Anemia, clotting disorders, blood cancer',     searchTerms: ['hematologist', 'blood specialist'] },
  'Infectious Disease Specialist':  { icon: '🦠', what: 'Infection & immunity specialist',       when: 'Persistent infections, fever of unknown origin',searchTerms: ['infectious disease doctor', 'infection specialist'] },
  'Hepatologist':                   { icon: '🫀', what: 'Liver specialist',                      when: 'Hepatitis, cirrhosis, jaundice',               searchTerms: ['hepatologist', 'liver specialist'] },
  'Allergist':                      { icon: '🌿', what: 'Allergy & asthma specialist',           when: 'Allergic reactions, asthma, eczema',           searchTerms: ['allergist', 'allergy specialist', 'immunologist'] },
  'Vascular Surgeon':               { icon: '🩺', what: 'Blood vessel specialist',              when: 'DVT, varicose veins, blocked arteries',        searchTerms: ['vascular surgeon', 'vascular specialist'] },
  'General Surgeon':                { icon: '🔪', what: 'Surgical specialist',                   when: 'Appendicitis, gallstones, hernia',             searchTerms: ['general surgeon', 'surgical clinic'] },
  'Emergency Medicine':             { icon: '🚨', what: 'Emergency care department',             when: 'Any emergency — go to ER immediately',         searchTerms: ['emergency hospital', 'ER near me', 'accident and emergency'] },
  'ENT Specialist':                 { icon: '👂', what: 'Ear, Nose & Throat specialist',        when: 'Sinus, ear pain, voice/throat issues',         searchTerms: ['ENT specialist', 'ear nose throat doctor', 'otolaryngologist'] },
  'Movement Disorder Specialist':   { icon: '🧠', what: 'Parkinson\'s & tremor specialist',     when: 'Tremors, Parkinson\'s, balance disorders',     searchTerms: ['movement disorder specialist', 'neurologist Parkinson'] },
  'Electrophysiologist':            { icon: '⚡', what: 'Heart rhythm specialist',              when: 'Arrhythmia, pacemaker, abnormal ECG',          searchTerms: ['electrophysiologist', 'cardiac electrophysiology'] },
};

function getSpecialtyInfo(name: string) {
  // exact match first, then partial
  if (SPECIALTY_INFO[name]) return SPECIALTY_INFO[name];
  const key = Object.keys(SPECIALTY_INFO).find(k => name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(name.toLowerCase()));
  return key ? SPECIALTY_INFO[key] : { icon: '🩺', what: 'Medical specialist', when: 'As recommended by your doctor', searchTerms: [name.toLowerCase()] };
}

function buildSearchUrl(specialty: string, city: string, platform: 'google' | 'practo' | 'justdial') {
  const info = getSpecialtyInfo(specialty);
  const term = info.searchTerms[0];
  const location = city.trim() || 'near me';

  if (platform === 'google') {
    return `https://www.google.com/search?q=${encodeURIComponent(`${term} ${location}`)}`;
  }
  if (platform === 'practo') {
    // Practo is popular in India — deep link to search
    const citySlug = city.trim().toLowerCase().replace(/\s+/g, '-') || 'india';
    return `https://www.practo.com/search/doctors?results_type=doctor&q=${encodeURIComponent(term)}&city=${encodeURIComponent(citySlug)}`;
  }
  if (platform === 'justdial') {
    return `https://www.justdial.com/${encodeURIComponent(city.trim() || 'India')}/${encodeURIComponent(term)}`;
  }
  return '#';
}

// ── Emergency banner ──────────────────────────────────────────────────────────
function EmergencyBanner() {
  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-900/20 p-4">
      <span className="text-2xl">🚨</span>
      <div>
        <p className="font-bold text-rose-700 dark:text-rose-300 text-sm">Emergency — Call immediately</p>
        <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
          Call <strong>112</strong> (India) or go to the nearest hospital emergency room right now.
          Do not wait for an appointment.
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface NearbyDoctorsProps {
  doctors: string[];
  diseaseName?: string;
}

export function NearbyDoctors({ doctors, diseaseName }: NearbyDoctorsProps) {
  const [city, setCity] = useState('');
  const [searched, setSearched] = useState(false);

  if (!doctors || doctors.length === 0) return null;

  const hasEmergency = doctors.some(d => d.toLowerCase().includes('emergency'));
  const nonEmergency = doctors.filter(d => !d.toLowerCase().includes('emergency'));

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-sky-500 to-blue-400" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
            <MapPin className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          </div>
          Find a Doctor Near You
          {diseaseName && (
            <span className="text-xs font-normal text-muted-foreground ml-1">for {diseaseName}</span>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Specialist recommendations are offline. Click "Search" to find real doctors in your city.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">

        {hasEmergency && <EmergencyBanner />}

        {/* Specialist cards (fully offline) */}
        <div className="space-y-3">
          {nonEmergency.map((specialty, i) => {
            const info = getSpecialtyInfo(specialty);
            return (
              <div key={i} className="rounded-xl border bg-muted/10 p-4 space-y-3">
                {/* Specialty header */}
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{info.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{specialty}</p>
                      {i === 0 && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{info.what}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium">See when:</span> {info.when}
                    </p>
                  </div>
                </div>

                {/* Search buttons — need internet */}
                <div className="flex flex-wrap gap-2">
                  <a
                    href={buildSearchUrl(specialty, city, 'google')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-medium text-white transition-colors"
                  >
                    <Search className="h-3 w-3" />Google
                    <ExternalLink className="h-3 w-3 opacity-70" />
                  </a>
                  <a
                    href={buildSearchUrl(specialty, city, 'practo')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white transition-colors"
                  >
                    <Stethoscope className="h-3 w-3" />Practo
                    <ExternalLink className="h-3 w-3 opacity-70" />
                  </a>
                  <a
                    href={buildSearchUrl(specialty, city, 'justdial')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 px-3 py-1.5 text-xs font-medium text-white transition-colors"
                  >
                    <Phone className="h-3 w-3" />JustDial
                    <ExternalLink className="h-3 w-3 opacity-70" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* City input */}
        <div className="rounded-xl border border-dashed border-sky-300 dark:border-sky-700 bg-sky-50/50 dark:bg-sky-900/10 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <p className="text-sm font-medium">Enter your city for better results</p>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Hyderabad, Mumbai, Delhi…"
              value={city}
              onChange={e => { setCity(e.target.value); setSearched(false); }}
              className="flex-1 text-sm h-9"
            />
            <Button
              size="sm"
              className="h-9 bg-sky-600 hover:bg-sky-700 text-white shrink-0"
              onClick={() => setSearched(true)}
              disabled={!city.trim()}
            >
              <Search className="h-3.5 w-3.5 mr-1.5" />Set City
            </Button>
          </div>
          {searched && city && (
            <p className="text-xs text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              Search links updated for <strong>{city}</strong> — click any button above.
            </p>
          )}
          {!city && (
            <p className="text-xs text-muted-foreground">
              Without a city, links will search "near me" using your browser's location.
            </p>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          Search links open in your browser and require internet. Doctor suggestions are generated offline by the ML model.
        </p>
      </CardContent>
    </Card>
  );
}

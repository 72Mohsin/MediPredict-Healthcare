import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Brain, Stethoscope, ArrowRight, CheckCircle2, Sparkles,
  Database, Zap, MessageCircle, BarChart2, ShieldCheck,
} from 'lucide-react';

const ML_FEATURES = [
  { icon: Database,      label: '171 symptoms',          desc: 'Full symptom database from real medical datasets' },
  { icon: Brain,         label: 'Random Forest + GBM',   desc: 'Ensemble of two trained ML models for accuracy' },
  { icon: BarChart2,     label: 'Probability scores',    desc: 'Each disease ranked with a confidence percentage' },
  { icon: Stethoscope,   label: 'Specialist mapping',    desc: 'Recommends the right doctor type for each disease' },
  { icon: ShieldCheck,   label: '42 diseases covered',   desc: 'From common cold to liver failure and heart attack' },
  { icon: Sparkles,      label: 'AI enrichment',         desc: 'DeepSeek-R1 adds clinical insights when available' },
];

const AI_FEATURES = [
  { icon: MessageCircle, label: 'Conversational',        desc: 'Ask follow-up questions in natural language' },
  { icon: Zap,           label: 'Streaming responses',   desc: 'See the answer appear word by word in real time' },
  { icon: Brain,         label: 'Knows your history',    desc: 'References your past predictions and medical profile' },
  { icon: CheckCircle2,  label: 'Home remedies',         desc: 'Specific, actionable remedies tailored to your case' },
];

export default function MLPrediction() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container max-w-4xl py-12 space-y-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Brain className="h-4 w-4" />How MediPredict Works
          </div>
          <h1 className="text-4xl font-bold tracking-tight">One prediction, two AI engines</h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-base">
            When you click <strong>Generate Prediction</strong>, both systems work together automatically.
            You don't need to choose — they are already combined.
          </p>
        </div>

        {/* Flow diagram */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
          {[
            { label: 'You select symptoms', color: 'bg-muted border' },
            { label: '→', color: '' },
            { label: 'ML model runs', color: 'bg-primary/10 border border-primary/20 text-primary font-medium' },
            { label: '+', color: '' },
            { label: 'DeepSeek-R1 enriches', color: 'bg-violet-100 border border-violet-200 text-violet-700 dark:bg-violet-900/30 dark:border-violet-700 dark:text-violet-300 font-medium' },
            { label: '→', color: '' },
            { label: 'Results page', color: 'bg-emerald-100 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300 font-medium' },
          ].map((step, i) => (
            step.label === '→' || step.label === '+' ? (
              <span key={i} className="text-muted-foreground font-bold text-lg hidden sm:block">{step.label}</span>
            ) : (
              <span key={i} className={`px-3 py-1.5 rounded-lg text-center ${step.color}`}>{step.label}</span>
            )
          ))}
        </div>

        {/* ML Model card */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary to-cyan-400" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              Engine 1 — Machine Learning Model
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              A <strong>Random Forest + Gradient Boosting ensemble</strong> trained on real medical symptom data.
              This runs instantly on your server and always gives a result, even without internet or Ollama.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ML_FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
              ✓ This is what produces the <strong>disease list, probability percentages, recommended tests, and specialist suggestions</strong> on your results page.
            </p>
          </CardContent>
        </Card>

        {/* MediBot card */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-400" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              Engine 2 — MediBot (DeepSeek-R1)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              A local Large Language Model running on your machine via Ollama.
              It <strong>cannot replace the ML model</strong> — it adds clinical reasoning, follow-up questions,
              and conversational support on top of the ML results.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {AI_FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                    <Icon className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground bg-violet-50/50 dark:bg-violet-900/10 border border-violet-200/50 dark:border-violet-800/30 rounded-lg px-3 py-2">
              ✓ This powers the <strong>chat panel on the results page</strong> and the <strong>MediBot tab</strong> in the navbar.
              If Ollama is offline, the ML prediction still works normally.
            </p>
          </CardContent>
        </Card>

        {/* Why different results callout */}
        <Card className="border-0 shadow-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30">
          <CardContent className="p-5">
            <h3 className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4" />Why do the two sometimes show different diseases?
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
              The ML model is a <strong>statistical pattern matcher</strong> — it scores diseases by how well
              your symptom combination matches patterns in its training data.
              DeepSeek-R1 is a <strong>language model</strong> — it reasons like a doctor writing notes,
              considering context, severity, and clinical likelihood.
              They can disagree, especially for overlapping symptom sets.
              The ML model's probabilities are more reliable for diagnosis;
              the AI's reasoning is more useful for understanding <em>why</em>.
            </p>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Button asChild size="lg" className="w-full sm:w-auto shadow-md">
            <Link to="/predict">
              <Sparkles className="mr-2 h-4 w-4" />Start a New Prediction
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link to="/chat">
              <MessageCircle className="mr-2 h-4 w-4" />Open MediBot Chat
            </Link>
          </Button>
        </div>

      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, Brain, Shield, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="container py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 flex justify-center">
            <Activity className="h-16 w-16 text-primary" />
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
            Medical Healthcare Prediction Platform
          </h1>
          <p className="mb-8 text-lg text-muted-foreground md:text-xl">
            Advanced AI-powered health prediction system that analyzes your symptoms and lifestyle
            to provide personalized health insights and recommendations.
          </p>

          <Alert className="mb-8 border-warning bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-sm">
              <strong>Medical Disclaimer:</strong> This system provides health insights for educational
              purposes only and is not a substitute for professional medical advice.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            {user ? (
              <Button size="lg" asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild>
                  <Link to="/register">Get Started</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/50 py-20">
        <div className="container">
          <h2 className="mb-12 text-center text-3xl font-bold">Key Features</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Brain, color: 'text-primary', title: 'AI-Powered Predictions', desc: 'Advanced machine learning algorithms analyze your symptoms and medical history to predict possible health conditions with confidence scores.' },
              { icon: CheckCircle2, color: 'text-secondary', title: 'Personalized Recommendations', desc: 'Get tailored advice on recommended tests, specialist consultations, and immediate actions based on your health assessment.' },
              { icon: TrendingUp, color: 'text-primary', title: 'Health Tracking', desc: 'Monitor your health trends over time with comprehensive prediction history and visual analytics of your health journey.' },
              { icon: Shield, color: 'text-secondary', title: 'Secure & Private', desc: 'Your medical data stays in your browser. No data is sent to external servers — complete privacy guaranteed.' },
              { icon: Activity, color: 'text-primary', title: 'Comprehensive Input', desc: 'Input detailed medical information including symptoms, vitals, lifestyle factors, and family history for accurate predictions.' },
              { icon: AlertTriangle, color: 'text-destructive', title: 'Emergency Alerts', desc: 'Receive immediate warnings for critical symptoms that require urgent medical attention with clear guidance on next steps.' },
            ].map(({ icon: Icon, color, title, desc }) => (
              <Card key={title}>
                <CardHeader>
                  <Icon className={`mb-2 h-8 w-8 ${color}`} />
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="container py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>
        <div className="mx-auto max-w-3xl space-y-8">
          {[
            { n: 1, title: 'Create Your Profile', desc: 'Sign up and complete your medical profile with age, gender, existing conditions, and lifestyle information.' },
            { n: 2, title: 'Input Your Symptoms', desc: 'Select your current symptoms with severity levels and optionally add vital signs like blood pressure and blood sugar.' },
            { n: 3, title: 'Get AI Predictions', desc: 'Our AI analyzes your data and provides predictions of possible diseases with probability scores and risk levels.' },
            { n: 4, title: 'Follow Recommendations', desc: 'Receive personalized action plans including recommended tests, specialist referrals, and immediate steps to take.' },
          ].map(({ n, title, desc }) => (
            <div key={n} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                {n}
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold">{title}</h3>
                <p className="text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="border-t bg-primary py-20 text-primary-foreground">
          <div className="container text-center">
            <h2 className="mb-4 text-3xl font-bold">Ready to Get Started?</h2>
            <p className="mb-8 text-lg opacity-90">
              Take control of your health with AI-powered insights — no account required to explore.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/register">Create Free Account</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, TrendingUp, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { format } from 'date-fns';

export default function PredictionHistory() {
  const [predictions, setPredictions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.predictions.list(50).then(setPredictions).catch(console.error).finally(() => setLoading(false));
  }, []);

  const getRiskColor = (risk: string) => {
    if (risk === 'low') return 'bg-secondary text-secondary-foreground';
    if (risk === 'medium') return 'bg-warning text-white';
    if (risk === 'high') return 'bg-destructive text-destructive-foreground';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Prediction History</h1>
        <p className="text-muted-foreground">All your past health assessments, saved to your account</p>
      </div>
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : predictions.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No predictions yet</h3>
          <Button asChild><Link to="/predict">Create First Prediction</Link></Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {predictions.map((p) => {
            const diseases = p.predicted_diseases as Array<{ disease_name: string }> || [];
            return (
              <Card key={p.id as string} className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge className={getRiskColor(p.risk_level as string)}>{(p.risk_level as string).toUpperCase()} RISK</Badge>
                        <span className="text-sm text-muted-foreground">{p.confidence_score as number}% confidence</span>
                      </div>
                      <CardTitle className="text-lg">{diseases.length} Condition(s)</CardTitle>
                      <CardDescription className="mt-1">{diseases.map((d) => d.disease_name).join(', ')}</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/results/${p.id as string}`}>Details <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{format(new Date(p.created_at as string), 'MMM dd, yyyy')}</div>
                    <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />{(p.symptoms as string[]).length} symptoms</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

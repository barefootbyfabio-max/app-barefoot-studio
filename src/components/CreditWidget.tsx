import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Zap } from 'lucide-react';

interface CreditWidgetProps {
  variant?: 'default' | 'compact';
  forDate?: string; // Optional: date to check credits for (YYYY-MM-DD format)
}

export function CreditWidget({ variant = 'default', forDate }: CreditWidgetProps) {
  const { user, isProfessor } = useAuth();

  const { data: credits } = useQuery({
    queryKey: ['weekly-credits', user?.id, forDate],
    queryFn: async () => {
      if (!user) return null;
      
      const rpcParams: { p_student_id: string; p_date?: string } = { 
        p_student_id: user.id 
      };
      if (forDate) {
        rpcParams.p_date = forDate;
      }
      
      const { data, error } = await supabase
        .rpc('get_or_create_weekly_credits', rpcParams);
      
      if (error) {
        console.error('Error fetching credits:', error);
        return null;
      }
      
      return data?.[0] || null;
    },
    enabled: !!user && !isProfessor,
  });

  // Don't show for professors or if no data
  if (isProfessor || !credits || credits.credits_total === 0) {
    return null;
  }

  const available = credits.credits_total - credits.credits_used;
  const percentage = (credits.credits_used / credits.credits_total) * 100;

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Zap className="w-4 h-4 text-primary" />
        <span className="font-medium">{available}/{credits.credits_total}</span>
        <span className="text-muted-foreground">créditos</span>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">Créditos da Semana</p>
          <p className="text-sm text-muted-foreground">
            {available} {available === 1 ? 'aula disponível' : 'aulas disponíveis'}
          </p>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Usados</span>
          <span className="font-medium">{credits.credits_used} de {credits.credits_total}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

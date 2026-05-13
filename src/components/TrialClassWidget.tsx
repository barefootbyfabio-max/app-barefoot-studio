import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Calendar, Clock, Sparkles, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UpgradePlanDialog } from './UpgradePlanDialog';

export function TrialClassWidget() {
  const { user } = useAuth();

  const { data: trialClass, isLoading } = useQuery({
    queryKey: ['trial-class', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trial_classes')
        .select('*, time_slots(start_time, end_time, day_of_week)')
        .eq('student_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!trialClass) {
    return (
      <div className="relative overflow-hidden rounded-2xl border-2 border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-950/20 p-8">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Aula Experimental</h2>
          <p className="text-muted-foreground">
            Aguardando o professor agendar sua aula experimental. Você será notificado quando a data for definida.
          </p>
        </div>
      </div>
    );
  }

  if (trialClass.status === 'completed') {
    return (
      <div className="relative overflow-hidden rounded-2xl border-2 border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-950/20 p-8">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-6 shadow-lg shadow-green-500/20">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Aula Experimental Concluída! 🎉</h2>
          <p className="text-muted-foreground mb-6">
            Parabéns! Agora escolha seu plano para continuar treinando.
          </p>
          <UpgradePlanDialog />
        </div>
      </div>
    );
  }

  if (trialClass.status === 'scheduled') {
    return (
      <div className="relative overflow-hidden rounded-2xl border-2 border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-950/20 p-8">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
            <Calendar className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Aula Experimental Agendada</h2>
          <div className="flex items-center gap-4 text-lg">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <span className="font-medium">
                {trialClass.booking_date 
                  ? format(new Date(trialClass.booking_date + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })
                  : 'Data a definir'}
              </span>
            </div>
            {trialClass.time_slots && (
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <span className="font-medium">
                  {(trialClass.time_slots as any).start_time?.slice(0, 5)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default: pending
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-950/20 p-8">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Aula Experimental</h2>
        <p className="text-muted-foreground">
          Aguardando o professor agendar sua aula experimental. Você será notificado quando a data for definida.
        </p>
      </div>
    </div>
  );
}

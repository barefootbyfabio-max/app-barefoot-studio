import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export function UpgradePlanDialog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [planType, setPlanType] = useState<'2x' | '3x'>('2x');

  const upgradeMutation = useMutation({
    mutationFn: async (selectedPlan: '2x' | '3x') => {
      const weeklyCredits = selectedPlan === '3x' ? 3 : 2;

      // Update student_plans
      const { data: updatedPlan, error: planError } = await supabase
        .from('student_plans')
        .update({
          plan_type: selectedPlan,
          weekly_credits: weeklyCredits,
        })
        .eq('student_id', user!.id)
        .select();

      if (planError) throw planError;
      if (!updatedPlan || updatedPlan.length === 0) {
        throw new Error('Plano não foi atualizado. Contate o professor.');
      }

      // Update trial class status
      const { error: trialError } = await supabase
        .from('trial_classes')
        .update({ status: 'upgraded' })
        .eq('student_id', user!.id);

      if (trialError) throw trialError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-class'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-credits'] });
      queryClient.invalidateQueries({ queryKey: ['student-plan'] });
      toast.success('Plano ativado!', {
        description: 'Agora você pode agendar suas aulas normalmente.',
      });
      setOpen(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao ativar plano', {
        description: error?.message,
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="lg" className="gap-2">
          Escolher Plano
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escolha seu plano</DialogTitle>
          <DialogDescription>
            Selecione quantas vezes por semana você quer treinar.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={planType}
            onValueChange={(v) => setPlanType(v as '2x' | '3x')}
            className="grid grid-cols-2 gap-4"
          >
            <div className="relative">
              <RadioGroupItem value="2x" id="upgrade-2x" className="peer sr-only" />
              <Label
                htmlFor="upgrade-2x"
                className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
              >
                <Calendar className="w-8 h-8 mb-3" />
                <span className="text-lg font-semibold">2x por semana</span>
                <span className="text-sm text-muted-foreground">2 créditos semanais</span>
              </Label>
            </div>
            <div className="relative">
              <RadioGroupItem value="3x" id="upgrade-3x" className="peer sr-only" />
              <Label
                htmlFor="upgrade-3x"
                className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
              >
                <Calendar className="w-8 h-8 mb-3" />
                <span className="text-lg font-semibold">3x por semana</span>
                <span className="text-sm text-muted-foreground">3 créditos semanais</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Button
          onClick={() => upgradeMutation.mutate(planType)}
          disabled={upgradeMutation.isPending}
          className="w-full"
          size="lg"
        >
          {upgradeMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Ativando...
            </>
          ) : (
            'Ativar Plano'
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

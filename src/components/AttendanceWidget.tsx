import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { CheckCircle2, XCircle, BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function AttendanceWidget() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['my-attendance', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', user!.id)
        .in('status', ['present', 'absent']);
      if (error) throw error;

      const present = data.filter(r => r.status === 'present').length;
      const absent = data.filter(r => r.status === 'absent').length;
      const total = present + absent;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      return { present, absent, total, percentage };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="mt-6 rounded-2xl border-0 bg-card shadow-card p-6 animate-pulse">
        <div className="h-20" />
      </div>
    );
  }

  if (!stats || stats.total === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border-0 bg-card shadow-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-semibold">Minha Frequência</h3>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Frequência geral</span>
          <span className="font-semibold">{stats.percentage}%</span>
        </div>
        <Progress value={stats.percentage} className="h-2" />
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <p className="text-2xl font-bold text-emerald-600">{stats.present}</p>
          </div>
          <p className="text-xs text-muted-foreground">Presenças</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <XCircle className="w-4 h-4 text-destructive" />
            <p className="text-2xl font-bold text-destructive">{stats.absent}</p>
          </div>
          <p className="text-xs text-muted-foreground">Faltas</p>
        </div>
      </div>
    </div>
  );
}

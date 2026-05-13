import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowRight, User, Settings, Star } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { FixedBookingRequest } from '@/components/FixedBookingRequest';
import { CreditWidget } from '@/components/CreditWidget';
import { TrialClassWidget } from '@/components/TrialClassWidget';
import { AttendanceWidget } from '@/components/AttendanceWidget';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function Dashboard() {
  const { profile, user, isProfessor } = useAuth();

  // Fetch student plan to check if experimental
  const { data: studentPlan } = useQuery({
    queryKey: ['student-plan', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_plans')
        .select('plan_type, weekly_credits')
        .eq('student_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !isProfessor,
  });

  const isExperimental = studentPlan?.plan_type === 'experimental';

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-heading tracking-wide mb-2">
            Olá, {profile?.name || 'Aluno'}! 👋
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo ao Barefoot Studio. O que você gostaria de fazer hoje?
          </p>
        </motion.div>

        {/* Trial Class Widget for experimental students */}
        {!isProfessor && isExperimental && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-4xl mb-6"
          >
            <TrialClassWidget />
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
          {!isExperimental && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Link to="/aulas" className="block group">
                <div className="relative overflow-hidden rounded-2xl border-0 bg-card shadow-card p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                      <Calendar className="w-7 h-7 text-white" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">Agendar Aula</h2>
                    <p className="text-muted-foreground mb-6">
                      Veja os horários disponíveis e reserve sua próxima aula.
                    </p>
                    <Button variant="outline" className="group-hover:border-primary group-hover:text-primary">
                      Ver horários
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link to="/meus-agendamentos" className="block group">
              <div className="relative overflow-hidden rounded-2xl border-0 bg-card shadow-card p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center mb-6 shadow-lg shadow-accent/20">
                    <Clock className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">Meus Agendamentos</h2>
                  <p className="text-muted-foreground mb-6">
                    Veja suas aulas agendadas e histórico de frequência.
                  </p>
                  <Button variant="outline" className="group-hover:border-accent group-hover:text-accent">
                    Ver agendamentos
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Fixed Booking Request Card - Only for non-experimental students */}
          {!isProfessor && !isExperimental && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div className="relative overflow-hidden rounded-2xl border-2 border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-8">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20">
                    <Star className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">Horário Fixo</h2>
                  <p className="text-muted-foreground mb-6">
                    Solicite uma vaga fixa semanal no horário de sua preferência.
                  </p>
                  <FixedBookingRequest />
                </div>
              </div>
            </motion.div>
          )}

          {isProfessor && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="md:col-span-2"
            >
              <Link to="/admin" className="block group">
                <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-primary/5 p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-primary/40">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                      <Settings className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-semibold mb-1">Área Administrativa</h2>
                      <p className="text-muted-foreground">
                        Gerencie horários, alunos fixos e configurações do estúdio.
                      </p>
                    </div>
                    <Button variant="default">
                      Acessar
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}
        </div>

        {/* Credit Widget - Only for non-experimental students */}
        {!isProfessor && !isExperimental && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: isProfessor ? 0.4 : 0.35 }}
            className="max-w-4xl"
          >
            <CreditWidget />
          </motion.div>
        )}

        {/* Attendance Widget - for all non-professor students */}
        {!isProfessor && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-4xl"
          >
            <AttendanceWidget />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isProfessor ? 0.4 : 0.4 }}
          className="mt-8 p-6 bg-muted/30 rounded-2xl max-w-4xl"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">{profile?.email}</p>
              <p className="text-sm text-muted-foreground capitalize">
                {profile?.role === 'professor' ? 'Professor' : 'Aluno'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </PageLayout>
  );
}
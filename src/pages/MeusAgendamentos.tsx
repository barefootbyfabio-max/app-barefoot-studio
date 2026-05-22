import { motion } from 'framer-motion';
import { format, differenceInHours, addDays, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, Inbox, X, Star, CalendarX, Undo2, Hourglass } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FixedBookingRequest } from '@/components/FixedBookingRequest';

const LOCK_HOURS_BEFORE = 6;

const DAYS_OF_WEEK = [
  'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
];

export default function MeusAgendamentos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['my-bookings', user?.id],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          time_slots (
            start_time,
            end_time,
            day_of_week
          )
        `)
        .eq('aluno_id', user!.id)
        .gte('booking_date', today)
        .eq('status', 'confirmado')
        .order('booking_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch user's fixed bookings
  const { data: fixedBookings = [], isLoading: loadingFixed } = useQuery({
    queryKey: ['my-fixed-bookings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixed_bookings')
        .select(`
          *,
          time_slots (
            start_time,
            end_time,
            day_of_week
          )
        `)
        .eq('aluno_id', user!.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch user's exceptions (skipped days)
  const { data: exceptions = [] } = useQuery({
    queryKey: ['my-fixed-exceptions', user?.id],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('fixed_booking_exceptions')
        .select('*')
        .gte('exception_date', today);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ bookingId, bookingDate, time }: { bookingId: string; bookingDate: string; time: string }) => {
      // Get user profile for notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user!.id)
        .single();

      // Atomic: delete booking + refund credit in one transaction
      const { error } = await supabase.rpc('cancel_booking_with_refund', {
        p_booking_id: bookingId,
      });
      if (error) throw error;

      // Send notification to professor (fire and forget)
      supabase.functions.invoke('send-notification', {
        body: {
          type: 'cancellation',
          details: {
            studentName: profile?.name || 'Aluno',
            date: format(new Date(bookingDate + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR }),
            time
          }
        }
      }).catch(err => console.error('Error sending notification:', err));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-credits'] });
      toast.success('Aula cancelada', {
        description: 'Seu agendamento foi cancelado e o crédito foi devolvido.',
      });
    },
    onError: (error) => {
      console.error('Cancel error:', error);
      toast.error('Erro ao cancelar', {
        description: 'Não foi possível cancelar o agendamento.',
      });
    },
  });

  // Create exception (skip a fixed class day)
  const skipDayMutation = useMutation({
    mutationFn: async ({ fixedBookingId, date }: { fixedBookingId: string; date: string }) => {
      // Atomic: insert exception + refund credit in one transaction
      const { error } = await supabase.rpc('skip_fixed_day_with_refund', {
        p_fixed_booking_id: fixedBookingId,
        p_exception_date: date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-fixed-exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['fixed_booking_exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-credits'] });
      toast.success('Vaga liberada', {
        description: 'Você liberou sua vaga para este dia e o crédito foi devolvido.',
      });
    },
    onError: (error) => {
      console.error('Skip day error:', error);
      toast.error('Erro ao liberar vaga', {
        description: 'Não foi possível liberar a vaga.',
      });
    },
  });

  // Remove exception (re-claim the spot) - must consume credit again
  const reclaimDayMutation = useMutation({
    mutationFn: async ({ exceptionId, date }: { exceptionId: string; date: string }) => {
      // First consume the credit for the class date's week
      const { data: hasCredit, error: creditError } = await supabase.rpc('consume_credit', { 
        p_student_id: user!.id,
        p_date: date
      });
      
      if (creditError) throw creditError;
      if (!hasCredit) {
        throw new Error('Você não tem créditos disponíveis para recuperar esta vaga');
      }
      
      const { error } = await supabase
        .from('fixed_booking_exceptions')
        .delete()
        .eq('id', exceptionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-fixed-exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['fixed_booking_exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-credits'] });
      toast.success('Vaga recuperada', {
        description: 'Sua vaga fixa foi recuperada e o crédito consumido.',
      });
    },
    onError: (error) => {
      console.error('Reclaim day error:', error);
      toast.error('Erro ao recuperar vaga', {
        description: error.message || 'Não foi possível recuperar a vaga.',
      });
    },
  });

  const isCancelLocked = (bookingDate: string, startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const [year, month, day] = bookingDate.split('-').map(Number);
    const slotDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const hoursUntil = differenceInHours(slotDateTime, new Date());
    return hoursUntil < LOCK_HOURS_BEFORE;
  };

  // Generate next occurrences for a fixed booking (next 4 weeks)
  const getNextOccurrences = (fixedBooking: any) => {
    const dayOfWeek = fixedBooking.time_slots?.day_of_week;
    if (dayOfWeek === undefined) return [];

    const occurrences: Date[] = [];
    let checkDate = new Date();
    const endDate = addDays(new Date(), 28); // 4 weeks ahead

    while (checkDate <= endDate && occurrences.length < 4) {
      if (getDay(checkDate) === dayOfWeek) {
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        const startOk = !fixedBooking.start_date || fixedBooking.start_date <= dateStr;
        const endOk = !fixedBooking.end_date || fixedBooking.end_date >= dateStr;
        
        if (startOk && endOk) {
          occurrences.push(new Date(checkDate));
        }
      }
      checkDate = addDays(checkDate, 1);
    }

    return occurrences;
  };

  const isOccurrenceSkipped = (fixedBookingId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return exceptions.find(
      (e: any) => e.fixed_booking_id === fixedBookingId && e.exception_date === dateStr
    );
  };

  return (
    <PageLayout title="Meus Agendamentos" description="Suas próximas aulas agendadas">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Pending Fixed Booking Requests */}
        {fixedBookings.filter((fb: any) => fb.approval_status === 'pending').length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Hourglass className="w-5 h-5 text-orange-500" />
              Solicitações Pendentes
            </h2>
            <div className="space-y-3">
              {fixedBookings
                .filter((fb: any) => fb.approval_status === 'pending')
                .map((fb: any) => (
                  <Card key={fb.id} className="border-orange-200 dark:border-orange-800/50 bg-orange-50/50 dark:bg-orange-950/20">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {DAYS_OF_WEEK[fb.time_slots?.day_of_week]} às {fb.time_slots?.start_time}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Aguardando aprovação do professor
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          Pendente
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </motion.div>
        )}

        {/* Approved Fixed Bookings Section */}
        {fixedBookings.filter((fb: any) => fb.approval_status === 'approved').length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              Meus Horários Fixos
            </h2>
            <div className="space-y-4">
              {fixedBookings
                .filter((fb: any) => fb.approval_status === 'approved')
                .map((fb: any) => (
                <Card key={fb.id} className="overflow-hidden">
                  <CardHeader className="pb-3 bg-amber-50/50 dark:bg-amber-950/20">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>{DAYS_OF_WEEK[fb.time_slots?.day_of_week]}</span>
                      <span className="text-muted-foreground font-normal">às</span>
                      <span>{fb.time_slots?.start_time}</span>
                      <Badge variant="outline" className="ml-auto text-amber-600 border-amber-300">
                        Fixo
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Próximas ocorrências (clique para liberar a vaga):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {getNextOccurrences(fb).map((date) => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const exception = isOccurrenceSkipped(fb.id, date);
                        const locked = isCancelLocked(dateStr, fb.time_slots?.start_time || '00:00');

                        if (exception) {
                          // Day is skipped - show option to reclaim
                          return (
                            <TooltipProvider key={dateStr}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-muted-foreground line-through opacity-60"
                                    onClick={() => {
                                      if (!locked) {
                                        reclaimDayMutation.mutate({ exceptionId: exception.id, date: dateStr });
                                      }
                                    }}
                                    disabled={locked || reclaimDayMutation.isPending}
                                  >
                                    <Undo2 className="w-3 h-3 mr-1" />
                                    {format(date, "d/MM", { locale: ptBR })}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {locked ? 'Muito tarde para remarcar' : 'Clique para recuperar sua vaga'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        }

                        return (
                          <AlertDialog key={dateStr}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className={locked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-destructive/10 hover:text-destructive hover:border-destructive'}
                                      disabled={locked}
                                    >
                                      {format(date, "d/MM", { locale: ptBR })}
                                      {!locked && <CalendarX className="w-3 h-3 ml-1" />}
                                    </Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {locked ? 'Menos de 6h - não pode liberar' : 'Clique para liberar esta vaga'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Liberar vaga?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Você está liberando sua vaga fixa de{' '}
                                  <strong>{format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}</strong>.
                                  Outro aluno poderá agendar neste horário.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => skipDayMutation.mutate({ fixedBookingId: fb.id, date: dateStr })}
                                  className="bg-amber-600 text-white hover:bg-amber-700"
                                >
                                  Liberar vaga
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Regular Bookings Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: fixedBookings.length > 0 ? 0.1 : 0 }}
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Aulas Avulsas Agendadas
          </h2>

          {isLoading ? (
            <div className="space-y-4 max-w-2xl">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/30 rounded-2xl">
              <div className="rounded-full bg-muted/50 p-6 mb-4">
                <Inbox className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhuma aula avulsa agendada</h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                Você pode agendar aulas avulsas quando houver vagas disponíveis.
              </p>
              <Link to="/aulas">
                <Button variant="hero" size="lg">
                  <Calendar className="w-5 h-5" />
                  Agendar aula
                </Button>
              </Link>
            </div>
          ) : (
            <div className="max-w-2xl space-y-4">
              {bookings.map((booking: any, index: number) => {
                const locked = isCancelLocked(booking.booking_date, booking.time_slots?.start_time || '00:00');
                
                return (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-6 bg-card rounded-2xl shadow-card"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Calendar className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg capitalize">
                        {format(new Date(booking.booking_date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                      </p>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{booking.time_slots?.start_time || 'Horário'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium">
                        Confirmado
                      </div>
                      
                      {locked ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled
                                  className="text-muted-foreground"
                                >
                                  <X className="w-5 h-5" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Cancelamento fechado (menos de 6h)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="w-5 h-5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancelar aula?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Você está prestes a cancelar sua aula de{' '}
                                <strong>
                                  {format(new Date(booking.booking_date), "d 'de' MMMM", { locale: ptBR })}
                                </strong>{' '}
                                às <strong>{booking.time_slots?.start_time}</strong>.
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Manter aula</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => cancelMutation.mutate({ 
                                  bookingId: booking.id, 
                                  bookingDate: booking.booking_date,
                                  time: booking.time_slots?.start_time || ''
                                })}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Cancelar aula
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Request Fixed Booking Section - Only show if user has no fixed bookings */}
        {fixedBookings.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl"
          >
            <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/10">
              <CardContent className="py-6">
                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                    <Star className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Quer um horário fixo?</h3>
                    <p className="text-sm text-muted-foreground">
                      Solicite uma vaga fixa semanal e garanta seu lugar toda semana.
                    </p>
                  </div>
                  <FixedBookingRequest />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </PageLayout>
  );
}

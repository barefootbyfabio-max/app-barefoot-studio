import { useState } from 'react';
import { motion } from 'framer-motion';
import { format, addDays, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, Users, Lock, Check, Star, AlertCircle, Sparkles, X, CalendarX } from 'lucide-react';
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
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CreditWidget } from '@/components/CreditWidget';

const DAYS_TO_SHOW = 7;
const LOCK_HOURS_BEFORE = 6;

export default function Aulas() {
  const { user, isProfessor } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Check if student has experimental plan
  const { data: studentPlan } = useQuery({
    queryKey: ['student-plan', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_plans')
        .select('plan_type')
        .eq('student_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !isProfessor,
  });

  const isExperimental = studentPlan?.plan_type === 'experimental';

  // Generate dates excluding Saturdays (6) and Sundays (0)
  const dates: Date[] = [];
  let currentDate = new Date();
  while (dates.length < DAYS_TO_SHOW) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.push(new Date(currentDate));
    }
    currentDate = addDays(currentDate, 1);
  }

  // Fetch weekly credits for the selected date's week
  const { data: credits } = useQuery({
    queryKey: ['weekly-credits', user?.id, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .rpc('get_or_create_weekly_credits', { 
          p_student_id: user.id,
          p_date: format(selectedDate, 'yyyy-MM-dd')
        });
      
      if (error) {
        console.error('Error fetching credits:', error);
        return null;
      }
      
      return data?.[0] || null;
    },
    enabled: !!user && !isProfessor,
  });

  const availableCredits = credits ? credits.credits_total - credits.credits_used : 0;
  const hasCredits = isProfessor || availableCredits > 0;

  // Fetch bookings - only include profiles for professors (privacy)
  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['bookings', selectedDate, isProfessor],
    queryFn: async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const selectQuery = isProfessor
        ? '*, profiles:aluno_id (name, email)'
        : '*';
      
      const { data, error } = await supabase
        .from('bookings')
        .select(selectQuery)
        .eq('booking_date', dateStr)
        .eq('status', 'confirmado');
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch fixed bookings - only include profiles for professors (privacy)
  const { data: fixedBookings = [] } = useQuery({
    queryKey: ['fixed_bookings', isProfessor],
    queryFn: async () => {
      const selectQuery = isProfessor
        ? '*, profiles:aluno_id (name, email), time_slots (day_of_week)'
        : '*, time_slots (day_of_week)';
      
      const { data, error } = await supabase
        .from('fixed_bookings')
        .select(selectQuery);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch exceptions for the selected date (when fixed students skip a day)
  const { data: fixedExceptions = [] } = useQuery({
    queryKey: ['fixed_booking_exceptions', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixed_booking_exceptions')
        .select('fixed_booking_id')
        .eq('exception_date', format(selectedDate, 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: timeSlots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ['time_slots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .eq('is_active', true)
        .order('start_time');
      
      if (error) {
        console.error('Error fetching time slots:', error);
        return [];
      }
      return data || [];
    },
  });

  const bookMutation = useMutation({
    mutationFn: async ({ slotId, slotTime }: { slotId: string; slotTime: string }) => {
      const bookingDate = format(selectedDate, 'yyyy-MM-dd');
      
      // First check credits - pass the booking date to use correct week
      if (!isProfessor) {
        const hasCredit = await supabase.rpc('consume_credit', { 
          p_student_id: user!.id,
          p_date: bookingDate
        });
        if (!hasCredit.data) {
          throw new Error('Você não tem créditos disponíveis nesta semana');
        }
      }
      
      const { error } = await supabase.from('bookings').insert({
        aluno_id: user!.id,
        time_slot_id: slotId,
        booking_date: bookingDate,
        status: 'confirmado',
      });
      if (error) throw error;

      // Get user profile for notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user!.id)
        .single();

      // Send notification to professor (fire and forget)
      supabase.functions.invoke('send-notification', {
        body: {
          type: 'booking',
          details: {
            studentName: profile?.name || 'Aluno',
            date: format(selectedDate, "dd/MM/yyyy", { locale: ptBR }),
            time: slotTime
          }
        }
      }).catch(err => console.error('Error sending notification:', err));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-credits'] });
      toast.success('Aula agendada!', {
        description: 'Sua vaga foi reservada com sucesso.',
      });
    },
    onError: (error: any) => {
      console.error('Booking error:', error);
      const errorMessage = error?.message || '';
      
      // Handle specific backend validation errors
      if (errorMessage.includes('já possui uma aula agendada') || 
          errorMessage.includes('já possui uma vaga fixa')) {
        toast.error('Limite atingido', {
          description: 'Você só pode ter 1 aula por dia.',
        });
      } else if (errorMessage.includes('créditos')) {
        toast.error('Sem créditos', {
          description: errorMessage,
        });
      } else {
        toast.error('Erro ao agendar', {
          description: 'Não foi possível reservar essa vaga.',
        });
      }
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase.rpc('cancel_booking_with_refund', {
        p_booking_id: bookingId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-credits'] });
      toast.success('Aula cancelada', {
        description: 'O crédito foi devolvido.',
      });
    },
    onError: (error: any) => {
      toast.error('Erro ao cancelar', { description: error?.message });
    },
  });

  const releaseFixedMutation = useMutation({
    mutationFn: async ({ fixedBookingId, date }: { fixedBookingId: string; date: string }) => {
      const { error } = await supabase.rpc('skip_fixed_day_with_refund', {
        p_fixed_booking_id: fixedBookingId,
        p_exception_date: date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed_booking_exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['my-fixed-exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-credits'] });
      toast.success('Vaga liberada', {
        description: 'O crédito foi devolvido.',
      });
    },
    onError: (error: any) => {
      toast.error('Erro ao liberar vaga', { description: error?.message });
    },
  });

  const selectedDayOfWeek = selectedDate.getDay();
  const slotsForDay = timeSlots.filter((s: any) => s.day_of_week === selectedDayOfWeek);

  const isSlotLocked = (startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const slotDateTime = new Date(selectedDate);
    slotDateTime.setHours(hours, minutes, 0, 0);
    
    const hoursUntil = differenceInHours(slotDateTime, new Date());
    return hoursUntil < LOCK_HOURS_BEFORE;
  };

  const getSlotBookings = (slotId: string) => {
    return bookings.filter((b: any) => b.time_slot_id === slotId);
  };

  // Get active fixed bookings for a slot on the selected date (excluding exceptions)
  const getSlotFixedBookings = (slotId: string) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const exceptionIds = fixedExceptions.map((e: any) => e.fixed_booking_id);
    
    return fixedBookings.filter((fb: any) => {
      if (fb.time_slot_id !== slotId) return false;
      
      // Check if this fixed booking has an exception for this date
      if (exceptionIds.includes(fb.id)) return false;
      
      // Check if date is within the fixed booking period
      const startOk = !fb.start_date || fb.start_date <= dateStr;
      const endOk = !fb.end_date || fb.end_date >= dateStr;
      
      return startOk && endOk;
    });
  };

  const isUserBooked = (slotId: string) => {
    return bookings.some((b: any) => b.time_slot_id === slotId && b.aluno_id === user?.id);
  };

  const getUserBookingId = (slotId: string): string | undefined => {
    return bookings.find((b: any) => b.time_slot_id === slotId && b.aluno_id === user?.id)?.id;
  };

  const isUserFixedBooked = (slotId: string) => {
    const slotFixedBookings = getSlotFixedBookings(slotId);
    return slotFixedBookings.some((fb: any) => fb.aluno_id === user?.id);
  };

  const getUserFixedBookingId = (slotId: string): string | undefined => {
    return getSlotFixedBookings(slotId).find((fb: any) => fb.aluno_id === user?.id)?.id;
  };

  // Check if user already has any booking (regular or fixed) on the selected date
  const hasBookingOnDate = () => {
    // Check regular bookings
    const hasRegularBooking = bookings.some((b: any) => b.aluno_id === user?.id);
    if (hasRegularBooking) return true;

    // Check if user has an active fixed booking for this day of week (not skipped)
    const dayOfWeek = selectedDate.getDay();
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const exceptionIds = fixedExceptions.map((e: any) => e.fixed_booking_id);
    
    const hasActiveFixedBooking = fixedBookings.some((fb: any) => {
      if (fb.aluno_id !== user?.id) return false;
      if (fb.time_slots?.day_of_week !== dayOfWeek) return false;
      if (exceptionIds.includes(fb.id)) return false;
      
      const startOk = !fb.start_date || fb.start_date <= dateStr;
      const endOk = !fb.end_date || fb.end_date >= dateStr;
      
      return startOk && endOk;
    });

    return hasActiveFixedBooking;
  };

  const userHasBookingToday = hasBookingOnDate();

  return (
    <PageLayout title="Aulas" description="Escolha um horário e agende sua aula">
      <div className="container mx-auto px-4 py-8">
        {/* Experimental plan message */}
        {!isProfessor && isExperimental && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="p-6 bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-200 dark:border-purple-800/50 rounded-2xl text-center">
              <Sparkles className="w-8 h-8 text-purple-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">Aula Experimental</h3>
              <p className="text-muted-foreground">
                Sua aula experimental será agendada pelo professor. Acompanhe o status no seu painel principal.
              </p>
            </div>
          </motion.div>
        )}

        {/* Credit Widget for students */}
        {!isProfessor && !isExperimental && credits && credits.credits_total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <CreditWidget variant="default" forDate={format(selectedDate, 'yyyy-MM-dd')} />
            {!hasCredits && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <p className="text-sm text-destructive">
                  Você usou todos os créditos desta semana. Cancele uma aula com 6h+ de antecedência para recuperar o crédito.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Date selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Selecione o dia
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
            {dates.map((date) => {
              const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "flex flex-col items-center min-w-[80px] p-4 rounded-2xl border-2 transition-all",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    {format(date, 'EEE', { locale: ptBR })}
                  </span>
                  <span className="text-2xl font-bold">{format(date, 'd')}</span>
                  {isToday && (
                    <span className="text-xs font-medium text-primary">Hoje</span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Time slots */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Horários disponíveis
          </h2>

          {slotsForDay.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-2xl">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum horário disponível neste dia.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {slotsForDay.map((slot: any) => {
                const slotBookings = getSlotBookings(slot.id);
                const slotFixedBookings = getSlotFixedBookings(slot.id);
                const totalBooked = slotBookings.length + slotFixedBookings.length;
                const availableSpots = slot.capacity - totalBooked;
                const locked = isSlotLocked(slot.start_time);
                const userBooked = isUserBooked(slot.id);
                const userFixedBooked = isUserFixedBooked(slot.id);
                const isFull = availableSpots <= 0;

                // Combine students for professor view
                const allStudents = [
                  ...slotFixedBookings.map((fb: any) => ({ 
                    name: fb.profiles?.name || 'Aluno', 
                    isFixed: true 
                  })),
                  ...slotBookings.map((b: any) => ({ 
                    name: b.profiles?.name || 'Aluno', 
                    isFixed: false 
                  })),
                ];

                return (
                  <motion.div
                    key={slot.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "relative p-6 rounded-2xl border-2 transition-all",
                      (userBooked || userFixedBooked) && "bg-success/10 border-success",
                      locked && !userBooked && !userFixedBooked && "slot-locked",
                      !locked && !userBooked && !userFixedBooked && !isFull && "slot-available",
                      isFull && !userBooked && !userFixedBooked && "bg-muted/50 border-muted"
                    )}
                  >
                    {locked && !userBooked && !userFixedBooked && (
                      <div className="absolute top-3 right-3">
                        <Lock className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    {(userBooked || userFixedBooked) && (
                      <div className="absolute top-3 right-3">
                        <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    )}

                    <div className="text-2xl font-bold mb-2">{slot.start_time}</div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-4">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">
                        {isFull ? 'Lotado' : `${availableSpots} vaga${availableSpots !== 1 ? 's' : ''}`}
                      </span>
                    </div>

                    {/* Professor view: show booked students */}
                    {isProfessor && allStudents.length > 0 && (
                      <div className="mb-4 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Alunos:</p>
                        {allStudents.map((student, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            {student.isFixed && (
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            )}
                            <span className={student.isFixed ? 'text-amber-700' : ''}>
                              {student.name}
                            </span>
                            {student.isFixed && (
                              <span className="text-xs text-muted-foreground">(fixo)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {userBooked && !isProfessor ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-success">Você está agendado!</p>
                        {locked ? (
                          <p className="text-xs text-muted-foreground">Cancelamento fechado (menos de 6h)</p>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive border-destructive/40 hover:bg-destructive/10"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Cancelar aula
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancelar aula?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Sua aula de {format(selectedDate, "d 'de' MMMM", { locale: ptBR })} às {slot.start_time} será cancelada e o crédito devolvido.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Manter aula</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    const bookingId = getUserBookingId(slot.id);
                                    if (bookingId) cancelBookingMutation.mutate(bookingId);
                                  }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Cancelar aula
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    ) : userFixedBooked && !isProfessor ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-success">Sua vaga fixa</p>
                        {locked ? (
                          <p className="text-xs text-muted-foreground">Liberação fechada (menos de 6h)</p>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-amber-700 border-amber-300 hover:bg-amber-50"
                              >
                                <CalendarX className="w-4 h-4 mr-1" />
                                Liberar vaga
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Liberar vaga fixa?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Você está liberando sua vaga fixa de {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}. O crédito será devolvido e outro aluno poderá agendar.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    const fbId = getUserFixedBookingId(slot.id);
                                    if (fbId) {
                                      releaseFixedMutation.mutate({
                                        fixedBookingId: fbId,
                                        date: format(selectedDate, 'yyyy-MM-dd'),
                                      });
                                    }
                                  }}
                                  className="bg-amber-600 text-white hover:bg-amber-700"
                                >
                                  Liberar vaga
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    ) : userBooked ? (
                      <p className="text-sm font-medium text-success">Você está agendado!</p>
                    ) : userFixedBooked ? (
                      <p className="text-sm font-medium text-success">Sua vaga fixa</p>
                    ) : isExperimental ? (
                      <p className="text-sm text-muted-foreground">Agendamento pelo professor</p>
                    ) : locked ? (
                      <p className="text-sm text-muted-foreground">
                        Agendamento fechado (menos de 6h)
                      </p>
                    ) : isFull ? (
                      <p className="text-sm text-muted-foreground">Sem vagas disponíveis</p>
                    ) : userHasBookingToday ? (
                      <p className="text-sm text-muted-foreground">Limite de 1 aula/dia atingido</p>
                    ) : !hasCredits ? (
                      <p className="text-sm text-muted-foreground">Sem créditos disponíveis</p>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => bookMutation.mutate({ slotId: slot.id, slotTime: slot.start_time })}
                        disabled={bookMutation.isPending}
                      >
                        Agendar
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </PageLayout>
  );
}

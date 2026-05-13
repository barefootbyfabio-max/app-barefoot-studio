import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ScheduleTrialDialogProps {
  studentId: string;
  studentName: string;
  trialId?: string;
}

export function ScheduleTrialDialog({ studentId, studentName, trialId }: ScheduleTrialDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');

  const { data: timeSlots = [] } = useQuery({
    queryKey: ['time-slots-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time');
      if (error) throw error;
      return data || [];
    },
  });

  // Filter slots for selected date's day of week
  const slotsForDay = selectedDate
    ? timeSlots.filter((s: any) => s.day_of_week === selectedDate.getDay())
    : [];

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !selectedSlotId) throw new Error('Selecione data e horário');

      const bookingDate = format(selectedDate, 'yyyy-MM-dd');

      if (trialId) {
        // Update existing trial class
        const { error } = await supabase
          .from('trial_classes')
          .update({
            booking_date: bookingDate,
            time_slot_id: selectedSlotId,
            status: 'scheduled',
            scheduled_by: user!.id,
          })
          .eq('id', trialId);
        if (error) throw error;
      } else {
        // Create new trial class
        const { error } = await supabase
          .from('trial_classes')
          .insert({
            student_id: studentId,
            booking_date: bookingDate,
            time_slot_id: selectedSlotId,
            status: 'scheduled',
            scheduled_by: user!.id,
          });
        if (error) throw error;
      }

      // Also create a regular booking so it shows in the schedule
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          aluno_id: studentId,
          time_slot_id: selectedSlotId,
          booking_date: bookingDate,
          status: 'confirmado',
        });
      if (bookingError) throw bookingError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      queryClient.invalidateQueries({ queryKey: ['trial-classes'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Aula experimental agendada!', {
        description: `Aula marcada para ${studentName}.`,
      });
      setOpen(false);
      setSelectedDate(undefined);
      setSelectedSlotId('');
    },
    onError: (error: any) => {
      toast.error('Erro ao agendar', {
        description: error.message || 'Não foi possível agendar a aula experimental.',
      });
    },
  });

  // Disable weekends in calendar
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-purple-600 border-purple-300 hover:bg-purple-50">
          <Calendar className="w-4 h-4" />
          Agendar Experimental
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar Aula Experimental</DialogTitle>
          <DialogDescription>
            Escolha a data e horário para a aula experimental de <strong>{studentName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Data</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate
                    ? format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })
                    : 'Selecione a data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedSlotId('');
                  }}
                  disabled={(date) => isWeekend(date) || date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time slot selector */}
          {selectedDate && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Horário</label>
              {slotsForDay.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum horário disponível neste dia.</p>
              ) : (
                <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha o horário..." />
                  </SelectTrigger>
                  <SelectContent>
                    {slotsForDay.map((slot: any) => (
                      <SelectItem key={slot.id} value={slot.id}>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <Button
            onClick={() => scheduleMutation.mutate()}
            disabled={!selectedDate || !selectedSlotId || scheduleMutation.isPending}
            className="w-full"
          >
            {scheduleMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Agendando...
              </>
            ) : (
              'Confirmar Agendamento'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

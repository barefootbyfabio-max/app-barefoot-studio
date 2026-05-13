import { useState } from 'react';
import { Star, Clock, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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

const DAYS_OF_WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface TimeSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  capacity: number;
}

export function FixedBookingRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');

  // Fetch all active time slots
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
      return data as TimeSlot[];
    },
  });

  // Fetch existing fixed bookings to check slot availability
  const { data: existingFixedBookings = [] } = useQuery({
    queryKey: ['all-fixed-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixed_bookings')
        .select('time_slot_id, aluno_id, approval_status')
        .eq('approval_status', 'approved');

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user's current fixed bookings (approved + pending)
  const { data: userFixedBookings = [] } = useQuery({
    queryKey: ['user-fixed-bookings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixed_bookings')
        .select('time_slot_id, approval_status, time_slots(day_of_week)')
        .eq('aluno_id', user!.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Group time slots by day
  const slotsByDay = timeSlots.reduce((acc, slot) => {
    const day = slot.day_of_week;
    if (!acc[day]) acc[day] = [];
    acc[day].push(slot);
    return acc;
  }, {} as Record<number, TimeSlot[]>);

  // Check if slot is full (approved bookings only)
  const isSlotFull = (slotId: string, capacity: number) => {
    const count = existingFixedBookings.filter(fb => fb.time_slot_id === slotId).length;
    return count >= capacity;
  };

  // Check if user already has a fixed booking for this day
  const userHasBookingForDay = (dayOfWeek: number) => {
    return userFixedBookings.some(
      (fb: any) => fb.time_slots?.day_of_week === dayOfWeek && fb.approval_status !== 'rejected'
    );
  };

  const requestMutation = useMutation({
    mutationFn: async (timeSlotId: string) => {
      const { error } = await supabase.from('fixed_bookings').insert({
        aluno_id: user!.id,
        time_slot_id: timeSlotId,
        approval_status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-fixed-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-fixed-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['pending-fixed-bookings'] });
      toast.success('Solicitação enviada!', {
        description: 'Aguarde a aprovação do professor.',
      });
      setOpen(false);
      setSelectedSlotId('');
    },
    onError: (error: any) => {
      console.error('Request error:', error);
      toast.error('Erro ao solicitar', {
        description: 'Não foi possível enviar a solicitação.',
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedSlotId) {
      toast.error('Selecione um horário');
      return;
    }
    requestMutation.mutate(selectedSlotId);
  };

  const getAvailableSlots = () => {
    return timeSlots.filter(slot => {
      const isFull = isSlotFull(slot.id, slot.capacity);
      const userHasDay = userHasBookingForDay(slot.day_of_week);
      return !isFull && !userHasDay;
    });
  };

  const availableSlots = getAvailableSlots();
  const hasAvailableSlots = availableSlots.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" className="gap-2">
          <Star className="w-4 h-4" />
          Solicitar Horário Fixo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Solicitar Horário Fixo
          </DialogTitle>
          <DialogDescription>
            Escolha um horário para sua vaga fixa semanal. A solicitação será enviada para aprovação.
          </DialogDescription>
        </DialogHeader>

        {!hasAvailableSlots ? (
          <div className="py-6 text-center text-muted-foreground">
            <p>Não há horários disponíveis no momento.</p>
            <p className="text-sm mt-2">Todos os horários estão lotados ou você já possui solicitação pendente.</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Selecione o horário desejado</label>
              <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um horário..." />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(day => {
                    const daySlots = availableSlots.filter(s => s.day_of_week === day);
                    if (daySlots.length === 0) return null;

                    return (
                      <div key={day}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                          {DAYS_OF_WEEK[day]}
                        </div>
                        {daySlots.map(slot => (
                          <SelectItem key={slot.id} value={slot.id}>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              {slot.start_time} - {slot.end_time}
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!selectedSlotId || requestMutation.isPending}
              className="w-full"
            >
              {requestMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar Solicitação
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

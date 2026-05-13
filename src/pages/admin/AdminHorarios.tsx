import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Clock, Users, ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

interface TimeSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  capacity: number;
  is_active: boolean;
  duration_minutes: number;
}

interface SlotFormData {
  day_of_week: number;
  start_time: string;
  end_time: string;
  capacity: number;
  is_active: boolean;
}

export default function AdminHorarios() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState<SlotFormData>({
    day_of_week: 1,
    start_time: '07:00',
    end_time: '08:00',
    capacity: 4,
    is_active: true,
  });

  const selectedDayOfWeek = selectedDate.getDay();
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: timeSlots = [], isLoading } = useQuery({
    queryKey: ['admin-time-slots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .order('day_of_week')
        .order('start_time');
      if (error) throw error;
      return data as TimeSlot[];
    },
  });

  // Fixed bookings (approved) for the selected day of week
  const { data: fixedBookings = [] } = useQuery({
    queryKey: ['admin-fixed-bookings', selectedDayOfWeek],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixed_bookings')
        .select('*, profiles:aluno_id (name, email), time_slots!inner(day_of_week)')
        .eq('approval_status', 'approved')
        .eq('time_slots.day_of_week', selectedDayOfWeek);
      if (error) throw error;
      return data || [];
    },
  });

  // Exceptions for fixed bookings on the selected date
  const { data: fixedExceptions = [] } = useQuery({
    queryKey: ['admin-fixed-exceptions', selectedDateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixed_booking_exceptions')
        .select('fixed_booking_id')
        .eq('exception_date', selectedDateStr);
      if (error) throw error;
      return data || [];
    },
  });

  // Regular bookings for the selected date
  const { data: dateBookings = [] } = useQuery({
    queryKey: ['admin-date-bookings', selectedDateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, profiles:aluno_id (name, email)')
        .eq('booking_date', selectedDateStr)
        .eq('status', 'confirmado');
      if (error) throw error;
      return data || [];
    },
  });

  const exceptionIds = useMemo(
    () => new Set(fixedExceptions.map((e: any) => e.fixed_booking_id)),
    [fixedExceptions]
  );

  // Combined occupancy for a slot
  const getSlotOccupancy = (slotId: string, capacity: number) => {
    // Active fixed bookings (minus exceptions, check date range)
    const activeFixed = fixedBookings.filter((fb: any) => {
      if (fb.time_slot_id !== slotId) return false;
      if (exceptionIds.has(fb.id)) return false;
      if (fb.start_date && fb.start_date > selectedDateStr) return false;
      if (fb.end_date && fb.end_date < selectedDateStr) return false;
      return true;
    });

    // Regular bookings for this slot on this date
    const slotBookings = dateBookings.filter((b: any) => b.time_slot_id === slotId);

    // Deduplicate by aluno_id (fixed student who also has a regular booking)
    const fixedStudentIds = new Set(activeFixed.map((fb: any) => fb.aluno_id));
    const uniqueRegular = slotBookings.filter((b: any) => !fixedStudentIds.has(b.aluno_id));

    const totalOccupied = activeFixed.length + uniqueRegular.length;
    const availableSpots = capacity - totalOccupied;

    const fixedStudents = activeFixed.map((fb: any) => ({
      name: fb.profiles?.name || fb.profiles?.email || 'Aluno',
      type: 'fixo' as const,
    }));
    const regularStudents = uniqueRegular.map((b: any) => ({
      name: b.profiles?.name || b.profiles?.email || 'Aluno',
      type: 'avulso' as const,
    }));

    return {
      totalOccupied,
      availableSpots,
      isFull: availableSpots <= 0,
      fixedCount: activeFixed.length,
      regularCount: uniqueRegular.length,
      students: [...fixedStudents, ...regularStudents],
    };
  };

  // Slots for the selected day
  const daySlots = useMemo(
    () => timeSlots.filter((s) => s.day_of_week === selectedDayOfWeek),
    [timeSlots, selectedDayOfWeek]
  );

  const createMutation = useMutation({
    mutationFn: async (data: SlotFormData) => {
      const { error } = await supabase.from('time_slots').insert({ ...data, duration_minutes: 60 });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-slots'] });
      toast.success('Horário criado com sucesso!');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('Erro ao criar horário'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SlotFormData> }) => {
      const { error } = await supabase.from('time_slots').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-slots'] });
      toast.success('Horário atualizado!');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('Erro ao atualizar horário'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('time_slots').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-slots'] });
      toast.success('Horário removido!');
    },
    onError: () => toast.error('Erro ao remover horário'),
  });

  const resetForm = () => {
    setEditingSlot(null);
    setFormData({ day_of_week: 1, start_time: '07:00', end_time: '08:00', capacity: 4, is_active: true });
  };

  const handleEdit = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setFormData({
      day_of_week: slot.day_of_week,
      start_time: slot.start_time.slice(0, 5),
      end_time: slot.end_time.slice(0, 5),
      capacity: slot.capacity,
      is_active: slot.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSlot) {
      updateMutation.mutate({ id: editingSlot.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const dayLabel = DAYS_OF_WEEK[selectedDayOfWeek]?.label || '';

  return (
    <AdminLayout title="Gerenciar Horários" description="Configure os horários de aula disponíveis">
      <div className="space-y-6">
        {/* Date navigator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-[200px] justify-center">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {dayLabel}, {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
            <Button variant="outline" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())} className="ml-2">
              Hoje
            </Button>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Horário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSlot ? 'Editar Horário' : 'Novo Horário'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Dia da Semana</Label>
                  <Select value={formData.day_of_week.toString()} onValueChange={(v) => setFormData({ ...formData, day_of_week: parseInt(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>{day.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início</Label>
                    <Input type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Término</Label>
                    <Input type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Capacidade (vagas)</Label>
                  <Input type="number" min={1} max={20} value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 4 })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Ativo</Label>
                  <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingSlot ? 'Salvar Alterações' : 'Criar Horário'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : daySlots.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum horário cadastrado para {dayLabel}.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{dayLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {daySlots.map((slot) => {
                  const occ = getSlotOccupancy(slot.id, slot.capacity);
                  return (
                    <div
                      key={slot.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        !slot.is_active
                          ? 'bg-muted/50 opacity-60'
                          : occ.isFull
                            ? 'bg-destructive/10 border-destructive/30'
                            : 'bg-card'
                      }`}
                    >
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                          {occ.isFull && <Badge variant="destructive" className="text-xs">Lotado</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className={occ.isFull ? 'text-destructive' : ''}>
                            {occ.availableSpots} de {slot.capacity} vaga{slot.capacity !== 1 ? 's' : ''} disponíve{occ.availableSpots !== 1 ? 'is' : 'l'}
                          </span>
                          {occ.students.length > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="flex items-center gap-1 text-amber-600 cursor-help">
                                    <Users className="h-3 w-3" />
                                    {occ.totalOccupied} aluno{occ.totalOccupied !== 1 ? 's' : ''}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-medium mb-1">Alunos neste horário:</p>
                                  {occ.students.map((s, idx) => (
                                    <p key={idx} className="text-sm">
                                      {s.name}
                                      <span className="ml-1 text-xs text-muted-foreground">
                                        ({s.type === 'fixo' ? 'fixo' : 'avulso'})
                                      </span>
                                    </p>
                                  ))}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!slot.is_active && <Badge variant="secondary">Inativo</Badge>}
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(slot)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm('Remover este horário?')) deleteMutation.mutate(slot.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

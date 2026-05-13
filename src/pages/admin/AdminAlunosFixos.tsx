import { useState } from 'react';
import { Plus, Trash2, Users, Calendar, AlertCircle } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
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

interface FixedBooking {
  id: string;
  aluno_id: string;
  time_slot_id: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  approval_status: string;
  profiles: { name: string | null; email: string } | null;
}

interface Profile {
  id: string;
  name: string | null;
  email: string;
}

interface TimeSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export default function AdminAlunosFixos() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAluno, setSelectedAluno] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: fixedBookings = [], isLoading } = useQuery({
    queryKey: ['admin-fixed-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixed_bookings')
        .select('*, profiles:aluno_id(name, email)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as FixedBooking[];
    },
  });

  const { data: alunos = [] } = useQuery({
    queryKey: ['admin-alunos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'aluno')
        .order('name');
      
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: timeSlots = [] } = useQuery({
    queryKey: ['admin-time-slots-for-fixed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_slots')
        .select('id, day_of_week, start_time, end_time')
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time');
      
      if (error) throw error;
      return data as TimeSlot[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('fixed_bookings').insert({
        aluno_id: selectedAluno,
        time_slot_id: selectedSlot,
        start_date: startDate || null,
        end_date: endDate || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fixed-bookings'] });
      toast.success('Aluno fixo adicionado!');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error('Erro ao adicionar aluno fixo');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fixed_bookings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fixed-bookings'] });
      toast.success('Aluno fixo removido!');
    },
    onError: () => {
      toast.error('Erro ao remover aluno fixo');
    },
  });

  const resetForm = () => {
    setSelectedAluno('');
    setSelectedSlot('');
    setStartDate('');
    setEndDate('');
  };

  const getAlunoName = (booking: FixedBooking) => {
    if (booking.profiles) {
      return booking.profiles.name || booking.profiles.email;
    }
    const aluno = alunos.find((a) => a.id === booking.aluno_id);
    return aluno?.name || aluno?.email || 'Aluno não encontrado';
  };

  const getSlotInfo = (slotId: string) => {
    const slot = timeSlots.find((s) => s.id === slotId);
    if (!slot) return 'Horário não encontrado';
    const day = DAYS_OF_WEEK.find((d) => d.value === slot.day_of_week)?.label || '';
    return `${day} ${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`;
  };

  const groupedSlots = DAYS_OF_WEEK.map((day) => ({
    ...day,
    slots: timeSlots.filter((s) => s.day_of_week === day.value),
  })).filter((day) => day.slots.length > 0);

  return (
    <AdminLayout title="Alunos Fixos" description="Gerencie os alunos com horários fixos">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">
            {fixedBookings.length} aluno{fixedBookings.length !== 1 ? 's' : ''} fixo{fixedBookings.length !== 1 ? 's' : ''}
          </p>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            {alunos.length === 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button disabled>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Aluno Fixo
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Nenhum aluno cadastrado no sistema</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Aluno Fixo
                </Button>
              </DialogTrigger>
            )}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Aluno Fixo</DialogTitle>
                <DialogDescription>
                  Selecione um aluno e um horário para criar uma reserva fixa semanal.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {alunos.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum aluno cadastrado no sistema. Novos alunos podem se cadastrar na página de signup.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    <Label>Aluno</Label>
                    <Select value={selectedAluno} onValueChange={setSelectedAluno}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um aluno" />
                      </SelectTrigger>
                      <SelectContent>
                        {alunos.map((aluno) => (
                          <SelectItem key={aluno.id} value={aluno.id}>
                            {aluno.name || aluno.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um horário" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupedSlots.map((day) => (
                        <div key={day.value}>
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                            {day.label}
                          </div>
                          {day.slots.map((slot) => (
                            <SelectItem key={slot.id} value={slot.id}>
                              {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data Início (opcional)</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim (opcional)</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {alunos.length > 0 && (
                  <Button
                    className="w-full"
                    disabled={!selectedAluno || !selectedSlot || createMutation.isPending}
                    onClick={() => createMutation.mutate()}
                  >
                    Adicionar
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Users className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : fixedBookings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum aluno fixo cadastrado.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {fixedBookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">
                      {getAlunoName(booking)}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Remover este aluno fixo?')) {
                          deleteMutation.mutate(booking.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{getSlotInfo(booking.time_slot_id)}</span>
                  </div>
                  {(booking.start_date || booking.end_date) && (
                    <div className="text-xs text-muted-foreground">
                      {booking.start_date && (
                        <span>De: {format(new Date(booking.start_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      )}
                      {booking.start_date && booking.end_date && ' • '}
                      {booking.end_date && (
                        <span>Até: {format(new Date(booking.end_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

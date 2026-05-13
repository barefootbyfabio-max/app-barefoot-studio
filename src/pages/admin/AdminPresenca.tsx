import { useState, useMemo } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Check, X, Calendar } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────
interface AttendanceRecord {
  id: string;
  student_id: string;
  time_slot_id: string;
  attendance_date: string;
  status: string;
  marked_by: string | null;
}

interface ExpectedStudent {
  studentId: string;
  studentName: string;
  slotId: string;
  slotTime: string;
  source: 'booking' | 'fixed';
}

// Período disponível para o filtro de frequência
type FrequencyPeriod = '30' | '60' | '90' | '180';

// ─── Component ────────────────────────────────────────────────
export default function AdminPresenca() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  // FIX: período de frequência com estado controlável (padrão 30 dias)
  const [frequencyPeriod, setFrequencyPeriod] = useState<FrequencyPeriod>('30');

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayOfWeek = selectedDate.getDay();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  // ── Horários do dia ───────────────────────────────────────
  const { data: timeSlots = [] } = useQuery({
    queryKey: ['time-slots-day', dayOfWeek],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .order('start_time');
      if (error) throw error;
      return data;
    },
  });

  // ── Agendamentos avulsos do dia ───────────────────────────
  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings-date', dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, profiles:aluno_id(name, email)')
        .eq('booking_date', dateStr)
        .eq('status', 'confirmado');
      if (error) throw error;
      return data as any[];
    },
  });

  // FIX: Fixed bookings filtrados pelos IDs dos slots do dia no servidor
  // (antes trazia TODOS os fixed bookings e filtrava no cliente)
  const slotIds = timeSlots.map((s: any) => s.id);

  const { data: fixedBookings = [] } = useQuery({
    queryKey: ['fixed-bookings-day', slotIds.join(',')],
    enabled: timeSlots.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixed_bookings')
        .select('*, profiles:aluno_id(name, email)')
        .eq('approval_status', 'approved')
        .in('time_slot_id', slotIds);
      if (error) throw error;
      return data as any[];
    },
  });

  // ── Exceções de fixed bookings para o dia ─────────────────
  const { data: exceptions = [] } = useQuery({
    queryKey: ['fixed-exceptions', dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixed_booking_exceptions')
        .select('*')
        .eq('exception_date', dateStr);
      if (error) throw error;
      return data;
    },
  });

  // ── Aulas experimentais do dia ────────────────────────────
  const { data: trialClasses = [] } = useQuery({
    queryKey: ['trial-classes-date', dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trial_classes')
        .select('*, profiles:student_id(name, email)')
        .eq('booking_date', dateStr)
        .in('status', ['scheduled', 'pending']);
      if (error) throw error;
      return data as any[];
    },
  });

  // ── Presença registrada no dia ────────────────────────────
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendance', dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('attendance_date', dateStr);
      if (error) throw error;
      return data as AttendanceRecord[];
    },
  });

  // FIX: allAttendance filtrado pelo período selecionado
  // (antes carregava TODO o histórico sem filtro de data)
  const periodStartDate = format(
    subDays(new Date(), parseInt(frequencyPeriod)),
    'yyyy-MM-dd'
  );

  const { data: allAttendance = [] } = useQuery({
    queryKey: ['all-attendance', frequencyPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .in('status', ['present', 'absent'])
        .gte('attendance_date', periodStartDate);
      if (error) throw error;
      return data as AttendanceRecord[];
    },
  });

  // ── Perfis dos alunos (para aba de frequência) ────────────
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['all-profiles-attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'aluno')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  // ── Montar alunos esperados por slot ──────────────────────
  const expectedBySlot = useMemo(() => {
    const map: Record<string, ExpectedStudent[]> = {};
    const exceptionFixedIds = new Set(exceptions.map((e: any) => e.fixed_booking_id));

    for (const slot of timeSlots) {
      const students: ExpectedStudent[] = [];

      // Agendamentos avulsos
      for (const b of bookings) {
        if (b.time_slot_id === slot.id) {
          students.push({
            studentId: b.aluno_id,
            studentName: b.profiles?.name || b.profiles?.email || 'Aluno',
            slotId: slot.id,
            slotTime: `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`,
            source: 'booking',
          });
        }
      }

      // Agendamentos fixos
      // FIX: removida condição morta `slot.day_of_week !== dayOfWeek`
      // Os slots já vêm filtrados por dayOfWeek da query, então essa condição
      // nunca seria verdadeira e só gerava confusão.
      for (const fb of fixedBookings) {
        if (fb.time_slot_id !== slot.id) continue;
        if (exceptionFixedIds.has(fb.id)) continue;
        if (fb.start_date && dateStr < fb.start_date) continue;
        if (fb.end_date && dateStr > fb.end_date) continue;
        if (students.some((s) => s.studentId === fb.aluno_id)) continue;

        students.push({
          studentId: fb.aluno_id,
          studentName: fb.profiles?.name || fb.profiles?.email || 'Aluno',
          slotId: slot.id,
          slotTime: `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`,
          source: 'fixed',
        });
      }

      // Aulas experimentais
      for (const tc of trialClasses) {
        if (tc.time_slot_id === slot.id) {
          if (students.some((s) => s.studentId === tc.student_id)) continue;
          students.push({
            studentId: tc.student_id,
            studentName: tc.profiles?.name || tc.profiles?.email || 'Aluno',
            slotId: slot.id,
            slotTime: `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`,
            source: 'booking',
          });
        }
      }

      map[slot.id] = students;
    }
    return map;
  }, [timeSlots, bookings, fixedBookings, exceptions, trialClasses, dateStr]);

  // ── Mutation: marcar presença ─────────────────────────────
  const markAttendance = useMutation({
    mutationFn: async ({
      studentId,
      slotId,
      status,
    }: {
      studentId: string;
      slotId: string;
      status: string;
    }) => {
      const { error } = await supabase.from('attendance').upsert(
        {
          student_id: studentId,
          time_slot_id: slotId,
          attendance_date: dateStr,
          status,
          marked_by: user?.id,
        },
        { onConflict: 'student_id,time_slot_id,attendance_date' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', dateStr] });
      queryClient.invalidateQueries({ queryKey: ['all-attendance', frequencyPeriod] });
    },
    onError: () => {
      toast({ title: 'Erro ao marcar presença', variant: 'destructive' });
    },
  });

  const getStatus = (studentId: string, slotId: string) => {
    const record = attendanceRecords.find(
      (r) => r.student_id === studentId && r.time_slot_id === slotId
    );
    return record?.status || 'pending';
  };

  // ── Estatísticas de frequência ────────────────────────────
  const frequencyStats = useMemo(() => {
    const map: Record<string, { present: number; absent: number }> = {};
    for (const r of allAttendance) {
      if (!map[r.student_id]) map[r.student_id] = { present: 0, absent: 0 };
      if (r.status === 'present') map[r.student_id].present++;
      if (r.status === 'absent') map[r.student_id].absent++;
    }
    return allProfiles
      .map((p) => {
        const stats = map[p.id] || { present: 0, absent: 0 };
        const total = stats.present + stats.absent;
        return {
          id: p.id,
          name: p.name || p.email,
          present: stats.present,
          absent: stats.absent,
          total,
          percentage: total > 0 ? Math.round((stats.present / total) * 100) : null,
        };
      })
      .filter((s) => s.total > 0)
      .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0));
  }, [allAttendance, allProfiles]);

  // ─────────────────────────────────────────────────────────
  return (
    <AdminLayout title="Presença" description="Controle de presença dos alunos">
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Chamada do Dia</TabsTrigger>
          <TabsTrigger value="frequency">Frequência</TabsTrigger>
        </TabsList>

        {/* ── Chamada diária ────────────────────────────── */}
        <TabsContent value="daily" className="space-y-4">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedDate((d) => subDays(d, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-[220px] justify-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {timeSlots.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum horário neste dia.
              </CardContent>
            </Card>
          ) : (
            timeSlots.map((slot: any) => {
              const students = expectedBySlot[slot.id] || [];
              return (
                <Card key={slot.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {students.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum aluno esperado.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {students.map((s) => {
                          const status = getStatus(s.studentId, s.slotId);
                          // FIX: botões desabilitados enquanto a mutação está em andamento
                          const isLoading = markAttendance.isPending;
                          return (
                            <div
                              key={s.studentId}
                              className="flex items-center justify-between py-2 px-3 rounded-lg border"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {s.studentName}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {s.source === 'fixed' ? 'Fixo' : 'Avulso'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                {status === 'present' && (
                                  <Badge className="bg-green-500/15 text-green-700 border-green-200">
                                    Presente
                                  </Badge>
                                )}
                                {status === 'absent' && (
                                  <Badge className="bg-red-500/15 text-red-700 border-red-200">
                                    Faltou
                                  </Badge>
                                )}
                                {status === 'pending' && (
                                  <Badge variant="secondary">Pendente</Badge>
                                )}
                                <Button
                                  size="sm"
                                  variant={status === 'present' ? 'default' : 'outline'}
                                  className="h-8 w-8 p-0"
                                  disabled={isLoading}
                                  onClick={() =>
                                    markAttendance.mutate({
                                      studentId: s.studentId,
                                      slotId: s.slotId,
                                      status: 'present',
                                    })
                                  }
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={
                                    status === 'absent' ? 'destructive' : 'outline'
                                  }
                                  className="h-8 w-8 p-0"
                                  disabled={isLoading}
                                  onClick={() =>
                                    markAttendance.mutate({
                                      studentId: s.studentId,
                                      slotId: s.slotId,
                                      status: 'absent',
                                    })
                                  }
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ── Frequência ────────────────────────────────── */}
        <TabsContent value="frequency" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Frequência dos Alunos</CardTitle>
              {/* FIX: seletor de período — evita carregar todo o histórico de uma vez */}
              <Select
                value={frequencyPeriod}
                onValueChange={(v) => setFrequencyPeriod(v as FrequencyPeriod)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="60">Últimos 60 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="180">Últimos 6 meses</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {frequencyStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum registro de presença no período selecionado.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead className="text-center">Presenças</TableHead>
                      <TableHead className="text-center">Faltas</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Frequência</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {frequencyStats.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-center">{s.present}</TableCell>
                        <TableCell className="text-center">{s.absent}</TableCell>
                        <TableCell className="text-center">{s.total}</TableCell>
                        <TableCell className="text-center">
                          {s.percentage !== null ? (
                            <Badge
                              className={
                                s.percentage >= 75
                                  ? 'bg-green-500/15 text-green-700 border-green-200'
                                  : s.percentage >= 50
                                  ? 'bg-yellow-500/15 text-yellow-700 border-yellow-200'
                                  : 'bg-red-500/15 text-red-700 border-red-200'
                              }
                            >
                              {s.percentage}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

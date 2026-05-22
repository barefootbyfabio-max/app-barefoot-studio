import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Users, Phone, MapPin, Mail, CreditCard, Calendar, Clock, ChevronDown, ChevronUp, Star, Trash2, Sparkles, UserX, RotateCcw, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScheduleTrialDialog } from '@/components/ScheduleTrialDialog';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Student {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  cpf: string | null;
  created_at: string;
  is_active: boolean;
}

interface Booking {
  id: string;
  booking_date: string;
  status: string;
  time_slots: {
    start_time: string;
    end_time: string;
    day_of_week: number;
  } | null;
}

interface FixedBooking {
  id: string;
  start_date: string | null;
  end_date: string | null;
  time_slots: {
    start_time: string;
    end_time: string;
    day_of_week: number;
  } | null;
}

const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function AdminAlunos() {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | '2x' | '3x'>('all');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [studentToReactivate, setStudentToReactivate] = useState<Student | null>(null);
  const queryClient = useQueryClient();

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['admin-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, phone, city, cpf, created_at, is_active')
        .eq('role', 'aluno')
        .eq('approval_status', 'approved')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Student[];
    },
  });

  const { data: trialClasses = [] } = useQuery({
    queryKey: ['trial-classes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('trial_classes').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: studentPlans = [] } = useQuery({
    queryKey: ['student-plans-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_plans')
        .select('student_id, plan_type, weekly_credits, is_active');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: studentBookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['student-bookings', expandedStudent],
    queryFn: async () => {
      if (!expandedStudent) return [];
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('bookings')
        .select(`id, booking_date, status, time_slots:time_slot_id (start_time, end_time, day_of_week)`)
        .eq('aluno_id', expandedStudent)
        .gte('booking_date', today)
        .order('booking_date', { ascending: true });
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!expandedStudent,
  });

  const { data: studentFixedBookings = [] } = useQuery({
    queryKey: ['student-fixed-bookings', expandedStudent],
    queryFn: async () => {
      if (!expandedStudent) return [];
      const { data, error } = await supabase
        .from('fixed_bookings')
        .select(`id, start_date, end_date, time_slots:time_slot_id (start_time, end_time, day_of_week)`)
        .eq('aluno_id', expandedStudent);
      if (error) throw error;
      return data as FixedBooking[];
    },
    enabled: !!expandedStudent,
  });

  const completeTrialMutation = useMutation({
    mutationFn: async (trialId: string) => {
      const { error } = await supabase
        .from('trial_classes')
        .update({ status: 'completed' })
        .eq('id', trialId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-classes'] });
      toast.success('Aula experimental marcada como concluída', {
        description: 'O aluno verá a opção de escolher um plano.',
      });
    },
    onError: () => {
      toast.error('Erro ao marcar como concluída');
    },
  });

  // Deactivate mutation
  const deactivateMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { studentId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      queryClient.invalidateQueries({ queryKey: ['student-plans-all'] });
      toast.success('Aluno desativado com sucesso');
      setStudentToDelete(null);
      setExpandedStudent(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao desativar aluno');
    },
  });

  // Reactivate mutation
  const reactivateMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { studentId, reactivate: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      toast.success('Aluno reativado com sucesso');
      setStudentToReactivate(null);
      setExpandedStudent(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao reativar aluno');
    },
  });

  const filterBySearch = (list: Student[]) =>
    list.filter((s) => {
      const q = search.toLowerCase();
      return (
        s.name?.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.cpf?.includes(search) ||
        s.city?.toLowerCase().includes(q)
      );
    });

  // Split students into tabs
  const activeStudents = students.filter((s) => s.is_active);
  const inactiveStudents = students.filter((s) => !s.is_active);

  const experimentalStudentIds = new Set(
    studentPlans
      .filter((p: any) => p.plan_type === 'experimental' && p.is_active)
      .map((p: any) => p.student_id)
  );
  const experimentalStudents = activeStudents.filter((s) => experimentalStudentIds.has(s.id));
  const regularActiveStudents = activeStudents.filter((s) => !experimentalStudentIds.has(s.id));
  const filteredRegularStudents = planFilter === 'all'
    ? regularActiveStudents
    : regularActiveStudents.filter((s) => {
        const plan = studentPlans.find((p: any) => p.student_id === s.id && p.is_active);
        return plan?.plan_type === planFilter;
      });

  const toggleExpanded = (studentId: string) => {
    setExpandedStudent(expandedStudent === studentId ? null : studentId);
  };

  const activeFixedBookings = studentFixedBookings.filter((fb) => {
    if (!fb.end_date) return true;
    return isAfter(new Date(fb.end_date), new Date());
  });

  const renderStudentTable = (studentList: Student[], showReactivate = false) => {
    const filtered = filterBySearch(studentList);
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Plano</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden sm:table-cell">Telefone</TableHead>
              <TableHead className="hidden sm:table-cell">CPF</TableHead>
              <TableHead className="hidden lg:table-cell">Cidade</TableHead>
              <TableHead className="hidden lg:table-cell">Cadastro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Carregando alunos...
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="text-muted-foreground">
                    {search ? 'Nenhum aluno encontrado para esta busca.' : 'Nenhum aluno nesta categoria.'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((student) => (
                <Collapsible
                  key={student.id}
                  open={expandedStudent === student.id}
                  onOpenChange={() => toggleExpanded(student.id)}
                  asChild
                >
                  <>
                    <TableRow className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            {expandedStudent === student.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell onClick={() => toggleExpanded(student.id)}>
                        <div className="font-medium flex items-center gap-2">
                          {student.name || '-'}
                          {!student.is_active && (
                            <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 text-xs">
                              Inativo
                            </Badge>
                          )}
                        </div>
                        <div className="sm:hidden space-y-1 mt-1">
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {student.email}
                          </div>
                          {student.phone && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {student.phone}
                            </div>
                          )}
                          {student.cpf && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              {student.cpf}
                            </div>
                          )}
                        </div>
                       </TableCell>
                      <TableCell className="hidden sm:table-cell" onClick={() => toggleExpanded(student.id)}>
                        {(() => {
                          const plan = studentPlans.find((p: any) => p.student_id === student.id && p.is_active);
                          if (plan?.plan_type === 'experimental') {
                            return (
                              <Badge variant="outline" className="text-purple-600 border-purple-300 bg-purple-50 text-xs">
                                Experimental
                              </Badge>
                            );
                          }
                          if (plan?.plan_type === '2x' || plan?.plan_type === '3x') {
                            return (
                              <Badge variant="outline" className="text-xs">
                                {plan.plan_type}
                              </Badge>
                            );
                          }
                          return <span className="text-muted-foreground">-</span>;
                        })()}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell" onClick={() => toggleExpanded(student.id)}>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {student.email}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell" onClick={() => toggleExpanded(student.id)}>
                        {student.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {student.phone}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell" onClick={() => toggleExpanded(student.id)}>
                        {student.cpf ? (
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            {student.cpf}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell" onClick={() => toggleExpanded(student.id)}>
                        {student.city ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {student.city}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell" onClick={() => toggleExpanded(student.id)}>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(student.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={7} className="p-4">
                          <div className="space-y-4">
                            {/* Fixed Bookings */}
                            <div>
                              <h4 className="font-medium flex items-center gap-2 mb-2">
                                <Star className="h-4 w-4 text-amber-500" />
                                Horários Fixos
                              </h4>
                              {loadingBookings ? (
                                <p className="text-sm text-muted-foreground">Carregando...</p>
                              ) : activeFixedBookings.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Nenhum horário fixo.</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {activeFixedBookings.map((fb) => (
                                    <Badge key={fb.id} variant="outline" className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {fb.time_slots && (
                                        <>
                                          {dayNames[fb.time_slots.day_of_week]} - {fb.time_slots.start_time.slice(0, 5)}
                                        </>
                                      )}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Upcoming Bookings */}
                            <div>
                              <h4 className="font-medium flex items-center gap-2 mb-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                Próximos Agendamentos
                              </h4>
                              {loadingBookings ? (
                                <p className="text-sm text-muted-foreground">Carregando...</p>
                              ) : studentBookings.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Nenhum agendamento futuro.</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {studentBookings.map((booking) => (
                                    <Badge key={booking.id} className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {format(new Date(booking.booking_date + 'T12:00:00'), "dd/MM", { locale: ptBR })}
                                      {booking.time_slots && (
                                        <span className="ml-1">
                                          às {booking.time_slots.start_time.slice(0, 5)}
                                        </span>
                                      )}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Trial Class Section */}
                            {(() => {
                              const plan = studentPlans.find((p: any) => p.student_id === student.id);
                              const trial = trialClasses.find((t: any) => t.student_id === student.id);
                              if (plan?.plan_type === 'experimental') {
                                return (
                                  <div>
                                    <h4 className="font-medium flex items-center gap-2 mb-2">
                                      <Sparkles className="h-4 w-4 text-purple-500" />
                                      Aula Experimental
                                    </h4>
                                    {trial?.status === 'scheduled' ? (
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className="text-green-600 border-green-300">
                                          Agendada para {trial.booking_date}
                                        </Badge>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                          onClick={() => completeTrialMutation.mutate(trial.id)}
                                          disabled={completeTrialMutation.isPending}
                                        >
                                          Marcar como concluída
                                        </Button>
                                      </div>
                                    ) : trial?.status === 'completed' ? (
                                      <Badge variant="outline" className="text-blue-600 border-blue-300">
                                        Concluída - aguardando escolha de plano
                                      </Badge>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                                          Pendente
                                        </Badge>
                                        <ScheduleTrialDialog
                                          studentId={student.id}
                                          studentName={student.name || student.email}
                                          trialId={trial?.id}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* Action Buttons */}
                            <div className="pt-2 border-t flex gap-2">
                              {showReactivate ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setStudentToReactivate(student)}
                                  disabled={reactivateMutation.isPending}
                                  className="flex items-center gap-2"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  Reativar aluno
                                </Button>
                              ) : (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setStudentToDelete(student)}
                                  disabled={deactivateMutation.isPending}
                                  className="flex items-center gap-2"
                                >
                                  <UserX className="h-4 w-4" />
                                  Desativar aluno
                                </Button>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <AdminLayout
      title="Alunos Cadastrados"
      description="Visualize e gerencie todos os alunos do estúdio"
    >
      <div className="space-y-6">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, CPF ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="ativos" className="w-full">
          <TabsList>
            <TabsTrigger value="ativos" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Ativos
              <Badge variant="secondary" className="ml-1 text-xs">{regularActiveStudents.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="experimentais" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Experimentais
              <Badge variant="secondary" className="ml-1 text-xs">{experimentalStudents.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="inativos" className="flex items-center gap-2">
              <UserX className="h-4 w-4" />
              Inativos
              <Badge variant="secondary" className="ml-1 text-xs">{inactiveStudents.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ativos">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={planFilter} onValueChange={(v) => setPlanFilter(v as 'all' | '2x' | '3x')}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="2x">Plano 2x</SelectItem>
                    <SelectItem value="3x">Plano 3x</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {renderStudentTable(filteredRegularStudents)}
          </TabsContent>

          <TabsContent value="experimentais">
            {renderStudentTable(experimentalStudents)}
          </TabsContent>

          <TabsContent value="inativos">
            {renderStudentTable(inactiveStudents, true)}
          </TabsContent>
        </Tabs>

        {/* Deactivate Confirmation Dialog */}
        <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desativar aluno?</AlertDialogTitle>
              <AlertDialogDescription>
                Ao desativar <strong>{studentToDelete?.name || studentToDelete?.email}</strong>, o aluno não poderá mais fazer login.
                Seus agendamentos futuros serão cancelados e os horários fixos encerrados. Os dados serão mantidos no sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deactivateMutation.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => studentToDelete && deactivateMutation.mutate(studentToDelete.id)}
                disabled={deactivateMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deactivateMutation.isPending ? 'Desativando...' : 'Desativar aluno'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reactivate Confirmation Dialog */}
        <AlertDialog open={!!studentToReactivate} onOpenChange={(open) => !open && setStudentToReactivate(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reativar aluno?</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{studentToReactivate?.name || studentToReactivate?.email}</strong> poderá fazer login novamente.
                O plano anterior não será restaurado automaticamente — será necessário configurar um novo plano.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={reactivateMutation.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => studentToReactivate && reactivateMutation.mutate(studentToReactivate.id)}
                disabled={reactivateMutation.isPending}
              >
                {reactivateMutation.isPending ? 'Reativando...' : 'Reativar aluno'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}

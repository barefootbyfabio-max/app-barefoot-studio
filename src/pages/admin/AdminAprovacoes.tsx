import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, UserPlus, CalendarCheck, Loader2 } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PendingProfile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  cpf: string | null;
  created_at: string;
  student_plans?: {
    plan_type: '2x' | '3x' | 'experimental';
    weekly_credits: number;
  }[];
}

interface PendingFixedBooking {
  id: string;
  aluno_id: string;
  time_slot_id: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  profiles: {
    name: string | null;
    email: string;
  };
  time_slots: {
    day_of_week: number;
    start_time: string;
    end_time: string;
  };
}

const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function AdminAprovacoes() {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch pending profiles with their plans
  const { data: pendingProfiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ['pending-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, name, email, phone, city, cpf, created_at,
          student_plans(plan_type, weekly_credits)
        `)
        .eq('approval_status', 'pending')
        .eq('role', 'aluno')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as PendingProfile[];
    },
  });

  // Fetch pending fixed bookings
  const { data: pendingFixedBookings, isLoading: loadingFixed } = useQuery({
    queryKey: ['pending-fixed-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixed_bookings')
        .select(`
          id,
          aluno_id,
          time_slot_id,
          start_date,
          end_date,
          created_at,
          profiles!fixed_bookings_aluno_id_fkey(name, email),
          time_slots!fixed_bookings_time_slot_id_fkey(day_of_week, start_time, end_time)
        `)
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as PendingFixedBooking[];
    },
  });

  // Approve/Reject profile mutation
  const profileMutation = useMutation({
    mutationFn: async ({ id, status, email, name, planType }: { id: string; status: 'approved' | 'rejected'; email?: string; name?: string; planType?: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ approval_status: status })
        .eq('id', id);
      
      if (error) throw error;

      // If approved and experimental, create trial_classes entry
      if (status === 'approved' && planType === 'experimental') {
        await supabase.from('trial_classes').insert({
          student_id: id,
          status: 'pending',
        });
      }
      
      // Send notification email if approved
      if (status === 'approved' && email) {
        supabase.functions.invoke('send-notification', {
          body: {
            type: 'approval',
            recipientEmail: email,
            recipientName: name || '',
          }
        }).catch(err => console.error('Error sending notification:', err));
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-profiles'] });
      toast.success(
        variables.status === 'approved' 
          ? 'Cadastro aprovado com sucesso!' 
          : 'Cadastro rejeitado.'
      );
      setProcessingId(null);
    },
    onError: () => {
      toast.error('Erro ao processar solicitação');
      setProcessingId(null);
    },
  });

  // Approve/Reject fixed booking mutation
  const fixedBookingMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      email, 
      name, 
      dayOfWeek, 
      time 
    }: { 
      id: string; 
      status: 'approved' | 'rejected'; 
      email?: string; 
      name?: string;
      dayOfWeek?: string;
      time?: string;
    }) => {
      const { error } = await supabase
        .from('fixed_bookings')
        .update({ approval_status: status })
        .eq('id', id);
      
      if (error) throw error;
      
      // Send notification email if approved
      if (status === 'approved' && email) {
        supabase.functions.invoke('send-notification', {
          body: {
            type: 'fixed_approved',
            recipientEmail: email,
            recipientName: name || '',
            details: { dayOfWeek, time }
          }
        }).catch(err => console.error('Error sending notification:', err));
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-fixed-bookings'] });
      toast.success(
        variables.status === 'approved' 
          ? 'Horário fixo aprovado!' 
          : 'Solicitação rejeitada.'
      );
      setProcessingId(null);
    },
    onError: () => {
      toast.error('Erro ao processar solicitação');
      setProcessingId(null);
    },
  });

  const handleProfileAction = (profile: PendingProfile, status: 'approved' | 'rejected') => {
    setProcessingId(profile.id);
    profileMutation.mutate({ 
      id: profile.id, 
      status,
      email: profile.email,
      name: profile.name || undefined,
      planType: profile.student_plans?.[0]?.plan_type
    });
  };

  const handleFixedBookingAction = (booking: PendingFixedBooking, status: 'approved' | 'rejected') => {
    setProcessingId(booking.id);
    fixedBookingMutation.mutate({ 
      id: booking.id, 
      status,
      email: booking.profiles?.email,
      name: booking.profiles?.name || undefined,
      dayOfWeek: dayNames[booking.time_slots?.day_of_week],
      time: formatTime(booking.time_slots?.start_time)
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  const pendingProfilesCount = pendingProfiles?.length || 0;
  const pendingFixedCount = pendingFixedBookings?.length || 0;
  const totalPending = pendingProfilesCount + pendingFixedCount;

  return (
    <AdminLayout 
      title="Aprovações" 
      description={`${totalPending} solicitação(ões) pendente(s)`}
    >
      <Tabs defaultValue="cadastros" className="space-y-6">
        <TabsList>
          <TabsTrigger value="cadastros" className="gap-2">
            <UserPlus className="w-4 h-4" />
            Cadastros
            {pendingProfilesCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingProfilesCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="horarios-fixos" className="gap-2">
            <CalendarCheck className="w-4 h-4" />
            Horários Fixos
            {pendingFixedCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingFixedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cadastros" className="space-y-4">
          {loadingProfiles ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingProfiles && pendingProfiles.length > 0 ? (
            <div className="grid gap-4">
              {pendingProfiles.map((profile) => (
                <Card key={profile.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {profile.name || 'Sem nome'}
                        </CardTitle>
                        <CardDescription>{profile.email}</CardDescription>
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                        Pendente
                      </Badge>
                      {profile.student_plans?.[0]?.plan_type === 'experimental' && (
                        <Badge variant="outline" className="text-purple-600 border-purple-300 bg-purple-50 ml-2">
                          Experimental
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">Telefone:</span>
                        <p className="font-medium">{profile.phone || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cidade:</span>
                        <p className="font-medium">{profile.city || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">CPF:</span>
                        <p className="font-medium">{profile.cpf || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Plano:</span>
                        <p className="font-medium">
                          {profile.student_plans?.[0]?.plan_type 
                            ? `${profile.student_plans[0].plan_type} (${profile.student_plans[0].weekly_credits} créditos)`
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Data:</span>
                        <p className="font-medium">{formatDate(profile.created_at)}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleProfileAction(profile, 'rejected')}
                        disabled={processingId === profile.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {processingId === profile.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-1" />
                            Rejeitar
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleProfileAction(profile, 'approved')}
                        disabled={processingId === profile.id}
                      >
                        {processingId === profile.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Aprovar
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <UserPlus className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhum cadastro pendente de aprovação.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="horarios-fixos" className="space-y-4">
          {loadingFixed ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingFixedBookings && pendingFixedBookings.length > 0 ? (
            <div className="grid gap-4">
              {pendingFixedBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {booking.profiles?.name || 'Sem nome'}
                        </CardTitle>
                        <CardDescription>{booking.profiles?.email}</CardDescription>
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                        Pendente
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">Dia:</span>
                        <p className="font-medium">
                          {dayNames[booking.time_slots?.day_of_week] || '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Horário:</span>
                        <p className="font-medium">
                          {formatTime(booking.time_slots?.start_time)} - {formatTime(booking.time_slots?.end_time)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Solicitado em:</span>
                        <p className="font-medium">{formatDate(booking.created_at)}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFixedBookingAction(booking, 'rejected')}
                        disabled={processingId === booking.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {processingId === booking.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-1" />
                            Rejeitar
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleFixedBookingAction(booking, 'approved')}
                        disabled={processingId === booking.id}
                      >
                        {processingId === booking.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Aprovar
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarCheck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma solicitação de horário fixo pendente.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

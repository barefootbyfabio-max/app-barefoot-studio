import { Clock, Users, Calendar, TrendingUp } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const [slotsRes, bookingsRes, fixedRes, todayBookingsRes] = await Promise.all([
        supabase.from('time_slots').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('bookings').select('id', { count: 'exact' }),
        supabase.from('fixed_bookings').select('id', { count: 'exact' }),
        supabase.from('bookings').select('id', { count: 'exact' }).eq('booking_date', today),
      ]);

      return {
        activeSlots: slotsRes.count || 0,
        totalBookings: bookingsRes.count || 0,
        fixedStudents: fixedRes.count || 0,
        todayBookings: todayBookingsRes.count || 0,
      };
    },
  });

  const statCards = [
    { title: 'Horários Ativos', value: stats?.activeSlots || 0, icon: Clock, color: 'text-primary' },
    { title: 'Agendamentos Hoje', value: stats?.todayBookings || 0, icon: Calendar, color: 'text-green-600' },
    { title: 'Total de Reservas', value: stats?.totalBookings || 0, icon: TrendingUp, color: 'text-blue-600' },
    { title: 'Alunos Fixos', value: stats?.fixedStudents || 0, icon: Users, color: 'text-orange-600' },
  ];

  return (
    <AdminLayout title="Visão Geral" description="Painel administrativo do estúdio">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}

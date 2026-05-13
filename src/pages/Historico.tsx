import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isPast, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { History, Clock, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface BookingWithSlot {
  id: string;
  booking_date: string;
  status: string;
  created_at: string;
  time_slots: {
    start_time: string;
    end_time: string;
    day_of_week: number;
  };
}

export default function Historico() {
  const { user } = useAuth();

  const { data: pastBookings, isLoading } = useQuery({
    queryKey: ['past-bookings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          status,
          created_at,
          time_slots (
            start_time,
            end_time,
            day_of_week
          )
        `)
        .eq('aluno_id', user.id)
        .lt('booking_date', today)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      return data as BookingWithSlot[];
    },
    enabled: !!user,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmado':
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="w-3 h-3" />
            Realizada
          </Badge>
        );
      case 'cancelado':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Cancelada
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  return (
    <PageLayout
      title="Histórico de Aulas"
      description="Veja todas as suas aulas passadas"
    >
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : pastBookings && pastBookings.length > 0 ? (
          <div className="space-y-4">
            {pastBookings.map((booking, index) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-muted">
                          <History className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-lg font-medium">
                            <Calendar className="w-4 h-4 text-primary" />
                            {format(parseISO(booking.booking_date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground mt-1">
                            <Clock className="w-4 h-4" />
                            {formatTime(booking.time_slots.start_time)} - {formatTime(booking.time_slots.end_time)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-14 sm:ml-0">
                        {getStatusBadge(booking.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <History className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Nenhuma aula no histórico</h3>
            <p className="text-muted-foreground">
              Suas aulas passadas aparecerão aqui
            </p>
          </motion.div>
        )}
      </div>
    </PageLayout>
  );
}

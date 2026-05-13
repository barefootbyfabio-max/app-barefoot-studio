import { ReactNode } from 'react';
import { Clock, Users, LayoutDashboard, ChevronLeft, UserCheck, ClipboardCheck } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import barefootLogo from '@/assets/barefoot-logo.png';

const adminItems = [
  { title: 'Visão Geral', url: '/admin', icon: LayoutDashboard },
  { title: 'Aprovações', url: '/admin/aprovacoes', icon: ClipboardCheck },
  { title: 'Alunos', url: '/admin/alunos', icon: Users },
  { title: 'Horários', url: '/admin/horarios', icon: Clock },
  { title: 'Alunos Fixos', url: '/admin/alunos-fixos', icon: UserCheck },
  { title: 'Presença', url: '/admin/presenca', icon: ClipboardCheck },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  // Fetch pending counts for badge
  const { data: pendingCounts } = useQuery({
    queryKey: ['pending-counts'],
    queryFn: async () => {
      const [profilesRes, fixedRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('approval_status', 'pending')
          .eq('role', 'aluno'),
        supabase
          .from('fixed_bookings')
          .select('id', { count: 'exact', head: true })
          .eq('approval_status', 'pending'),
      ]);
      
      return (profilesRes.count || 0) + (fixedRes.count || 0);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <img src={barefootLogo} alt="Barefoot" className="h-8 w-8" />
        {!isCollapsed && <span className="font-bold text-lg">Admin</span>}
      </div>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Gerenciamento</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/admin'}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!isCollapsed && (
                        <span className="flex items-center gap-2">
                          {item.title}
                          {item.url === '/admin/aprovacoes' && pendingCounts !== undefined && pendingCounts > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5 px-1 flex items-center justify-center text-xs">
                              {pendingCounts}
                            </Badge>
                          )}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto p-4 border-t border-border">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
            <ChevronLeft className="h-4 w-4" />
            {!isCollapsed && <span>Voltar ao App</span>}
          </Button>
        </Link>
      </div>
    </Sidebar>
  );
}

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border flex items-center px-4 gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-xl font-heading tracking-wide">{title}</h1>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </header>
          <div className="flex-1 p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

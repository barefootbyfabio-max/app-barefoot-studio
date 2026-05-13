import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Clock, LogOut, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import barefootLogo from '@/assets/barefoot-logo.png';

export default function PendingApproval() {
  const { signOut, profile, user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    if (!user) return;
    
    setChecking(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('approval_status')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) {
        toast.error('Erro ao verificar status');
        return;
      }
      
      if (data?.approval_status === 'approved') {
        toast.success('Cadastro aprovado! 🎉');
        navigate('/dashboard', { replace: true });
      } else if (data?.approval_status === 'rejected') {
        toast.error('Cadastro não aprovado', {
          description: 'Entre em contato com o professor para mais informações.',
        });
      } else {
        toast.info('Ainda aguardando aprovação', {
          description: 'O professor ainda não analisou seu cadastro.',
        });
      }
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full text-center"
      >
        <img 
          src={barefootLogo} 
          alt="Barefoot" 
          className="h-16 w-auto mx-auto mb-8"
        />
        
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          
          <h1 className="text-2xl font-heading tracking-wide mb-2">
            Aguardando Aprovação
          </h1>
          
          <p className="text-muted-foreground mb-6">
            Seu cadastro foi recebido e está sendo analisado. 
            Você receberá acesso assim que for aprovado pelo professor.
          </p>

          {profile?.name && (
            <p className="text-sm text-muted-foreground mb-6">
              Cadastrado como: <span className="font-medium text-foreground">{profile.name}</span>
            </p>
          )}
          
          <div className="space-y-3">
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              className="w-full gap-2"
              disabled={checking}
            >
              {checking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Verificar status
            </Button>
            
            <Button 
              onClick={handleSignOut} 
              variant="ghost" 
              className="w-full gap-2 text-muted-foreground"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mt-6">
          Dúvidas? Entre em contato com o professor.
        </p>
      </motion.div>
    </div>
  );
}

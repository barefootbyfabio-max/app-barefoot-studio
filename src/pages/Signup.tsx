import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Loader2, ArrowLeft, Phone, MapPin, CreditCard, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import barefootLogo from '@/assets/barefoot-logo.png';

// Format phone number as (XX) XXXXX-XXXX
const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
};

// Format CPF as XXX.XXX.XXX-XX
const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
};

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [cpf, setCpf] = useState('');
  const [planType, setPlanType] = useState<'2x' | '3x' | 'experimental'>('2x');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate CPF has 11 digits
    const cpfNumbers = cpf.replace(/\D/g, '');
    if (cpfNumbers.length !== 11) {
      toast.error('CPF inválido', {
        description: 'O CPF deve ter 11 dígitos.',
      });
      setLoading(false);
      return;
    }

    // Validate phone has at least 10 digits
    const phoneNumbers = phone.replace(/\D/g, '');
    if (phoneNumbers.length < 10) {
      toast.error('Telefone inválido', {
        description: 'O telefone deve ter pelo menos 10 dígitos.',
      });
      setLoading(false);
      return;
    }

    const { error, userId } = await signUp(email, password, name, phone, city, cpf);

    if (error) {
      toast.error('Erro ao criar conta', {
        description: error.message,
      });
      setLoading(false);
      return;
    }

    if (!userId) {
      toast.error('Erro ao criar plano', {
        description: 'Conta criada mas não foi possível registrar o plano. Contate o professor.',
      });
      setLoading(false);
      return;
    }

    const weeklyCredits = planType === '3x' ? 3 : planType === '2x' ? 2 : 0;
    const { error: planError } = await supabase.from('student_plans').insert({
      student_id: userId,
      plan_type: planType as any,
      weekly_credits: weeklyCredits,
    });

    if (planError) {
      toast.error('Erro ao criar plano', {
        description: planError.message,
      });
      setLoading(false);
      return;
    }

    toast.success('Cadastro enviado!', {
      description: 'Aguarde a aprovação do professor para acessar o sistema.',
    });
    navigate('/aguardando-aprovacao');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Decoration */}
      <div className="hidden lg:flex flex-1 bg-foreground items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-md text-center"
        >
          <img 
            src={barefootLogo} 
            alt="Barefoot" 
            className="h-20 w-auto mx-auto mb-8 invert"
          />
          <h2 className="text-3xl font-heading tracking-wide mb-4 text-background">
            Comece sua jornada hoje
          </h2>
          <p className="text-background/70">
            Junte-se à comunidade Barefoot e descubra uma nova forma de cuidar do seu corpo. 
            Aulas personalizadas, turmas pequenas e horários flexíveis.
          </p>
        </motion.div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 py-8">
        <div className="w-full max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao início
            </Link>

            <div className="flex items-center gap-3 mb-8">
              <img 
                src={barefootLogo} 
                alt="Barefoot" 
                className="h-10 w-auto"
              />
              <span className="font-bold text-xl">Barefoot</span>
            </div>

            <h1 className="text-4xl font-heading tracking-wide mb-2">
              Crie sua conta
            </h1>
            <p className="text-muted-foreground mb-8">
              Preencha os dados abaixo para começar a agendar
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-11 h-12"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-12"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      className="pl-11 h-12"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="city"
                      type="text"
                      placeholder="Sua cidade"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="pl-11 h-12"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    className="pl-11 h-12"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Plano</Label>
                <RadioGroup
                  value={planType}
                  onValueChange={(value) => setPlanType(value as '2x' | '3x' | 'experimental')}
                  className="grid grid-cols-3 gap-3"
                >
                  <div className="relative">
                    <RadioGroupItem value="experimental" id="plan-experimental" className="peer sr-only" />
                    <Label
                      htmlFor="plan-experimental"
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                    >
                      <Sparkles className="w-6 h-6 mb-2" />
                      <span className="font-semibold text-sm">Experimental</span>
                      <span className="text-xs text-muted-foreground">1 aula grátis</span>
                    </Label>
                  </div>
                  <div className="relative">
                    <RadioGroupItem value="2x" id="plan-2x" className="peer sr-only" />
                    <Label
                      htmlFor="plan-2x"
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                    >
                      <Calendar className="w-6 h-6 mb-2" />
                      <span className="font-semibold text-sm">2x por semana</span>
                      <span className="text-xs text-muted-foreground">2 créditos</span>
                    </Label>
                  </div>
                  <div className="relative">
                    <RadioGroupItem value="3x" id="plan-3x" className="peer sr-only" />
                    <Label
                      htmlFor="plan-3x"
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                    >
                      <Calendar className="w-6 h-6 mb-2" />
                      <span className="font-semibold text-sm">3x por semana</span>
                      <span className="text-xs text-muted-foreground">3 créditos</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-12"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="default"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  'Criar conta'
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-foreground font-medium hover:underline">
                Entrar
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

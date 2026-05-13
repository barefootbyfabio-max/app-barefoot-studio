import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, Users, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BackgroundPaths } from '@/components/ui/background-paths';
import { HoverButton } from '@/components/ui/hover-button';
import { SparklesCore } from '@/components/ui/sparkles';
import { Navbar } from '@/components/layout/Navbar';
import barefootLogo from '@/assets/barefoot-logo.png';

const features = [
  {
    icon: Calendar,
    title: 'Agendamento Fácil',
    description: 'Reserve suas aulas em poucos cliques, veja horários disponíveis em tempo real.',
  },
  {
    icon: Clock,
    title: 'Horários Flexíveis',
    description: 'Escolha entre diversos horários que se encaixam na sua rotina.',
  },
  {
    icon: Users,
    title: 'Turmas Pequenas',
    description: 'Máximo de 4 alunos por aula para atenção personalizada.',
  },
];

const benefits = [
  'Agende aulas 24/7 pelo app',
  'Vagas fixas garantidas',
  'Notificações de disponibilidade',
  'Histórico completo de aulas',
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-32">
        {/* Background decoration */}
        <BackgroundPaths />

        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <img 
                src={barefootLogo} 
                alt="Barefoot Studio" 
                className="h-24 md:h-32 w-auto mx-auto"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-foreground text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Novo sistema de agendamento
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-5xl md:text-7xl lg:text-8xl font-heading tracking-wide mb-6"
            >
              Train better,{' '}
              <span className="underline decoration-4 underline-offset-8">train smarter</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            >
              Agende suas aulas no Barefoot Studio de forma simples e rápida. 
              Turmas pequenas, atenção personalizada e horários que cabem na sua rotina.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link to="/signup">
                <HoverButton className="group">
                  Começar Agora
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </HoverButton>
              </Link>
              <Link to="/login">
                <HoverButton className="bg-transparent text-foreground border-2 border-foreground hover:bg-foreground/5">
                  Já tenho conta
                </HoverButton>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-heading tracking-wide mb-4">
              Por que escolher o Barefoot?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Uma experiência completa de agendamento pensada para você
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative bg-card rounded-2xl p-8 shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border"
              >
                <div className="absolute inset-0 bg-muted/50 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity" />
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-foreground flex items-center justify-center mb-6">
                    <feature.icon className="w-7 h-7 text-background" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-4xl md:text-5xl font-heading tracking-wide mb-6">
                  Tudo que você precisa em um só lugar
                </h2>
                <p className="text-muted-foreground text-lg mb-8">
                  Gerencie suas aulas, acompanhe sua frequência e nunca perca uma vaga disponível.
                </p>
                <ul className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <motion.li
                      key={benefit}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-background" />
                      </div>
                      <span className="font-medium">{benefit}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="bg-muted rounded-3xl p-8 md:p-12">
                  <div className="bg-card rounded-2xl shadow-2xl p-6 space-y-4 border border-border">
                    <div className="flex items-center gap-3 pb-4 border-b border-border">
                      <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-background" />
                      </div>
                      <div>
                        <p className="font-semibold">Próxima Aula</p>
                        <p className="text-sm text-muted-foreground">Segunda, 8:00</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {['8:00', '9:00', '10:00'].map((time, i) => (
                        <div
                          key={time}
                          className={`flex items-center justify-between p-3 rounded-xl ${
                            i === 0 ? 'bg-foreground text-background' : 'bg-muted'
                          }`}
                        >
                          <span className="font-medium">{time}</span>
                          <span className={`text-sm ${i === 0 ? 'font-medium' : 'text-muted-foreground'}`}>
                            {i === 0 ? 'Sua vaga' : `${4 - i} vagas`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative max-w-3xl mx-auto text-center bg-foreground text-background rounded-3xl p-12 overflow-hidden"
          >
            {/* Sparkles background */}
            <div className="absolute inset-0 w-full h-full">
              <SparklesCore
                id="cta-sparkles"
                background="transparent"
                minSize={0.4}
                maxSize={1}
                particleDensity={80}
                className="w-full h-full"
                particleColor="#ffffff"
                speed={1}
              />
              {/* Radial mask to soften edges */}
              <div className="absolute inset-0 w-full h-full bg-foreground [mask-image:radial-gradient(500px_300px_at_center,transparent_20%,black)]" />
            </div>

            {/* Content on top of sparkles */}
            <div className="relative z-20">
              <h2 className="text-4xl md:text-5xl font-heading tracking-wide mb-4">
                Pronto para começar?
              </h2>
              <p className="text-background/70 text-lg mb-8">
                Cadastre-se gratuitamente e agende sua primeira aula hoje.
              </p>
              <Link to="/signup">
                <Button variant="secondary" size="xl" className="group bg-background text-foreground hover:bg-background/90">
                  Criar minha conta
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img 
                src={barefootLogo} 
                alt="Barefoot" 
                className="h-8 w-auto"
              />
              <span className="font-bold">Barefoot Studio</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Barefoot Studio. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

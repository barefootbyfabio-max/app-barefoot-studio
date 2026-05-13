import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from './Navbar';

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  showNavbar?: boolean;
}

export function PageLayout({ 
  children, 
  title, 
  description,
  showNavbar = true 
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {showNavbar && <Navbar />}
      <main className={showNavbar ? "pt-16" : ""}>
        {(title || description) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-b border-border/50 bg-gradient-to-b from-muted/30 to-transparent"
          >
            <div className="container mx-auto px-4 py-8">
              {title && (
                <h1 className="text-4xl font-heading tracking-wide">{title}</h1>
              )}
              {description && (
                <p className="text-muted-foreground mt-2">{description}</p>
              )}
            </div>
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

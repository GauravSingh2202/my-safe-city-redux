import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, MapPin, FileText, Phone, ArrowRight, Zap, Users, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const features = [
  { icon: AlertTriangle, title: 'SOS Emergency', desc: 'One-tap emergency alert with live GPS tracking', link: '/', color: 'text-emergency', bg: 'bg-emergency/10', hoverBg: 'group-hover:bg-emergency/15' },
  { icon: FileText, title: 'Report Crime', desc: 'Submit detailed crime reports with photo evidence', link: '/report', color: 'text-primary', bg: 'bg-primary/10', hoverBg: 'group-hover:bg-primary/15' },
  { icon: MapPin, title: 'Crime Heatmap', desc: 'Visualize crime hotspots across Dehradun', link: '/heatmap', color: 'text-warning', bg: 'bg-warning/10', hoverBg: 'group-hover:bg-warning/15' },
  { icon: Phone, title: 'Emergency Services', desc: 'Find nearest police, hospitals & fire stations', link: '/emergency-services', color: 'text-success', bg: 'bg-success/10', hoverBg: 'group-hover:bg-success/15' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: [0, 0, 0.2, 1] as const } }),
};

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-16">
        {/* Hero */}
        <motion.div initial="hidden" animate="visible" className="text-center max-w-3xl mx-auto mb-20">
          <motion.p variants={fadeUp} custom={0} className="text-primary font-semibold mb-4 flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" /> Protecting Our Communities
          </motion.p>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Your City, <br /> <span className="gradient-text">Safer Together</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground mb-8">
            MySafeCity empowers citizens to report crimes, trigger emergency alerts, and stay informed about safety in their neighborhood — all in real time.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="flex flex-wrap justify-center gap-4">
            {!isAuthenticated ? (
              <>
                <button onClick={() => navigate('/register')}
                  className="px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow">
                  Get Started
                </button>
                <button onClick={() => navigate('/login')}
                  className="px-8 py-3.5 bg-secondary text-secondary-foreground rounded-xl font-semibold text-lg hover:bg-accent transition-colors border border-border/50">
                  Sign In
                </button>
              </>
            ) : (
              <button onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/report')}
                className="px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-lg shadow-lg shadow-primary/25 flex items-center gap-2 hover:shadow-xl hover:shadow-primary/30 transition-shadow">
                {user?.role === 'admin' ? 'Go to Dashboard' : 'Report a Crime'}
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </motion.div>
        </motion.div>

        {/* Features */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-20">
          <motion.h2 variants={fadeUp} custom={0} className="text-2xl md:text-3xl font-bold text-center mb-3">
            How MySafeCity Keeps You Safe
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-center mb-10">
            Comprehensive safety tools designed for the citizens of Dehradun
          </motion.p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} variants={fadeUp} custom={i + 2}>
                <Link to={f.link} className="glass-card-hover rounded-2xl p-6 block group">
                  <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4 transition-colors ${f.hoverBg}`}>
                    <f.icon className={`w-6 h-6 ${f.color}`} />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm mb-3">{f.desc}</p>
                  <span className="text-primary text-sm font-medium flex items-center gap-1">
                    Learn more <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          {[
            { value: '247', label: 'Reports Filed', icon: FileText },
            { value: '189', label: 'Cases Resolved', icon: Shield },
            { value: '24/7', label: 'Monitoring', icon: Clock },
            { value: '50K+', label: 'Citizens Protected', icon: Users },
          ].map((s, i) => (
            <motion.div key={s.label} variants={fadeUp} custom={i} className="stat-card text-center">
              <s.icon className="w-6 h-6 text-primary mx-auto mb-2" />
              <div className="text-3xl font-bold mb-1">{s.value}</div>
              <div className="text-muted-foreground text-sm">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center glass-card rounded-2xl p-10">
          <motion.h2 variants={fadeUp} custom={0} className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Make Your City Safer?
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground mb-6">
            Join thousands of citizens keeping Dehradun safe together.
          </motion.p>
          <motion.div variants={fadeUp} custom={2}>
            <button onClick={() => navigate(isAuthenticated ? '/report' : '/register')}
              className="px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow inline-flex items-center gap-2">
              {isAuthenticated ? 'Report a Crime' : 'Join MySafeCity'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

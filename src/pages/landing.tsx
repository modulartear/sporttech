import { Link } from 'react-router-dom';
import { Play, Shield, Zap, Globe, ArrowRight, Video, Users, CreditCard } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';

export function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-pink-500/30">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-700 rounded-lg transform lg:group-hover:rotate-12 transition-transform duration-300 flex items-center justify-center">
              <Play className="w-6 h-6 fill-white" />
            </div>
            <span className="text-2xl font-black italic tracking-tighter uppercase tracking-[-0.05em] text-white">
              Sport<span className="text-pink-500">tech</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#about" className="hover:text-white transition-colors">About</a>
            <Link to="/events" className="text-pink-500 hover:text-pink-400 font-bold transition-colors border-b border-pink-500/0 hover:border-pink-500/100">PLATFORM</Link>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link to="/events" className="btn-gradient px-6 py-2 text-sm rounded-xl">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium hover:text-white transition-colors hidden sm:block">
                  Sign In
                </Link>
                <Link to="/login" className="btn-gradient px-6 py-2 text-sm rounded-xl">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-40 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] bg-pink-500/20 blur-[120px] rounded-full" />
          
          <div className="max-w-7xl mx-auto px-4 relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-500 text-xs font-bold mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                </span>
                LIVE STREAMING EVOLVED
              </div>
              <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.9] mb-8">
                The Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-700">Sports</span> Streaming
              </h1>
              <p className="text-xl text-zinc-400 mb-10 leading-relaxed max-w-2xl">
                Experience high-performance streaming with integrated digital ticketing, 
                real-time analytics, and seamless payment processing. Built for the modern athlete and fan.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/events" className="btn-gradient text-lg px-8 py-4 rounded-2xl flex items-center justify-center gap-2 group">
                  Explore Events
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a href="#features" className="px-8 py-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition-all font-bold flex items-center justify-center gap-2">
                  How it works
                </a>
              </div>

              <div className="mt-20 flex items-center gap-8 grayscale opacity-50">
                <div className="flex items-center gap-2 font-black italic text-2xl tracking-tighter uppercase">
                  <Globe className="w-6 h-6" /> GLOBAL
                </div>
                <div className="flex items-center gap-2 font-black italic text-2xl tracking-tighter uppercase">
                  <Shield className="w-6 h-6" /> SECURE
                </div>
                <div className="flex items-center gap-2 font-black italic text-2xl tracking-tighter uppercase">
                  <Zap className="w-6 h-6" /> FAST
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-32 relative border-t border-zinc-900">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Video className="w-8 h-8 text-pink-500" />}
                title="HD Streaming"
                description="Zero-latency high definition streams optimized for mobile and web viewers."
              />
              <FeatureCard 
                icon={<CreditCard className="w-8 h-8 text-pink-500" />}
                title="Smart Ticketing"
                description="Integrated MercadoPago payments for instant access to premium live events."
              />
              <FeatureCard 
                icon={<Shield className="w-8 h-8 text-pink-500" />}
                title="Anti-Piracy"
                description="Secure embed tokens and user verification to protect your valuable content."
              />
              <FeatureCard 
                icon={<Users className="w-8 h-8 text-pink-500" />}
                title="Community"
                description="Built-in social features and real-time interaction for fans worldwide."
              />
              <FeatureCard 
                icon={<Globe className="w-8 h-8 text-pink-500" />}
                title="Global Scale"
                description="Content delivery network (CDN) ensures smooth performance from anywhere."
              />
              <FeatureCard 
                icon={<Zap className="w-8 h-8 text-pink-500" />}
                title="Elite Performance"
                description="Optimized architecture for handling thousands of concurrent viewers."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="py-20 border-t border-zinc-900 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Play className="w-6 h-6 text-pink-500 fill-pink-500" />
                <span className="text-xl font-black italic tracking-tighter uppercase">Sporttech</span>
              </div>
              <p className="max-w-xs text-zinc-500 text-sm leading-relaxed">
                The premier platform for sports streaming and digital event management. 
                Experience sports like never before.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
              <div>
                <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-zinc-400">Platform</h4>
                <ul className="space-y-4 text-sm text-zinc-500 font-medium">
                  <li><Link to="/events" className="hover:text-pink-500 transition-colors">Browse Events</Link></li>
                  <li><Link to="/my-events" className="hover:text-pink-500 transition-colors">My Purchases</Link></li>
                  <li><a href="#" className="hover:text-pink-500 transition-colors">Pricing</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-zinc-400">Support</h4>
                <ul className="space-y-4 text-sm text-zinc-500 font-medium">
                  <li><a href="#" className="hover:text-pink-500 transition-colors">FAQ</a></li>
                  <li><a href="#" className="hover:text-pink-500 transition-colors">Help Center</a></li>
                  <li><a href="#" className="hover:text-pink-500 transition-colors">Contact</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-zinc-400">Legal</h4>
                <ul className="space-y-4 text-sm text-zinc-500 font-medium">
                  <li><a href="#" className="hover:text-pink-500 transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-pink-500 transition-colors">Terms of Service</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="pt-12 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-6 text-zinc-500 text-xs">
            <p>© 2024 Sporttech Inc. All rights reserved.</p>
            <div className="flex gap-8 uppercase tracking-widest font-bold">
              <a href="#" className="hover:text-white transition-colors">Instagram</a>
              <a href="#" className="hover:text-white transition-colors">YouTube</a>
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="premium-card p-10 group cursor-default">
      <div className="mb-6 p-4 rounded-2xl bg-zinc-950 border border-zinc-800 group-hover:bg-pink-500/10 group-hover:border-pink-500/30 transition-colors w-fit">
        {icon}
      </div>
      <h3 className="text-xl font-black italic tracking-tighter uppercase mb-4 text-white">{title}</h3>
      <p className="text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">
        {description}
      </p>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Play, Shield, Zap, Globe, ArrowRight, Video, Users, CreditCard } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/language-switcher';
import logo from '../assets/logo.png';

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-pink-500/30">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group cursor-pointer">
            <img src={logo} alt="Sporttech Logo" className="h-10 w-auto" />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">{t('nav.features')}</a>
            <a href="#about" className="hover:text-white transition-colors">{t('nav.about')}</a>
            <Link to="/events" className="text-pink-500 hover:text-pink-400 font-bold transition-colors border-b border-pink-500/0 hover:border-pink-500/100">{t('nav.platform')}</Link>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <Link to="/events" className="btn-gradient px-6 py-2 text-sm rounded-xl">
                {t('nav.dashboard')}
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium hover:text-white transition-colors hidden sm:block">
                  {t('nav.signIn')}
                </Link>
                <Link to="/login" className="btn-gradient px-6 py-2 text-sm rounded-xl">
                  {t('nav.getStarted')}
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
                {t('hero.badge')}
              </div>
              <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.9] mb-8">
                {t('hero.title').split('Sports').map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-700">Sports</span>}
                  </span>
                ))}
              </h1>
              <p className="text-xl text-zinc-400 mb-10 leading-relaxed max-w-2xl">
                {t('hero.description')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/events" className="btn-gradient text-lg px-8 py-4 rounded-2xl flex items-center justify-center gap-2 group">
                  {t('hero.explore')}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a href="#features" className="px-8 py-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition-all font-bold flex items-center justify-center gap-2">
                  {t('hero.howItWorks')}
                </a>
              </div>

              <div className="mt-20 flex items-center gap-8 grayscale opacity-50">
                <div className="flex items-center gap-2 font-black italic text-2xl tracking-tighter uppercase">
                  <Globe className="w-6 h-6" /> {t('hero.global')}
                </div>
                <div className="flex items-center gap-2 font-black italic text-2xl tracking-tighter uppercase">
                  <Shield className="w-6 h-6" /> {t('hero.secure')}
                </div>
                <div className="flex items-center gap-2 font-black italic text-2xl tracking-tighter uppercase">
                  <Zap className="w-6 h-6" /> {t('hero.fast')}
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
                title={t('features.hd.title')}
                description={t('features.hd.description')}
              />
              <FeatureCard 
                icon={<CreditCard className="w-8 h-8 text-pink-500" />}
                title={t('features.ticketing.title')}
                description={t('features.ticketing.description')}
              />
              <FeatureCard 
                icon={<Shield className="w-8 h-8 text-pink-500" />}
                title={t('features.security.title')}
                description={t('features.security.description')}
              />
              <FeatureCard 
                icon={<Users className="w-8 h-8 text-pink-500" />}
                title={t('features.community.title')}
                description={t('features.community.description')}
              />
              <FeatureCard 
                icon={<Globe className="w-8 h-8 text-pink-500" />}
                title={t('features.scale.title')}
                description={t('features.scale.description')}
              />
              <FeatureCard 
                icon={<Zap className="w-8 h-8 text-pink-500" />}
                title={t('features.performance.title')}
                description={t('features.performance.description')}
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
                <img src={logo} alt="Sporttech Logo" className="h-8 w-auto" />
              </div>
              <p className="max-w-xs text-zinc-500 text-sm leading-relaxed">
                {t('footer.description')}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
              <div>
                <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-zinc-400">{t('footer.platform')}</h4>
                <ul className="space-y-4 text-sm text-zinc-500 font-medium">
                  <li><Link to="/events" className="hover:text-pink-500 transition-colors">{t('footer.browseEvents')}</Link></li>
                  <li><Link to="/my-events" className="hover:text-pink-500 transition-colors">{t('footer.myPurchases')}</Link></li>
                  <li><a href="#" className="hover:text-pink-500 transition-colors">{t('footer.pricing')}</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-zinc-400">{t('footer.support')}</h4>
                <ul className="space-y-4 text-sm text-zinc-500 font-medium">
                  <li><a href="#" className="hover:text-pink-500 transition-colors">{t('footer.faq')}</a></li>
                  <li><a href="#" className="hover:text-pink-500 transition-colors">{t('footer.helpCenter')}</a></li>
                  <li><a href="#" className="hover:text-pink-500 transition-colors">{t('footer.contact')}</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-zinc-400">{t('footer.legal')}</h4>
                <ul className="space-y-4 text-sm text-zinc-500 font-medium">
                  <li><a href="#" className="hover:text-pink-500 transition-colors">{t('footer.privacy')}</a></li>
                  <li><a href="#" className="hover:text-pink-500 transition-colors">{t('footer.terms')}</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="pt-12 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-6 text-zinc-500 text-xs">
            <p>{t('footer.rights')}</p>
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

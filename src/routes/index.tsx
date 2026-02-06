import { createFileRoute } from '@tanstack/react-router'
import {
  Users,
  TrendingUp,
  Zap,
  Shield,
  Sparkles,
} from 'lucide-react'

import logoImg from '../logo.png'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const features = [
    {
      icon: <img src={logoImg} alt="Liwanag" className="w-12 h-12 rounded-lg" />,
      title: 'Illuminate the Dark Funnel',
      description:
        'Convert personal email signals into enterprise pipeline. Discover high-value leads hiding in your newsletter subscribers.',
    },
    {
      icon: <Users className="w-12 h-12 text-amber-400" />,
      title: 'Waterfall Enrichment',
      description:
        'Leverage 15+ data providers to achieve 80%+ match rates on personal emails. No lead left behind.',
    },
    {
      icon: <TrendingUp className="w-12 h-12 text-cyan-400" />,
      title: 'ICP Scoring',
      description:
        'Automatically score and prioritize leads based on company size, industry, and job title. Focus on what matters.',
    },
    {
      icon: <Zap className="w-12 h-12 text-amber-400" />,
      title: 'Instant CRM Sync',
      description:
        'One-click synchronization with your CRM. Turn hidden gems into qualified opportunities automatically.',
    },
    {
      icon: <Shield className="w-12 h-12 text-cyan-400" />,
      title: 'Privacy First',
      description:
        'GDPR compliant enrichment using publicly available professional data. Secure webhook validation built-in.',
    },
    {
      icon: <Sparkles className="w-12 h-12 text-amber-400" />,
      title: 'Job Change Alerts',
      description:
        'Track when champions move to new companies. Never lose touch with your best advocates.',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <section className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-amber-500/10 to-cyan-500/10"></div>
        <div className="relative max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="relative">
              {/* Clear Logo Display */}
              <div className="w-32 h-32 md:w-40 md:h-40 relative">
                <img src={logoImg} alt="Liwanag" className="w-full h-full object-contain drop-shadow-2xl" />
              </div>
            </div>
            <h1 className="text-6xl md:text-7xl font-black text-white [letter-spacing:-0.02em]">
              <span className="bg-gradient-to-r from-cyan-400 to-amber-400 bg-clip-text text-transparent">
                Liwanag
              </span>
            </h1>
          </div>
          <p className="text-2xl md:text-3xl text-gray-300 mb-4 font-light">
            Liwanag sa Madilim na Funnel
          </p>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-8">
            Turn personal signals into enterprise pipeline. The first autonomous intelligence engine
            that converts newsletter subscribers into qualified sales opportunities.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/signin"
              className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-bold text-lg rounded-lg transition-all shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/70 hover:scale-105"
            >
              Get Started →
            </a>
          </div>
          <div className="mt-8 p-4 bg-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg max-w-2xl mx-auto">
            <p className="text-cyan-400 font-mono text-sm">
              <span className="text-gray-500">// The Problem:</span><br />
              50% of your future revenue is hiding in @gmail.com addresses
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-white mb-12">
          How Liwanag Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold text-cyan-400 mb-2">80%+</div>
              <div className="text-gray-400">Match Rate on Personal Emails</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-amber-400 mb-2">15+</div>
              <div className="text-gray-400">Data Providers in Waterfall</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-cyan-400 mb-2">$50k</div>
              <div className="text-gray-400">Avg. Pipeline per Hidden Gem</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-4">
            Stop Marketing to Ghosts
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Start selling to people. Liwanag reveals the hidden revenue in your dark funnel.
          </p>
          <a
            href="/dashboard"
            className="inline-block px-10 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-amber-500/50 hover:shadow-amber-500/70 text-lg"
          >
            Get Started Now
          </a>
        </div>
      </section>
    </div>
  )
}

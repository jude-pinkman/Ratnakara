'use client';

import Link from 'next/link';
import { Waves, Fish, Dna, TreeDeciduous, BarChart3, Bot, Activity, ArrowRight, ChevronRight, Sparkles, TrendingUp } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="w-full overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative w-full min-h-screen flex items-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-marine-900 to-navy-950">
          {/* Animated circles */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-marine-500/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl animate-pulse-slow delay-1000" />
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow delay-2000" />

          {/* Wave SVG */}
          <svg
            className="absolute bottom-0 left-0 w-full"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
          >
            <path
              fill="rgba(14, 165, 233, 0.1)"
              d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            >
              <animate
                attributeName="d"
                dur="10s"
                repeatCount="indefinite"
                values="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
                M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,149.3C672,149,768,203,864,224C960,245,1056,235,1152,213.3C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
                M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              />
            </path>
            <path
              fill="rgba(45, 212, 191, 0.08)"
              d="M0,256L48,261.3C96,267,192,277,288,261.3C384,245,480,203,576,197.3C672,192,768,224,864,234.7C960,245,1056,235,1152,213.3C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            >
              <animate
                attributeName="d"
                dur="8s"
                repeatCount="indefinite"
                values="M0,256L48,261.3C96,267,192,277,288,261.3C384,245,480,203,576,197.3C672,192,768,224,864,234.7C960,245,1056,235,1152,213.3C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
                M0,224L48,213.3C96,203,192,181,288,192C384,203,480,245,576,261.3C672,277,768,267,864,250.7C960,235,1056,213,1152,197.3C1248,181,1344,171,1392,165.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
                M0,256L48,261.3C96,267,192,277,288,261.3C384,245,480,203,576,197.3C672,192,768,224,864,234.7C960,245,1056,235,1152,213.3C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              />
            </path>
          </svg>
        </div>

        <div className="relative container mx-auto px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span className="text-sm text-white/90">AI-Powered Analytics Platform</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight animate-slide-up">
              AI-Driven Unified
              <span className="block gradient-text">Marine Data Platform</span>
            </h1>

            <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto animate-fade-in">
              Comprehensive oceanographic, fisheries, and biodiversity analytics powered by
              advanced machine learning and real-time monitoring systems.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
              <Link
                href="/dashboard"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-navy-900 font-semibold text-lg hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Explore Dashboard
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/api-docs"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/10 text-white font-semibold text-lg border border-white/30 hover:bg-white/20 transition-all duration-300"
              >
                View API Docs
              </Link>
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="stat-item animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <span className="stat-value">180+</span>
              <span className="stat-label">Ocean Stations</span>
            </div>
            <div className="stat-item animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <span className="stat-value">15+</span>
              <span className="stat-label">Fish Species</span>
            </div>
            <div className="stat-item animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <span className="stat-value">960+</span>
              <span className="stat-label">eDNA Samples</span>
            </div>
            <div className="stat-item animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <span className="stat-value">1000+</span>
              <span className="stat-label">Taxonomic Records</span>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="w-full py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-navy-900 mb-4">Data Modules</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Explore comprehensive marine data through specialized modules designed for researchers and analysts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Link href="/ocean" className="group">
              <div className="card h-full border-2 border-transparent hover:border-marine-500 transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-marine-500 to-marine-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Waves className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-3">Ocean Data</h3>
                <p className="text-gray-600 mb-4">
                  Temperature, salinity, pH, and oxygen monitoring across marine ecosystems
                </p>
                <span className="inline-flex items-center text-marine-600 font-medium group-hover:gap-2 transition-all">
                  Explore <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </Link>

            <Link href="/fisheries" className="group">
              <div className="card h-full border-2 border-transparent hover:border-emerald-500 transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Fish className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-3">Fisheries</h3>
                <p className="text-gray-600 mb-4">
                  Fish abundance, biomass, and diversity tracking for sustainable management
                </p>
                <span className="inline-flex items-center text-emerald-600 font-medium group-hover:gap-2 transition-all">
                  Explore <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </Link>

            <Link href="/edna" className="group">
              <div className="card h-full border-2 border-transparent hover:border-purple-500 transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Dna className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-3">eDNA Molecular</h3>
                <p className="text-gray-600 mb-4">
                  Environmental DNA analysis for biodiversity assessment and monitoring
                </p>
                <span className="inline-flex items-center text-purple-600 font-medium group-hover:gap-2 transition-all">
                  Explore <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </Link>

            <Link href="/taxonomy" className="group">
              <div className="card h-full border-2 border-transparent hover:border-orange-500 transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <TreeDeciduous className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-3">Taxonomy</h3>
                <p className="text-gray-600 mb-4">
                  Hierarchical species classification and taxonomic information browser
                </p>
                <span className="inline-flex items-center text-orange-600 font-medium group-hover:gap-2 transition-all">
                  Explore <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="w-full py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-navy-900 mb-4">Analytics & Tools</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Advanced analytics tools for deeper insights and predictive capabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Link href="/forecast" className="group">
              <div className="card h-full border-2 border-transparent hover:border-purple-500 transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-3">Forecasts</h3>
                <p className="text-gray-600 mb-4">
                  LSTM-powered predictions with confidence intervals and trend analysis
                </p>
                <span className="inline-flex items-center text-purple-600 font-medium group-hover:gap-2 transition-all">
                  Predict <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </Link>

            <Link href="/correlations" className="group">
              <div className="card h-full border-2 border-transparent hover:border-indigo-500 transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-3">Correlations</h3>
                <p className="text-gray-600 mb-4">
                  Environmental factors vs abundance with heatmap and strength analysis
                </p>
                <span className="inline-flex items-center text-indigo-600 font-medium group-hover:gap-2 transition-all">
                  Analyze <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </Link>

            <Link href="/api-docs" className="group">
              <div className="card h-full border-2 border-transparent hover:border-blue-500 transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-3">API Reference</h3>
                <p className="text-gray-600 mb-4">
                  Explore live ingestion and analytics endpoints for realtime integrations
                </p>
                <span className="inline-flex items-center text-blue-600 font-medium group-hover:gap-2 transition-all">
                  Explore <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>
      <section className="w-full py-24 bg-gradient-to-br from-navy-900 to-marine-900">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">AI Analytics & Features</h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Harness the power of artificial intelligence for advanced marine data analysis and predictions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card-glass text-center p-8 hover:bg-white/15 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-marine-400 to-teal-400 flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Advanced Visualization</h3>
              <p className="text-gray-300">
                Interactive charts, heatmaps, and geospatial mapping for comprehensive data insights
              </p>
            </div>

            <div className="card-glass text-center p-8 hover:bg-white/15 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center mx-auto mb-6">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AI Forecasting</h3>
              <p className="text-gray-300">
                LSTM-powered predictions for fish population and environmental trends
              </p>
            </div>

            <div className="card-glass text-center p-8 hover:bg-white/15 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center mx-auto mb-6">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AI Chatbot</h3>
              <p className="text-gray-300">
                Natural language queries for marine data and terminology explanations
              </p>
            </div>
          </div>

          {/* Additional Features */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="flex items-start gap-4 p-6 rounded-xl bg-white/5 border border-white/10">
              <div className="w-12 h-12 rounded-lg bg-marine-500/20 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-marine-400" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Correlation Analysis</h4>
                <p className="text-gray-400 text-sm">
                  Environmental factors vs fish abundance with scatter plots and coefficient analysis
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 rounded-xl bg-white/5 border border-white/10">
              <div className="w-12 h-12 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                <Waves className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Real-time Monitoring</h4>
                <p className="text-gray-400 text-sm">
                  180+ geospatial monitoring stations across Indian marine regions
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-navy-900 mb-6">
              Ready to Explore Marine Data?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Start analyzing oceanographic data, track fish populations, and discover biodiversity patterns with our comprehensive platform.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-marine-600 to-teal-600 text-white font-semibold text-lg hover:from-marine-700 hover:to-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-navy-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-6 md:mb-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-marine-500 to-teal-500 flex items-center justify-center">
                <Waves className="w-6 h-6 text-white" />
              </div>
              <span className="text-lg font-bold">Marine Data Platform</span>
            </div>
            <p className="text-gray-400 text-sm">
              AI-Driven Unified Marine Data Platform | MIT License
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

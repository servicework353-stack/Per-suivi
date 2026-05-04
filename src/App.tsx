/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate,
  Link,
  useParams
} from "react-router-dom";
import { 
  Search, 
  FileText, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Plus, 
  Trash2, 
  Edit2, 
  LogOut, 
  ShieldCheck,
  ChevronRight,
  Info,
  User,
  ArrowLeft,
  MapPin,
  Phone,
  CreditCard,
  Image as ImageIcon,
  UserCircle,
  FileSearch,
  ArrowRight,
  Smartphone,
  MessagesSquare,
  Zap,
  Star
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- TYPES ---
interface Application {
  id: number;
  tracking_code: string;
  first_name: string;
  last_name: string;
  address: string;
  phone: string;
  license_category: string;
  photo_url: string;
  id_card_url: string;
  status: string;
  last_updated: string;
  comment: string;
}

const STATUS_OPTIONS = [
  "Dossier reçu",
  "En cours de traitement",
  "En attente de pièces complémentaires",
  "Validé",
  "Rejeté",
  "Permis disponible"
];

// --- COMPONENTS ---

const Header = React.memo(() => (
  <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3 group">
        <div className="bg-blue-600 p-2.5 rounded-2xl group-hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 group-hover:scale-105 active:scale-95">
          <FileText className="text-white w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-xl text-slate-900 tracking-tight font-display leading-none">PermisSuivi</span>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mt-1 hidden sm:block">Ministère des Transports</span>
        </div>
      </Link>
      <nav className="flex items-center gap-4">
        <Link 
          to="/admin" 
          className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-all flex items-center gap-2 px-4 py-2.5 rounded-2xl hover:bg-blue-50 border border-transparent hover:border-blue-100 active:scale-95"
        >
          <ShieldCheck className="w-4.5 h-4.5" />
          <span className="hidden sm:inline">Espace Administration</span>
          <span className="sm:hidden">Admin</span>
        </Link>
      </nav>
    </div>
  </header>
));

const Footer = React.memo(() => (
  <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 py-16 md:py-24 overflow-hidden relative">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-16">
        <div className="md:col-span-2 space-y-8">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
              <FileText className="text-white w-5 h-5" />
            </div>
            <span className="font-extrabold text-2xl text-white font-display tracking-tight">PermisSuivi</span>
          </div>
          <p className="text-slate-400 max-w-md leading-relaxed text-lg">
            Simplifiez vos démarches administratives avec notre plateforme de suivi en temps réel. Un service public moderne au service des citoyens.
          </p>
          <div className="flex items-center gap-4 pt-4">
            {['Twitter', 'Facebook', 'LinkedIn'].map((social) => (
              <div key={social} className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all cursor-pointer group">
                <Info className="w-5 h-5 text-slate-500 group-hover:text-white" />
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="font-bold text-white mb-8 uppercase text-xs tracking-[0.2em]">Navigation</h3>
          <ul className="space-y-4 text-sm font-medium">
            <li><a href="#" className="hover:text-blue-400 transition-colors flex items-center gap-3 group"><ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" /> Accueil</a></li>
            <li><a href="#" className="hover:text-blue-400 transition-colors flex items-center gap-3 group"><ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" /> Suivre mon dossier</a></li>
            <li><a href="#" className="hover:text-blue-400 transition-colors flex items-center gap-3 group"><ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" /> Aide & Support</a></li>
            <li><a href="#" className="hover:text-blue-400 transition-colors flex items-center gap-3 group"><ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" /> Contact</a></li>
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-white mb-8 uppercase text-xs tracking-[0.2em]">L'Administration</h3>
          <div className="space-y-6 text-sm">
            <div className="flex items-start gap-4">
              <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-slate-200">Horaires d'accueil</p>
                <p className="text-slate-400">Lun - Ven: 08h30 - 17h30</p>
                <p className="text-slate-400">Sam: 09h00 - 12h00</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-slate-200">Information</p>
                <p className="text-slate-400 italic">Fermé les jours fériés nationaux</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-20 pt-10 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8 text-xs font-bold text-slate-500 uppercase tracking-widest">
        <p>&copy; {new Date().getFullYear()} PermisSuivi - Ministère des Transports. Tous droits réservés.</p>
        <div className="flex items-center gap-8">
          <a href="#" className="hover:text-blue-400 transition-colors">Confidentialité</a>
          <a href="#" className="hover:text-blue-400 transition-colors">Mentions Légales</a>
          <a href="#" className="hover:text-blue-400 transition-colors">Cookies</a>
        </div>
      </div>
    </div>
  </footer>
));

// --- PAGES ---

const UserHome = () => {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    navigate(`/track/${code.trim()}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <main>
        {/* Dynamic Background Pattern */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden h-[800px] z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[800px] bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.05)_0%,transparent_50%)]" />
          <svg className="absolute top-0 left-0 w-full h-full opacity-[0.03]" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        {/* Hero Section */}
        <section className="relative pt-20 pb-32 md:pt-32 md:pb-48 px-4 z-10">
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-2xl shadow-sm mb-10"
            >
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Service Officiel de l'Administration</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-8xl font-black text-slate-900 mb-8 tracking-[-0.04em] leading-[0.9] font-display"
            >
              Votre permis est <br />
              <span className="text-blue-600 relative inline-block">
                en route.
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-blue-100 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q25 0 50 5 T100 5" stroke="currentColor" strokeWidth="10" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-slate-500 text-lg md:text-2xl mb-16 max-w-2xl mx-auto leading-relaxed font-medium"
            >
              Suivez chaque étape de la fabrication à la livraison. <br className="hidden md:block" />
              La transparence d'un service public nouvelle génération.
            </motion.p>

            <motion.form 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              onSubmit={handleSearch}
              className="relative max-w-2xl mx-auto"
            >
              <div className="bg-white p-3 rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col md:flex-row gap-3">
                <div className="flex-grow relative group">
                  <FileSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input 
                    type="text" 
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Saisissez votre code de suivi (ex: PR-2024-882)..."
                    className="w-full bg-slate-50 border-none rounded-2xl py-5 pl-16 pr-6 text-slate-900 focus:ring-0 text-lg font-bold placeholder:text-slate-300 transition-all placeholder:font-medium"
                  />
                </div>
                <button 
                  type="submit"
                  className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95 flex items-center justify-center gap-3 group"
                >
                  Suivre mon dossier
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-8 opacity-40 grayscale hover:opacity-80 hover:grayscale-0 transition-all duration-500">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <ShieldCheck className="w-4 h-4 text-blue-600" /> Sécurité 256-bit
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <Clock className="w-4 h-4 text-blue-600" /> Temps réel
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" /> Source Officielle
                </div>
              </div>
            </motion.form>
          </div>
        </section>

        {/* Dynamic Bento Grid Showcase */}
        <section className="py-24 bg-slate-50 border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-[240px] gap-8">
              {/* Main Visual Feature */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="md:col-span-8 md:row-span-2 bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden relative group p-12 flex flex-col justify-between"
              >
                <div className="relative z-10 max-w-sm">
                  <span className="text-blue-600 font-bold uppercase tracking-widest text-xs mb-4 block">Innovation</span>
                  <h3 className="text-4xl font-black text-slate-900 font-display mb-6 leading-none">Une interface pensée pour la clarté.</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    Nous avons supprimé le superflu pour vous offrir une expérience de consultation pure, rapide et fiable sur tous vos appareils.
                  </p>
                </div>
                <div className="absolute right-0 bottom-0 w-2/3 h-full pointer-events-none translate-x-32 translate-y-32 group-hover:translate-x-24 group-hover:translate-y-24 transition-transform duration-700">
                  <div className="w-full h-full bg-blue-50/50 rounded-full blur-3xl" />
                  <img 
                    src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=1000" 
                    alt="Process Dashboard" 
                    className="absolute top-0 right-0 w-full h-full object-cover rounded-[100px] shadow-2xl skew-x-12 opacity-80"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
              </motion.div>

              {/* Smaller Stat Feature */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="md:col-span-4 bg-blue-600 rounded-[40px] p-10 text-white flex flex-col justify-between relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-700">
                  <Star className="w-24 h-24" />
                </div>
                <h4 className="text-5xl font-black font-display leading-[0.8] mb-4">98%</h4>
                <p className="text-blue-100 font-bold uppercase tracking-widest text-[10px]">Taux de satisfaction usagers</p>
                <div className="mt-8 flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-4 border-blue-600 bg-slate-100 overflow-hidden shadow-sm">
                      <img src={`https://picsum.photos/seed/${i + 10}/100/100`} alt="avatar" />
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full border-4 border-blue-600 bg-white flex items-center justify-center text-[10px] font-black text-blue-600">
                    +2K
                  </div>
                </div>
              </motion.div>

              {/* Icon Info Feature */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="md:col-span-4 bg-white rounded-[40px] border border-slate-200 shadow-sm p-10 flex flex-col justify-center"
              >
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">Authenticité</h4>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">Vérification instantanée auprès des autorités compétentes.</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section className="py-24 md:py-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-24">
              <span className="text-blue-600 font-bold uppercase tracking-[0.4em] text-xs mb-6 block">Engagement</span>
              <h2 className="text-4xl md:text-6xl font-black text-slate-900 font-display leading-[0.9]">
                Le futur de votre <br />
                administratif est ici.
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-20">
              <div className="space-y-8">
                <div className="w-16 h-16 bg-blue-50 rounded-[20px] flex items-center justify-center text-blue-600">
                  <Smartphone className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Mobilité totale</h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Consultez l'avancement de votre dossier n'importe où, n'importe quand. Notre site s'adapte parfaitement à votre smartphone.
                </p>
              </div>

              <div className="space-y-8">
                <div className="w-16 h-16 bg-indigo-50 rounded-[20px] flex items-center justify-center text-indigo-600">
                  <MessagesSquare className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Support intégré</h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Une question sur votre statut ? Nos agents peuvent laisser des commentaires détaillés pour vous guider dans vos démarches.
                </p>
              </div>

              <div className="space-y-8">
                <div className="w-16 h-16 bg-emerald-50 rounded-[20px] flex items-center justify-center text-emerald-600">
                  <Zap className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Vitesse éclair</h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Aucun compte à créer. Pas de formulaire complexe. Juste votre code, et l'information dont vous avez besoin.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Branding Section */}
        <section className="px-4 pb-24">
          <div className="max-w-7xl mx-auto">
            <div className="bg-slate-900 rounded-[60px] p-12 md:p-24 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M0 0 L100 100 M100 0 L0 100" stroke="white" strokeWidth="0.1" />
                </svg>
              </div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative z-10"
              >
                <h2 className="text-4xl md:text-7xl font-black text-white font-display mb-10 leading-[0.9]">
                  Prêt à prendre <br className="hidden md:block" /> la route ?
                </h2>
                <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                  <button 
                    onClick={() => {
                      const searchInput = document.querySelector('input');
                      searchInput?.focus();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="bg-white text-slate-900 px-12 py-6 rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-blue-50 transition-all shadow-2xl active:scale-95"
                  >
                    Vérifier mon dossier maintenant
                  </button>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                    ou consultez nos <a href="#" className="text-white hover:text-blue-400 underline underline-offset-4">mentions légales</a>
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

const TrackingResultPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<Application | null>(null);
  const [error, setError] = useState("");

  const steps = [
    "Dossier reçu",
    "En cours de traitement",
    "Validé",
    "Permis disponible"
  ];

  const currentStepIndex = result ? steps.indexOf(result.status) : -1;
  // If status is not in the main steps (like "Rejeté" or "En attente"), we handle it differently
  const isSpecialStatus = result && !steps.includes(result.status);

  useEffect(() => {
    const fetchResult = async () => {
      if (!code) return;
      setLoading(true);
      setError("");
      setResult(null);
      try {
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/track/${code}?t=${timestamp}`, {
          cache: "no-store",
          headers: {
            "Pragma": "no-cache",
            "Cache-Control": "no-cache"
          }
        });
        if (!response.ok) {
          throw new Error(response.status === 404 ? "Dossier non trouvé. Vérifiez votre code." : "Une erreur est survenue.");
        }
        const data = await response.json();
        setResult(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <FileText className="absolute inset-0 m-auto w-8 h-8 text-blue-600 animate-pulse" />
        </div>
        <p className="mt-6 text-slate-400 font-bold tracking-widest uppercase text-xs">Sécurisation de la connexion...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <main className="flex-grow py-8 md:py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
            <button 
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-all group px-4 py-2 rounded-xl hover:bg-blue-50 w-fit"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Retour
            </button>
            
            {result && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Système de suivi en direct</span>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {error ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border border-slate-200 rounded-[40px] p-12 md:p-20 text-center shadow-2xl shadow-slate-200/50 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
                <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
                  <AlertCircle className="w-12 h-12 text-red-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 font-display">Dossier Introuvable</h2>
                <p className="text-slate-500 mb-10 max-w-md mx-auto text-lg leading-relaxed">{error}</p>
                <button 
                  onClick={() => navigate("/")}
                  className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-xl active:scale-95"
                >
                  Nouvelle recherche
                </button>
              </motion.div>
            ) : result && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Main Identity Header */}
                <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/60 border border-slate-200 overflow-hidden">
                  <div className="grid grid-cols-1 lg:grid-cols-12">
                    {/* Left: Identity Photo */}
                    <div className="lg:col-span-4 bg-slate-50 p-8 md:p-12 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-200">
                      <div className="relative group">
                        <div className="w-48 h-64 md:w-56 md:h-72 rounded-[32px] overflow-hidden bg-white border-8 border-white shadow-2xl relative z-10">
                          {result.photo_url ? (
                            <img 
                              src={result.photo_url} 
                              alt="Identité" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-200">
                              <UserCircle className="w-24 h-24" />
                            </div>
                          )}
                        </div>
                        <div className="absolute -inset-4 bg-blue-600/5 rounded-[40px] blur-2xl -z-0" />
                      </div>
                      <div className="mt-8 text-center">
                        <h2 className="text-2xl font-black text-slate-900 font-display uppercase tracking-tight">
                          {result.first_name} {result.last_name}
                        </h2>
                        <div className="inline-flex items-center gap-2 mt-2 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-100">
                          <CreditCard className="w-3 h-3" />
                          Catégorie {result.license_category || "B"}
                        </div>
                      </div>
                    </div>

                    {/* Right: Status & Progress */}
                    <div className="lg:col-span-8 p-8 md:p-12 flex flex-col justify-between">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Référence du dossier</span>
                          <div className="flex items-center gap-3">
                            <h3 className="text-4xl font-black text-slate-900 font-display">{result.tracking_code}</h3>
                            <div className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500 uppercase">Officiel</div>
                          </div>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 rounded-3xl border border-slate-100 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-600">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mise à jour</p>
                            <p className="text-sm font-bold text-slate-700">
                              {format(new Date(result.last_updated), "d MMMM yyyy", { locale: fr })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Progress Stepper */}
                      <div className="relative py-8">
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 hidden md:block" />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
                          {steps.map((step, idx) => {
                            const isCompleted = !isSpecialStatus && idx <= currentStepIndex;
                            const isCurrent = !isSpecialStatus && idx === currentStepIndex;
                            
                            return (
                              <div key={step} className="flex flex-col items-center md:items-start text-center md:text-left group">
                                <div className={cn(
                                  "w-10 h-10 rounded-full flex items-center justify-center mb-4 transition-all duration-500 border-4",
                                  isCompleted ? "bg-blue-600 border-blue-100 text-white scale-110 shadow-lg shadow-blue-200" : 
                                  "bg-white border-slate-100 text-slate-300"
                                )}>
                                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                                </div>
                                <p className={cn(
                                  "text-[10px] font-bold uppercase tracking-wider leading-tight max-w-[100px]",
                                  isCurrent ? "text-blue-600" : isCompleted ? "text-slate-900" : "text-slate-400"
                                )}>
                                  {step}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Current Status Badge (Mobile/Special) */}
                      {(isSpecialStatus || true) && (
                        <div className="mt-12 p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                              result.status === "Validé" || result.status === "Permis disponible" ? "bg-emerald-600 text-white shadow-emerald-200" :
                              result.status === "Rejeté" ? "bg-red-600 text-white shadow-red-200" :
                              "bg-blue-600 text-white shadow-blue-200"
                            )}>
                              {result.status === "Validé" || result.status === "Permis disponible" ? <CheckCircle2 className="w-7 h-7" /> : 
                               result.status === "Rejeté" ? <AlertCircle className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Statut Actuel</p>
                              <h4 className="text-xl font-black text-slate-900">{result.status}</h4>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium italic bg-white px-4 py-2 rounded-xl border border-slate-100">
                            <Info className="w-4 h-4" />
                            Dossier en cours de validité légale
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Personal Info */}
                  <div className="lg:col-span-2 bg-white rounded-[40px] p-8 md:p-12 shadow-xl border border-slate-200 space-y-10">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                        <User className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 font-display">Informations Personnelles</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="group">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nom Complet</p>
                          <p className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{result.first_name} {result.last_name}</p>
                        </div>
                        <div className="group">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Contact Téléphonique</p>
                          <p className="text-lg font-bold text-slate-900">{result.phone || "Non renseigné"}</p>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="group">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Lieu de Résidence</p>
                          <p className="text-lg font-bold text-slate-900 leading-snug">{result.address || "Non renseignée"}</p>
                        </div>
                        <div className="group">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Type de Demande</p>
                          <p className="text-lg font-bold text-slate-900">Nouveau Permis de Conduire</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-10 border-t border-slate-100">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                          <Info className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-slate-900 uppercase text-xs tracking-widest">Note de l'administration</h4>
                      </div>
                      <div className="bg-blue-50/50 rounded-3xl p-8 border border-blue-100 relative">
                        <div className="absolute -top-3 -left-3 text-blue-200">
                          <FileText className="w-10 h-10" />
                        </div>
                        <p className="text-slate-700 font-medium leading-relaxed italic relative z-10">
                          "{result.comment || "Votre dossier est actuellement en cours d'examen par nos services techniques. Aucune action supplémentaire n'est requise de votre part pour le moment."}"
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ID Document Preview */}
                  <div className="bg-slate-900 rounded-[40px] p-8 md:p-10 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20 -mr-32 -mt-32" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black text-white font-display">Pièce d'Identité</h3>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed mb-8">
                        Document de référence utilisé pour la validation de votre identité civile.
                      </p>
                    </div>

                    <div className="relative z-10">
                      <div className="aspect-[1.6/1] rounded-3xl overflow-hidden bg-white/5 border border-white/10 shadow-2xl group relative">
                        {result.id_card_url ? (
                          <img 
                            src={result.id_card_url} 
                            alt="ID Card" 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-white/10">
                            <ImageIcon className="w-12 h-12 mb-2" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Non disponible</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-white text-slate-900 px-6 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2">
                            <Search className="w-4 h-4" />
                            Agrandir
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 flex items-center justify-between text-white/40 text-[10px] font-bold uppercase tracking-widest">
                        <span>Document vérifié</span>
                        <div className="flex gap-1">
                          <div className="w-1 h-1 rounded-full bg-emerald-500" />
                          <div className="w-1 h-1 rounded-full bg-emerald-500" />
                          <div className="w-1 h-1 rounded-full bg-emerald-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="bg-white rounded-[32px] p-8 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Info className="w-5 h-5" />
                    </div>
                    <p className="text-sm text-slate-500 font-medium">
                      Besoin d'aide ? Contactez notre support.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        alert("Lien de suivi copié dans le presse-papier !");
                      }}
                      className="flex items-center justify-center gap-2 text-slate-600 font-bold hover:bg-slate-100 px-6 py-3 rounded-2xl transition-all border border-slate-200"
                    >
                      <Search className="w-5 h-5" />
                      Copier le lien
                    </button>
                    <button 
                      onClick={() => window.print()}
                      className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold hover:bg-blue-700 px-6 py-3 rounded-2xl transition-all shadow-lg shadow-blue-200"
                    >
                      <FileText className="w-5 h-5" />
                      Imprimer
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

const AdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: username.trim(), 
          password: password.trim() 
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Identifiants invalides");
      }

      const { token } = await response.json();
      localStorage.setItem("admin_token", token);
      navigate("/admin/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl w-full bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row relative z-10"
      >
        {/* Left Side: Image/Branding */}
        <div className="hidden md:block md:w-1/2 relative">
          <img 
            src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=1000" 
            alt="Office background" 
            className="absolute inset-0 w-full h-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-blue-600/90 mix-blend-multiply" />
          <div className="absolute inset-0 p-12 flex flex-col justify-between text-white">
            <div>
              <div className="flex items-center gap-2 mb-8">
                <FileText className="w-8 h-8" />
                <span className="font-bold text-2xl tracking-tight">PermisSuivi</span>
              </div>
              <h2 className="text-4xl font-bold leading-tight mb-6">Gestion administrative simplifiée.</h2>
              <p className="text-blue-100 text-lg">Accédez à l'interface de gestion pour mettre à jour les dossiers et informer les usagers en temps réel.</p>
            </div>
            <div className="flex items-center gap-4 text-sm text-blue-200">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <img 
                    key={i}
                    src={`https://picsum.photos/seed/user${i}/100/100`} 
                    className="w-8 h-8 rounded-full border-2 border-blue-600"
                    alt="User"
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
              <span>Rejoint par +500 agents</span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-1/2 p-8 md:p-16">
          <div className="mb-10">
            <div className="md:hidden flex items-center gap-2 mb-6">
              <div className="bg-blue-600 p-2 rounded-lg">
                <FileText className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-xl text-slate-900 tracking-tight">PermisSuivi</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Bon retour.</h2>
            <p className="text-slate-500">Veuillez entrer vos identifiants pour continuer.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium border border-red-100 flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </motion.div>
            )}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Identifiant</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Mot de passe</label>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-blue-200 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Se connecter"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

const AdminDashboard = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ database: string, isPostgres: boolean, dbConnected: boolean, dbError: string | null } | null>(null);
  const [editingApp, setEditingApp] = useState<Partial<Application> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchStatus = async () => {
    const token = localStorage.getItem("admin_token");
    try {
      const response = await fetch("/api/admin/status", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch status");
    }
  };

  const fetchApps = async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) return navigate("/admin");

    try {
      const response = await fetch("/api/admin/applications", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("admin_token");
        return navigate("/admin");
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erreur serveur");
      }
      
      const data = await response.json();
      setApps(data);
    } catch (err: any) {
      console.error("Fetch apps error:", err);
      // Don't redirect on generic server errors (like DB down)
      // Only redirect on auth errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
    fetchStatus();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("admin_token");
    const method = editingApp?.id ? "PUT" : "POST";
    const url = editingApp?.id ? `/api/admin/applications/${editingApp.id}` : "/api/admin/applications";

    try {
      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(editingApp),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erreur lors de l'enregistrement");
      }

      setIsModalOpen(false);
      setEditingApp(null);
      fetchApps();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEdit = async (app: Application) => {
    const token = localStorage.getItem("admin_token");
    try {
      const response = await fetch(`/api/admin/applications/${app.id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const fullApp = await response.json();
        setEditingApp(fullApp);
        setIsModalOpen(true);
      }
    } catch (err) {
      alert("Erreur lors du chargement des détails");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce dossier ?")) return;
    const token = localStorage.getItem("admin_token");

    try {
      await fetch(`/api/admin/applications/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      fetchApps();
    } catch (err) {
      alert("Erreur lors de la suppression");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin");
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'photo_url' | 'id_card_url') => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setEditingApp({ ...editingApp, [field]: base64 });
      } catch (err) {
        alert("Erreur lors de la lecture du fichier");
      }
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold text-slate-900 font-display tracking-tight">Tableau de Bord</h1>
            <div className="flex items-center gap-3">
              <p className="text-slate-500 font-medium">Gestion centralisée des dossiers</p>
              {status && (
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                    status.isPostgres ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                  )}>
                    Stockage : {status.database}
                  </div>
                  {!status.dbConnected && (
                    <div className="flex flex-col gap-2">
                      <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Base de données suspendue
                      </div>
                      
                      {status.dbError && (
                        <div className="bg-white border-2 border-red-200 p-6 rounded-[32px] flex flex-col gap-4 max-w-lg shadow-xl animate-in zoom-in-95 duration-300">
                          <div className="flex items-center gap-3 text-red-600">
                            <div className="bg-red-100 p-2 rounded-xl">
                              <AlertCircle className="w-6 h-6" />
                            </div>
                            <h3 className="font-black text-lg font-display">Action requise sur votre base de données</h3>
                          </div>
                          
                          <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-red-800 text-sm font-medium leading-relaxed">
                            {status.dbError}
                          </div>

                          <div className="space-y-4">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Étapes pour réparer :</p>
                            <div className="grid grid-cols-1 gap-2">
                              {[
                                { t: "Allez sur votre tableau de bord Render", c: "dashboard.render.com" },
                                { t: "Cliquez sur votre base de données", c: "ma_base_permis2" },
                                { t: "Cliquez sur le bouton 'Connect'", c: "En haut à droite" },
                                { t: "Choisissez l'onglet 'External Connection'", c: "IMPORTANT" },
                                { t: "Copiez le lien (External Connection String)", c: "Commence par postgresql://" }
                              ].map((step, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                  <span className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black">{i+1}</span>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-700">{step.t}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">{step.c}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-4 mt-2 border-t border-slate-100">
                            <p className="text-[11px] text-slate-500 leading-relaxed italic">
                              Une fois copié, cliquez sur <b>⚙️ Settings</b> dans cet éditeur (à gauche), cherchez <b>DATABASE_URL</b> et collez le nouveau lien.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setEditingApp({ status: STATUS_OPTIONS[0] }); setIsModalOpen(true); }}
              className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95"
            >
              <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Nouveau Dossier</span><span className="sm:hidden">Ajouter</span>
            </button>
            <button 
              onClick={handleLogout}
              className="bg-white text-slate-600 p-3.5 md:px-6 md:py-3.5 rounded-2xl font-bold border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
              title="Déconnexion"
            >
              <LogOut className="w-5 h-5" /> <span className="hidden md:inline">Déconnexion</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Code</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Usager</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Téléphone</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Statut</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Mise à Jour</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {apps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-900 font-display">{app.tracking_code}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{app.first_name} {app.last_name}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{app.phone || "-"}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold",
                        app.status === "Validé" || app.status === "Permis disponible" ? "bg-emerald-100 text-emerald-700" :
                        app.status === "Rejeté" ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-blue-700"
                      )}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {format(new Date(app.last_updated), "dd/MM/yyyy HH:mm")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(app)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(app.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100">
            {apps.map((app) => (
              <div key={app.id} className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg text-slate-900 font-display">{app.tracking_code}</span>
                  <span className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    app.status === "Validé" || app.status === "Permis disponible" ? "bg-emerald-100 text-emerald-700" :
                    app.status === "Rejeté" ? "bg-red-100 text-red-700" :
                    "bg-blue-100 text-blue-700"
                  )}>
                    {app.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">{app.first_name} {app.last_name}</span>
                  <span className="text-slate-400">{format(new Date(app.last_updated), "dd/MM/yy")}</span>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button 
                    onClick={() => handleEdit(app)}
                    className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" /> Modifier
                  </button>
                  <button 
                    onClick={() => handleDelete(app.id)}
                    className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>

          {apps.length === 0 && (
            <div className="px-6 py-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-slate-200" />
              </div>
              <p className="text-slate-400 italic font-medium">Aucun dossier enregistré pour le moment.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white md:rounded-3xl shadow-2xl overflow-hidden h-full md:h-auto flex flex-col"
            >
              <div className="bg-slate-50 px-6 md:px-8 py-6 border-b border-slate-200 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-slate-900 font-display">
                  {editingApp?.id ? "Modifier le Dossier" : "Nouveau Dossier"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-xl transition-colors">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Code de Suivi</label>
                    <input 
                      type="text" 
                      required
                      value={editingApp?.tracking_code || ""}
                      onChange={(e) => setEditingApp({ ...editingApp, tracking_code: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Ex: FR-2024-001"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Statut</label>
                    <select 
                      value={editingApp?.status || ""}
                      onChange={(e) => setEditingApp({ ...editingApp, status: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                    >
                      {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Prénom</label>
                    <input 
                      type="text" 
                      value={editingApp?.first_name || ""}
                      onChange={(e) => setEditingApp({ ...editingApp, first_name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Prénom de l'usager"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nom</label>
                    <input 
                      type="text" 
                      value={editingApp?.last_name || ""}
                      onChange={(e) => setEditingApp({ ...editingApp, last_name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Nom de l'usager"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Téléphone</label>
                    <input 
                      type="text" 
                      value={editingApp?.phone || ""}
                      onChange={(e) => setEditingApp({ ...editingApp, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Ex: +225 0102030405"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Catégorie Permis</label>
                    <input 
                      type="text" 
                      value={editingApp?.license_category || ""}
                      onChange={(e) => setEditingApp({ ...editingApp, license_category: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Ex: B, BC, D..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Adresse</label>
                    <input 
                      type="text" 
                      value={editingApp?.address || ""}
                      onChange={(e) => setEditingApp({ ...editingApp, address: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Adresse complète de résidence"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Photo de l'usager (Depuis l'appareil)</label>
                    <div className="space-y-3">
                      {editingApp?.photo_url && (
                        <div className="w-20 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                          <img src={editingApp.photo_url} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'photo_url')}
                        className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Pièce d'Identité (Depuis l'appareil)</label>
                    <div className="space-y-3">
                      {editingApp?.id_card_url && (
                        <div className="w-32 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                          <img src={editingApp.id_card_url} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'id_card_url')}
                        className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Commentaire Administration</label>
                  <textarea 
                    rows={4}
                    value={editingApp?.comment || ""}
                    onChange={(e) => setEditingApp({ ...editingApp, comment: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                    placeholder="Détails sur l'avancement du dossier..."
                  />
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="order-2 sm:order-1 px-8 py-3.5 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all text-center"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="order-1 sm:order-2 bg-blue-600 text-white px-10 py-3.5 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95 text-center"
                  >
                    Enregistrer le Dossier
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white font-sans text-slate-900">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={
            <>
              <Header />
              <UserHome />
              <Footer />
            </>
          } />

          <Route path="/track/:code" element={
            <>
              <Header />
              <TrackingResultPage />
              <Footer />
            </>
          } />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <>
              <Header />
              <AdminLogin />
              <Footer />
            </>
          } />
          
          <Route path="/admin/dashboard" element={<AdminDashboard />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

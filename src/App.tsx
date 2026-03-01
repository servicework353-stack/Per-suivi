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
  ArrowLeft
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

const Header = () => (
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
);

const Footer = () => (
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
);

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
    <div className="min-h-[calc(100vh-64px)] flex flex-col">
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative bg-blue-600 py-16 md:py-32 px-4 overflow-hidden">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=2000" 
              alt="Driving background" 
              className="w-full h-full object-cover opacity-20 scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-blue-600/90 via-blue-600/70 to-blue-900/95" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-blue-100 text-xs md:text-sm font-semibold mb-8 border border-white/20 shadow-xl"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Service Officiel de l'État
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-7xl font-extrabold text-white mb-6 tracking-tight leading-[1.1] font-display"
            >
              Votre permis,<br className="hidden md:block" /> suivez son évolution.
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-blue-100 text-base md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed opacity-90"
            >
              Entrez votre code de suivi unique pour connaître l'état d'avancement de votre dossier en quelques secondes.
            </motion.p>

            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onSubmit={handleSearch}
              className="relative max-w-xl mx-auto group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-3xl blur opacity-25 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors hidden md:block">
                  <FileText className="w-6 h-6" />
                </div>
                <input 
                  type="text" 
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Entrez votre code de suivi..."
                  className="w-full bg-white rounded-2xl md:rounded-3xl py-5 md:py-6 pl-7 md:pl-16 pr-16 text-slate-900 shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-400/50 transition-all text-base md:text-xl font-medium placeholder:text-slate-400"
                />
                <button 
                  type="submit"
                  className="absolute right-2.5 top-2.5 bottom-2.5 bg-blue-600 text-white px-5 md:px-8 rounded-xl md:rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95 group/btn"
                >
                  <div className="flex items-center gap-2">
                    <span className="hidden md:inline font-bold">Rechercher</span>
                    <Search className="w-6 h-6 group-hover/btn:scale-110 transition-transform" />
                  </div>
                </button>
              </div>
            </motion.form>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 md:py-32 bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -ml-32 -mb-32" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 font-display">Un service pensé pour vous</h2>
              <p className="text-slate-500 max-w-2xl mx-auto text-lg">Nous mettons tout en œuvre pour simplifier vos démarches et vous offrir une visibilité totale sur votre dossier.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center group"
              >
                <div className="relative mb-8">
                  <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-500 shadow-sm border border-blue-100 relative z-10">
                    <Clock className="w-12 h-12 text-blue-600" />
                  </div>
                  <div className="absolute inset-0 bg-blue-200 rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4 font-display">Temps Réel</h3>
                <p className="text-slate-600 leading-relaxed">Accédez instantanément aux dernières mises à jour de votre dossier effectuées par nos services.</p>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-center group"
              >
                <div className="relative mb-8">
                  <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-500 shadow-sm border border-emerald-100 relative z-10">
                    <ShieldCheck className="w-12 h-12 text-emerald-600" />
                  </div>
                  <div className="absolute inset-0 bg-emerald-200 rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4 font-display">Sécurisé</h3>
                <p className="text-slate-600 leading-relaxed">Vos données sont protégées et accessibles uniquement via votre code de suivi personnel unique.</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-center group"
              >
                <div className="relative mb-8">
                  <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-500 shadow-sm border border-indigo-100 relative z-10">
                    <Info className="w-12 h-12 text-indigo-600" />
                  </div>
                  <div className="absolute inset-0 bg-indigo-200 rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4 font-display">Transparence</h3>
                <p className="text-slate-600 leading-relaxed">Consultez les commentaires détaillés de l'administration pour comprendre chaque étape de votre demande.</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Visual Showcase Section */}
        <section className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-8"
              >
                <span className="text-blue-600 font-bold uppercase tracking-[0.2em] text-sm">Modernisation</span>
                <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 font-display leading-tight">Une interface fluide pour un suivi sans stress</h2>
                <p className="text-slate-600 text-lg leading-relaxed">
                  Fini les appels interminables et les déplacements inutiles. Notre plateforme centralise toutes les informations relatives à votre permis de conduire.
                </p>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="text-3xl font-bold text-blue-600 mb-2">24/7</div>
                    <div className="text-sm text-slate-500 font-bold uppercase tracking-wider">Disponibilité</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="text-3xl font-bold text-emerald-600 mb-2">100%</div>
                    <div className="text-sm text-slate-500 font-bold uppercase tracking-wider">Digital</div>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="absolute -inset-4 bg-blue-600/10 rounded-[40px] blur-2xl" />
                <div className="relative rounded-[32px] overflow-hidden shadow-2xl border-8 border-white">
                  <img 
                    src="https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=1000" 
                    alt="Modern driving" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                {/* Floating Badge */}
                <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-xl border border-slate-100 max-w-[200px] hidden md:block">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">En Direct</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 leading-snug">Mises à jour quotidiennes des dossiers</p>
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

  useEffect(() => {
    const fetchResult = async () => {
      if (!code) return;
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/track/${code}`);
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
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-bold animate-pulse">Recherche de votre dossier...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-grow py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold mb-8 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Retour à l'accueil
          </button>

          <AnimatePresence mode="wait">
            {error ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-red-100 rounded-[32px] p-12 text-center shadow-xl"
              >
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Oups !</h2>
                <p className="text-slate-500 mb-8">{error}</p>
                <button 
                  onClick={() => navigate("/")}
                  className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  Réessayer
                </button>
              </motion.div>
            ) : result && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Result Card */}
                <div className="bg-white border border-slate-200 rounded-[32px] shadow-2xl overflow-hidden">
                  <div className="bg-slate-900 px-6 md:px-10 py-12 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[120px] opacity-20 -mr-48 -mt-48" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                      <div className="space-y-3">
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em]">Code de suivi officiel</span>
                        <h2 className="text-5xl font-black font-display tracking-tight">{result.tracking_code}</h2>
                      </div>
                      <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
                        <Calendar className="w-6 h-6 text-blue-400" />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dernière mise à jour</span>
                          <span className="text-base font-bold">
                            {format(new Date(result.last_updated), "d MMMM yyyy", { locale: fr })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
                      <div className="space-y-12">
                        <div className="relative pl-16">
                          <div className="absolute left-0 top-0 w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                            <User className="w-6 h-6 text-blue-600" />
                          </div>
                          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Bénéficiaire</h3>
                          <p className="text-3xl font-extrabold text-slate-900 font-display">
                            {result.first_name} {result.last_name}
                          </p>
                        </div>

                        <div className="relative pl-16">
                          <div className="absolute left-0 top-0 w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                            <Clock className="w-6 h-6 text-blue-600" />
                          </div>
                          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">État d'avancement</h3>
                          <div className={cn(
                            "inline-flex items-center gap-3 px-6 py-3 rounded-2xl text-lg font-black shadow-sm border",
                            result.status === "Validé" || result.status === "Permis disponible" ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" :
                            result.status === "Rejeté" ? "bg-red-50 text-red-700 border-red-200/50" :
                            "bg-blue-50 text-blue-700 border-blue-200/50"
                          )}>
                            {result.status === "Validé" || result.status === "Permis disponible" ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                            {result.status}
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-[32px] p-8 md:p-10 border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                          <FileText className="w-24 h-24 text-slate-900" />
                        </div>
                        <div className="relative z-10">
                          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Note de l'administration
                          </h3>
                          <p className="text-slate-700 leading-relaxed text-lg font-medium italic">
                            "{result.comment || "Aucun commentaire particulier pour le moment. Votre dossier suit son cours normal."}"
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative Image Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="rounded-[32px] overflow-hidden h-80 shadow-2xl group">
                    <img 
                      src="https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&q=80&w=1000" 
                      alt="Safe driving" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="rounded-[32px] overflow-hidden h-80 shadow-2xl group">
                    <img 
                      src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=1000" 
                      alt="Road trip" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
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
  const [status, setStatus] = useState<{ database: string, isPostgres: boolean } | null>(null);
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
      if (!response.ok) throw new Error();
      const data = await response.json();
      setApps(data);
    } catch (err) {
      localStorage.removeItem("admin_token");
      navigate("/admin");
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
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                  status.isPostgres ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                )}>
                  Stockage : {status.database}
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
                          onClick={() => { setEditingApp(app); setIsModalOpen(true); }}
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
                    onClick={() => { setEditingApp(app); setIsModalOpen(true); }}
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

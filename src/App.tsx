/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Scan, ShieldCheck, Info, Loader2, History as HistoryIcon, Trash2, ChevronRight, Users, Plus, User, AlertTriangle } from 'lucide-react';
import { ImageScanner } from './components/ImageScanner';
import { AnalysisResults } from './components/AnalysisResults';
import { analyzeIngredients, IngredientAnalysis, FamilyProfile } from './services/gemini';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<IngredientAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<IngredientAnalysis[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);
  const [scanCache, setScanCache] = useState<Record<string, IngredientAnalysis>>({});
  const [profiles, setProfiles] = useState<FamilyProfile[]>([]);
  const [lastInput, setLastInput] = useState<{ base64Image?: string; manualText?: string } | null>(null);
  
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load data from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('ingredient_scout_history');
    if (savedHistory) try { setHistory(JSON.parse(savedHistory)); } catch (e) {}
    
    const savedCache = localStorage.getItem('ingredient_scout_cache');
    if (savedCache) try { setScanCache(JSON.parse(savedCache)); } catch (e) {}

    const savedProfiles = localStorage.getItem('ingredient_scout_profiles');
    if (savedProfiles) try { setProfiles(JSON.parse(savedProfiles)); } catch (e) {}
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('ingredient_scout_history', JSON.stringify(history));
    localStorage.setItem('ingredient_scout_cache', JSON.stringify(scanCache));
    localStorage.setItem('ingredient_scout_profiles', JSON.stringify(profiles));
  }, [history, scanCache, profiles]);

  // Auto-scroll to results when analysis is ready
  useEffect(() => {
    if (analysis && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [analysis]);

  const handleAnalysis = async (input: { base64Image?: string; manualText?: string }, isAutoUpdate = false) => {
    const cacheKey = input.base64Image 
      ? input.base64Image.substring(0, 1000) 
      : input.manualText?.substring(0, 100);

    if (cacheKey && scanCache[cacheKey] && !isAutoUpdate) {
      setAnalysis(scanCache[cacheKey]);
      setShowHistory(false);
      return;
    }

    setIsProcessing(true);
    setError(null);
    if (!isAutoUpdate) setAnalysis(null);
    setLastInput(input);
    
    try {
      const result = await analyzeIngredients(input, profiles);
      setAnalysis(result);
      
      if (cacheKey) {
        setScanCache(prev => ({ ...prev, [cacheKey]: result }));
      }
      
      setHistory(prev => {
        const filtered = prev.filter(item => item.productName !== result.productName);
        return [result, ...filtered.slice(0, 19)];
      });
      if (!isAutoUpdate) setShowHistory(false);
    } catch (err) {
      console.error(err);
      if (!isAutoUpdate) setError("Failed to analyze ingredients. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-update analysis when profiles change
  useEffect(() => {
    if (analysis && lastInput) {
      const timer = setTimeout(() => {
        handleAnalysis(lastInput, true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [profiles]);

  const addProfile = () => {
    const newProfile: FamilyProfile = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Member ${profiles.length + 1}`,
      ageGroup: "Adult",
      allergies: "",
      concerns: ""
    };
    setProfiles([...profiles, newProfile]);
  };

  const updateProfile = (id: string, updates: Partial<FamilyProfile>) => {
    setProfiles(profiles.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProfile = (id: string) => {
    setProfiles(profiles.filter(p => p.id !== id));
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear your scan history and cache?")) {
      setHistory([]);
      setScanCache({});
      localStorage.removeItem('ingredient_scout_history');
      localStorage.removeItem('ingredient_scout_cache');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setAnalysis(null); setShowHistory(false); }}>
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
              <ShieldCheck size={20} />
            </div>
            <h1 className="text-xl font-display font-bold text-slate-900 tracking-tight">
              Ingredient Scout
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowProfiles(!showProfiles)}
              className={cn(
                "p-2 rounded-lg transition-colors relative",
                showProfiles ? "bg-emerald-50 text-emerald-600" : "text-slate-500 hover:bg-slate-100"
              )}
            >
              <Users size={20} />
              {profiles.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-white">
                  {profiles.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                "p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium",
                showHistory ? "bg-emerald-50 text-emerald-600" : "text-slate-500 hover:bg-slate-100"
              )}
            >
              <HistoryIcon size={20} />
              <span className="hidden sm:inline">History</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-5xl mx-auto px-4 py-8 w-full">
        <AnimatePresence>
          {showProfiles && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-display font-bold flex items-center gap-2">
                    <Users className="text-emerald-600" />
                    Family Profiles
                  </h2>
                  <button 
                    onClick={addProfile}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors text-sm font-bold"
                  >
                    <Plus size={18} />
                    Add Member
                  </button>
                </div>

                {profiles.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <User size={48} className="mx-auto mb-2 opacity-20" />
                    <p>Add family members to get personalized safety alerts.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profiles.map(profile => (
                      <div key={profile.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between gap-4 w-full">
                          <div className="flex-grow">
                            <input 
                              value={profile.name}
                              onChange={(e) => updateProfile(profile.id, { name: e.target.value })}
                              className="bg-transparent font-display font-bold text-lg text-slate-900 focus:outline-none border-b-2 border-transparent focus:border-emerald-500 w-full py-1"
                              placeholder="Member Name"
                            />
                          </div>
                          <button onClick={() => deleteProfile(profile.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          {["Baby", "Kid", "Adult"].map(age => (
                            <button
                              key={age}
                              onClick={() => updateProfile(profile.id, { ageGroup: age as any })}
                              className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold transition-all",
                                profile.ageGroup === age ? "bg-emerald-600 text-white" : "bg-white text-slate-500 border border-slate-200"
                              )}
                            >
                              {age}
                            </button>
                          ))}
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Allergies</label>
                            <input 
                              placeholder="e.g. Peanuts, Milk, Soy"
                              value={profile.allergies}
                              onChange={(e) => updateProfile(profile.id, { allergies: e.target.value })}
                              className="w-full bg-white px-4 py-3 rounded-2xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Health Concerns</label>
                            <input 
                              placeholder="e.g. High Sugar, MSG, Red 40"
                              value={profile.concerns}
                              onChange={(e) => updateProfile(profile.id, { concerns: e.target.value })}
                              className="w-full bg-white px-4 py-3 rounded-2xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {showHistory ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-display font-bold text-slate-900">Scan History</h2>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1 font-medium"
                  >
                    <Trash2 size={16} />
                    Clear All
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                  <HistoryIcon size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-500">Your scan history is empty.</p>
                  <button 
                    onClick={() => setShowHistory(false)}
                    className="mt-4 text-emerald-600 font-bold"
                  >
                    Start Scanning
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {history.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setAnalysis(item);
                        setShowHistory(false);
                      }}
                      className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all text-left flex items-center justify-between group"
                    >
                      <div>
                        <h3 className="font-display font-bold text-slate-900">{item.productName}</h3>
                        <div className="flex gap-4 mt-2">
                          <span className="text-xs text-slate-500">
                            Babies: <span className="font-bold">{item.healthAnalysis.babies.riskLevel}</span>
                          </span>
                          <span className="text-xs text-slate-500">
                            Kids: <span className="font-bold">{item.healthAnalysis.kids.riskLevel}</span>
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Left Column: Scanner */}
              <div className="lg:col-span-5 space-y-8">
                <section>
                  <div className="mb-6">
                    <h2 className="text-3xl font-display font-bold text-slate-900">
                      Safety Check
                    </h2>
                    <p className="text-slate-500 mt-2">
                      Scan a label, select from gallery, or type ingredients manually.
                    </p>
                  </div>

                  <ImageScanner 
                    onImageCaptured={(base64) => handleAnalysis({ base64Image: base64 })}
                    onManualTextSubmit={(text) => handleAnalysis({ manualText: text })}
                    isProcessing={isProcessing} 
                  />
                </section>

                <section className="bg-emerald-900 rounded-[2rem] p-8 text-white shadow-xl shadow-emerald-900/20">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl">
                      <ShieldCheck size={32} className="text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-bold">Smart Protection</h3>
                      <p className="mt-2 text-emerald-100/70 text-sm leading-relaxed">
                        Our AI cross-references ingredients with global health databases to ensure your family's safety.
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column: Results */}
              <div className="lg:col-span-7 relative" ref={resultsRef}>
                <AnimatePresence>
                  {isProcessing && analysis && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute -top-4 right-0 z-10 flex items-center gap-2 text-[10px] uppercase tracking-wider text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 shadow-sm"
                    >
                      <Loader2 size={10} className="animate-spin" />
                      Refining Analysis...
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <AnimatePresence mode="wait">
                  {isProcessing ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border border-slate-100 shadow-sm"
                    >
                      <div className="relative">
                        <div className="w-20 h-20 border-4 border-emerald-100 rounded-full animate-pulse" />
                        <Loader2 className="absolute inset-0 m-auto text-emerald-600 animate-spin" size={40} />
                      </div>
                      <h3 className="mt-6 text-xl font-display font-bold text-slate-900">Analyzing Ingredients...</h3>
                      <p className="mt-2 text-slate-500 max-w-xs">
                        We're scanning for harmful chemicals and health risks across all age groups.
                      </p>
                    </motion.div>
                  ) : error ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-8 bg-red-50 border border-red-100 rounded-3xl text-center"
                    >
                      <p className="text-red-600 font-medium">{error}</p>
                      <button 
                        onClick={() => handleAnalysis({ base64Image: "" })}
                        className="mt-4 text-sm font-bold text-red-700 underline"
                      >
                        Try again
                      </button>
                    </motion.div>
                  ) : analysis ? (
                    <AnalysisResults key="results" analysis={analysis} />
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 rounded-3xl"
                    >
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-6">
                        <Scan size={32} />
                      </div>
                      <h3 className="text-xl font-display font-bold text-slate-900">Ready to Scan</h3>
                      <p className="mt-2 text-slate-500 max-w-xs">
                        Scan a label, select from gallery, or type ingredients manually to see the analysis here.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Ingredient Scout. For informational purposes only. Always consult a healthcare professional.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Helper for conditional classes
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

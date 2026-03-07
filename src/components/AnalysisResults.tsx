import React from 'react';
import { AlertCircle, CheckCircle2, Info, Baby, User, Users, Share2, ShieldAlert, ShieldCheck, HelpCircle, AlertTriangle } from 'lucide-react';
import { IngredientAnalysis } from '../services/gemini';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface AnalysisResultsProps {
  analysis: IngredientAnalysis;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ analysis }) => {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-red-600 bg-red-50 border-red-100';
      case 'Moderate': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'Low': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'bg-red-500';
      case 'Medium': return 'bg-amber-500';
      case 'Low': return 'bg-emerald-500';
      default: return 'bg-slate-500';
    }
  };

  const getIngredientScoreIcon = (score: string) => {
    switch (score) {
      case 'Safe': return <ShieldCheck className="text-emerald-500" size={16} />;
      case 'Unsafe': return <ShieldAlert className="text-red-500" size={16} />;
      case 'Issues': return <HelpCircle className="text-amber-500" size={16} />;
      default: return null;
    }
  };

  const getIngredientScoreBg = (score: string) => {
    switch (score) {
      case 'Safe': return 'bg-emerald-50 border-emerald-100';
      case 'Unsafe': return 'bg-red-50 border-red-100';
      case 'Issues': return 'bg-amber-50 border-amber-100';
      default: return 'bg-slate-50 border-slate-100';
    }
  };

  const handleShare = async () => {
    const shareText = `Ingredient Analysis for ${analysis.productName}:\n` +
      `Babies: ${analysis.healthAnalysis.babies.riskLevel} Risk\n` +
      `Kids: ${analysis.healthAnalysis.kids.riskLevel} Risk\n` +
      `Adults: ${analysis.healthAnalysis.adults.riskLevel} Risk\n` +
      `Analyzed by Ingredient Scout.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ingredient Analysis: ${analysis.productName}`,
          text: shareText,
          url: window.location.href,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        alert("Analysis summary copied to clipboard!");
      } catch (err) {
        console.error("Error copying:", err);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">
            {analysis.productName || "Product Analysis"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {analysis.ingredients.length} ingredients identified
          </p>
        </div>
        <button
          onClick={handleShare}
          className="p-3 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
          title="Share Analysis"
        >
          <Share2 size={20} />
        </button>
      </div>

      {/* Family Alerts */}
      {analysis.familyAlerts && analysis.familyAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 rounded-3xl p-6 border border-amber-100"
        >
          <h3 className="text-lg font-display font-bold text-amber-900 flex items-center gap-2 mb-4">
            <Users size={20} />
            Family Safety Alerts
          </h3>
          <div className="space-y-3">
            {analysis.familyAlerts.map((alert, index) => (
              <div key={index} className="flex gap-3 p-3 bg-white/50 rounded-2xl border border-amber-200/50">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  alert.severity === 'High' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                )}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900">{alert.profileName}</p>
                  <p className="text-xs text-amber-800 mt-0.5">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Risk Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Babies', icon: Baby, key: 'babies' },
          { label: 'Kids', icon: Users, key: 'kids' },
          { label: 'Adults', icon: User, key: 'adults' }
        ].map((group) => {
          const groupAnalysis = analysis.healthAnalysis[group.key as keyof typeof analysis.healthAnalysis];
          return (
            <div key={group.key} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                    <group.icon size={20} />
                  </div>
                  <span className="font-display font-semibold text-slate-900">{group.label}</span>
                </div>
                <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border", getRiskColor(groupAnalysis.riskLevel))}>
                  {groupAnalysis.riskLevel} Risk
                </span>
              </div>
              
              <div className="flex-grow space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Concerns</p>
                  <ul className="space-y-1.5">
                    {groupAnalysis.concerns.map((concern, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-500" />
                        {concern}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-50">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recommendation</p>
                <p className="text-sm text-slate-700 leading-relaxed italic">
                  "{groupAnalysis.recommendation}"
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* All Ingredients with Scores */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
        <div className="p-6 border-b border-slate-50">
          <h3 className="text-lg font-display font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="text-emerald-600" size={20} />
            Ingredient Scorecard
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {analysis.ingredients.map((ing, i) => (
              <div 
                key={i} 
                className={cn(
                  "p-3 rounded-xl border flex items-start gap-3 transition-all hover:shadow-md",
                  getIngredientScoreBg(ing.score)
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {getIngredientScoreIcon(ing.score)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{ing.name}</p>
                  {ing.reason && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                      {ing.reason}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Harmful Chemicals */}
      {analysis.harmfulChemicals.length > 0 && (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
          <div className="p-6 border-b border-slate-50">
            <h3 className="text-lg font-display font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="text-red-500" size={20} />
              Harmful Additives Identified
            </h3>
          </div>
          <div className="divide-y divide-slate-50">
            {analysis.harmfulChemicals.map((chem, i) => (
              <div key={i} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-900">{chem.name}</h4>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", getSeverityColor(chem.severity))} />
                    <span className="text-xs font-medium text-slate-500">{chem.severity} Severity</span>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {chem.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Tip */}
      <div className="bg-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-600/20">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-white/20 rounded-lg">
            <Info size={24} />
          </div>
          <div>
            <h4 className="font-display font-bold text-lg">Pro Tip</h4>
            <p className="mt-1 text-emerald-50 leading-relaxed">
              Always look for products with shorter ingredient lists. If you can't pronounce it, your body might have a hard time processing it!
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

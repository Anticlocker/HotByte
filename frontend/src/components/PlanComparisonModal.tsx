"use client"
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Minus } from "lucide-react";
import { usePlanComparison } from "@/lib/hooks/usePlanComparison";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const planColors: Record<string, string> = {
  trial: "text-gray-400",
  basic: "text-blue-400",
  pro: "text-amber-400",
};

export const PlanComparisonModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const planData = usePlanComparison();
  const features = planData[0]?.features || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-3xl bg-[#0e0e0e]/95 backdrop-blur-2xl border border-gray-800/60 rounded-2xl p-6 max-h-[85vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 border border-gray-800 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              onClick={onClose}
            >
              <X size={14} />
            </button>

            <h2 className="text-lg font-black text-white mb-1">Plan Comparison</h2>
            <p className="text-[11px] text-gray-500 font-semibold mb-6">Compare features across all subscription tiers.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-800/60">
                    <th className="py-3 pr-4 text-[10px] font-black text-gray-500 uppercase tracking-wider">Feature</th>
                    {["trial", "basic", "pro"].map((plan) => (
                      <th key={plan} className={`py-3 px-3 text-[10px] font-black uppercase tracking-wider text-center ${planColors[plan]}`}>
                        {plan.charAt(0).toUpperCase() + plan.slice(1)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {features.map((feat, idx) => (
                    <tr key={idx} className="border-b border-gray-800/30 last:border-0">
                      <td className="py-3 pr-4 text-[11px] text-gray-300 font-semibold">{feat.name}</td>
                      {["trial", "basic", "pro"].map((plan) => {
                        const val = feat[plan as keyof typeof feat];
                        return (
                          <td key={plan} className="py-3 px-3 text-center">
                            {val === true ? (
                              <Check size={14} className="text-emerald-400 mx-auto" />
                            ) : val === false || val === undefined ? (
                              <Minus size={14} className="text-gray-600 mx-auto" />
                            ) : (
                              <span className="text-[10px] text-gray-400 font-semibold">{String(val)}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center mt-6">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-white/5 border border-gray-700 hover:bg-white/10 text-gray-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PlanComparisonModal;

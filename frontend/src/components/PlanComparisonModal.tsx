// src/components/PlanComparisonModal.tsx
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XCircle } from "lucide-react";
import { usePlanComparison } from "@/lib/hooks/usePlanComparison";
import { Button } from "@/components/ui/button";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PlanComparisonModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const plans = usePlanComparison();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-gray-900/95 backdrop-blur-xl rounded-lg w-full max-w-3xl p-6 relative"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              onClick={onClose}
            >
              <XCircle size={24} />
            </button>
            <h2 className="text-2xl font-bold text-white mb-4 text-center">
              Subscription Plan Comparison
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div key={plan.plan} className="glass-card-dark p-4 rounded">
                  <h3 className="text-xl font-semibold text-white mb-2 capitalize">
                    {plan.plan}
                  </h3>
                  <ul className="list-none space-y-2">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center text-gray-300">
                        {/* Using simple check icon */}
                        <svg
                          className="w-4 h-4 mr-2 text-green-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feat.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-6">
              <Button variant="default" onClick={onClose}>
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PlanComparisonModal;

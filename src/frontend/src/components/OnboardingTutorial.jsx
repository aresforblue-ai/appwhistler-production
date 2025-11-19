// src/frontend/src/components/OnboardingTutorial.jsx
// Interactive onboarding walkthrough for new users

import React, { useState } from 'react';

export const OnboardingTutorial = ({ visible = false, onComplete = () => {} }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: '🔍 Welcome to AppWhistler',
      description: 'Your privacy-first app intelligence platform. Discover what apps really do with your data.',
      icon: '🎯',
      highlight: null
    },
    {
      title: '📊 Search Apps',
      description: 'Enter any app name to see its truth rating, permissions, and community reviews.',
      icon: '🔎',
      highlight: 'search-bar'
    },
    {
      title: '✅ Fact-Checks',
      description: 'Read verified claims about app behavior, privacy policies, and security issues.',
      icon: '✓',
      highlight: 'fact-checks'
    },
    {
      title: '🗳️ Vote & Contribute',
      description: 'Help the community by voting on fact-checks and submitting your own insights.',
      icon: '👍',
      highlight: 'voting'
    },
    {
      title: '🏆 Earn Reputation',
      description: 'Top contributors get badges, perks, and even crypto rewards for accurate fact-checks.',
      icon: '⭐',
      highlight: 'leaderboard'
    },
    {
      title: '🔗 Blockchain Proofs',
      description: 'All fact-checks are timestamped on blockchain - complete transparency.',
      icon: '⛓️',
      highlight: null
    },
    {
      title: '🚀 You\'re All Set!',
      description: 'Start exploring apps and help protect digital privacy.',
      icon: '🎊',
      highlight: null
    }
  ];

  const current = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
      localStorage.setItem('appwhistler_onboarded', 'true');
    }
  };

  const handleSkip = () => {
    onComplete();
    localStorage.setItem('appwhistler_onboarded', 'true');
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 max-w-md shadow-2xl border border-slate-700">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-400 text-sm">Step {step + 1} of {steps.length}</span>
            <button
              onClick={handleSkip}
              className="text-slate-500 hover:text-slate-300 text-sm"
            >
              Skip
            </button>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 transition-all duration-300"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">{current.icon}</div>
          <h2 className="text-2xl font-bold text-white mb-3">{current.title}</h2>
          <p className="text-slate-400 text-base leading-relaxed">{current.description}</p>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2 justify-center mb-8">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 transition-all ${
                i === step
                  ? 'bg-blue-500 w-8'
                  : i < step
                  ? 'bg-slate-600 w-2'
                  : 'bg-slate-700 w-2'
              }`}
            ></button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className={`flex-1 px-4 py-3 font-semibold rounded-lg transition ${
              step === steps.length - 1
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white'
            }`}
          >
            {step === steps.length - 1 ? '✓ Got it!' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTutorial;

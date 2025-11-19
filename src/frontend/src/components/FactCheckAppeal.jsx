// src/frontend/src/components/FactCheckAppeal.jsx
// Allow users to challenge fact-check verdicts with evidence

import React, { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';

/**
 * FactCheckAppeal Component
 * Allows users to submit appeals to fact-checks they disagree with
 * Includes evidence submission and reasoning
 * 
 * @component
 * @param {object} props
 * @param {string} props.factCheckId - ID of fact-check to appeal
 * @param {string} props.currentVerdict - Current fact-check verdict
 * @param {function} props.onAppealSubmitted - Callback after submission
 */
export const FactCheckAppeal = ({
  factCheckId,
  currentVerdict,
  onAppealSubmitted,
  darkMode = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    proposedVerdict: '',
    reasoning: '',
    evidence: '',
    supportingLinks: [],
  });
  const { addNotification } = useNotifications();

  // Verdict options
  const verdictOptions = ['TRUE', 'FALSE', 'MISLEADING', 'NO_SUFFICIENT_EVIDENCE', 'DISPUTED'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddLink = () => {
    setFormData(prev => ({
      ...prev,
      supportingLinks: [...prev.supportingLinks, ''],
    }));
  };

  const handleRemoveLink = (index) => {
    setFormData(prev => ({
      ...prev,
      supportingLinks: prev.supportingLinks.filter((_, i) => i !== index),
    }));
  };

  const handleLinkChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      supportingLinks: prev.supportingLinks.map((link, i) => (i === index ? value : link)),
    }));
  };

  const validateForm = () => {
    if (!formData.proposedVerdict) {
      setError('Please select a proposed verdict');
      return false;
    }
    if (!formData.reasoning || formData.reasoning.trim().length < 20) {
      setError('Reasoning must be at least 20 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('appwhistler_token');
      if (!token) {
        setError('Please sign in to submit an appeal');
        return;
      }

      // GraphQL mutation to create appeal
      const response = await fetch(
        process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:5000/graphql',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            query: `
              mutation SubmitFactCheckAppeal(
                $factCheckId: ID!
                $proposedVerdict: String!
                $reasoning: String!
                $evidence: String
                $supportingLinks: [String!]
              ) {
                submitFactCheckAppeal(
                  factCheckId: $factCheckId
                  proposedVerdict: $proposedVerdict
                  reasoning: $reasoning
                  evidence: $evidence
                  supportingLinks: $supportingLinks
                ) {
                  id
                  status
                  createdAt
                }
              }
            `,
            variables: {
              factCheckId,
              proposedVerdict: formData.proposedVerdict,
              reasoning: formData.reasoning,
              evidence: formData.evidence,
              supportingLinks: formData.supportingLinks.filter(link => link.trim().length > 0),
            },
          }),
        }
      );

      const data = await response.json();

      if (data.errors) {
        setError(data.errors[0]?.message || 'Failed to submit appeal');
        addNotification({
          type: 'error',
          message: 'Appeal submission failed',
          duration: 4000,
        });
      } else if (data.data?.submitFactCheckAppeal) {
        addNotification({
          type: 'success',
          message: 'Appeal submitted successfully. Our team will review it.',
          duration: 5000,
        });
        setFormData({
          proposedVerdict: '',
          reasoning: '',
          evidence: '',
          supportingLinks: [],
        });
        setIsOpen(false);
        if (onAppealSubmitted) {
          onAppealSubmitted(data.data.submitFactCheckAppeal);
        }
      }
    } catch (err) {
      setError(err.message);
      addNotification({
        type: 'error',
        message: 'Network error submitting appeal',
        duration: 4000,
      });
      console.error('Appeal submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:underline transition"
        aria-label="Appeal this fact-check"
      >
        Appeal Verdict
      </button>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-black/50' : 'bg-white/50'}`}>
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Appeal Fact-Check Verdict
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className={`text-2xl font-bold ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Current verdict info */}
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Current Verdict: <span className="font-semibold text-orange-600">{currentVerdict}</span>
            </p>
          </div>

          {/* Proposed Verdict */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Proposed Verdict
            </label>
            <select
              name="proposedVerdict"
              value={formData.proposedVerdict}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              <option value="">Select a verdict...</option>
              {verdictOptions.map(verdict => (
                <option key={verdict} value={verdict}>
                  {verdict.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Reasoning */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Reasoning (required)
            </label>
            <textarea
              name="reasoning"
              value={formData.reasoning}
              onChange={handleChange}
              placeholder="Explain why you believe the verdict is incorrect..."
              className={`w-full px-3 py-2 border rounded-lg min-h-[120px] ${darkMode ? 'bg-slate-800 border-slate-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'}`}
            />
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              {formData.reasoning.length}/500 characters
            </p>
          </div>

          {/* Evidence */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Evidence (optional)
            </label>
            <textarea
              name="evidence"
              value={formData.evidence}
              onChange={handleChange}
              placeholder="Provide any additional evidence..."
              className={`w-full px-3 py-2 border rounded-lg min-h-[80px] ${darkMode ? 'bg-slate-800 border-slate-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'}`}
            />
          </div>

          {/* Supporting Links */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`block text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Supporting Links
              </label>
              <button
                type="button"
                onClick={handleAddLink}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Link
              </button>
            </div>
            <div className="space-y-2">
              {formData.supportingLinks.map((link, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => handleLinkChange(idx, e.target.value)}
                    placeholder="https://..."
                    className={`flex-1 px-3 py-2 border rounded-lg ${darkMode ? 'bg-slate-800 border-slate-600 text-white placeholder-gray-500' : 'bg-white border-gray-300'}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(idx)}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {loading ? 'Submitting...' : 'Submit Appeal'}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={`px-4 py-2 border rounded-lg transition ${darkMode ? 'border-slate-600 text-white hover:bg-slate-800' : 'border-gray-300 hover:bg-gray-100'}`}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FactCheckAppeal;

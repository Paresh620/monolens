import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';
import { trashFile } from '../hooks/useScan';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function DeleteModal({ file, onClose, onDeleted }) {
  const [step, setStep] = useState(1); // 1 = first confirm, 2 = type confirm, 3 = processing
  const [confirmText, setConfirmText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!file) return null;

  const handleFinalDelete = async () => {
    setStep(3);
    try {
      const res = await trashFile(file);
      if (res.success) {
        setResult(res);
        onDeleted?.(file);
      } else {
        setError(res.error || 'Failed to delete file');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-dark-800 border border-dark-500 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-gray-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>

          {/* Step 1: First Confirmation */}
          {step === 1 && (
            <div className="text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
                <AlertTriangle size={28} className="text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Move to Trash?</h3>
              <p className="text-gray-400 text-sm mb-1">You are about to trash this file:</p>
              <p className="font-mono text-sm text-blue-400 bg-dark-900 rounded-lg px-3 py-2 mt-2 break-all">
                {file.name}
              </p>
              <p className="text-gray-500 text-xs mt-2">
                Size: {formatBytes(file.size)} | Path: {file.path}
              </p>
              <div className="bg-dark-900 border border-dark-600 rounded-lg p-3 mt-4">
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <ShieldAlert size={16} />
                  <span className="font-medium">Safe Mode Active</span>
                </div>
                <p className="text-gray-400 text-xs mt-1">
                  File will be moved to DiskLens trash. You can restore it later.
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-xl transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Type Confirmation */}
          {step === 2 && (
            <div className="text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <Trash2 size={28} className="text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Final Confirmation</h3>
              <p className="text-gray-400 text-sm mb-4">
                Type <span className="text-red-400 font-mono font-bold">DELETE</span> to confirm
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='Type "DELETE" here'
                className="w-full px-4 py-3 bg-dark-900 border border-dark-500 rounded-xl text-white text-center font-mono tracking-widest placeholder-gray-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
                autoFocus
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setStep(1); setConfirmText(''); }}
                  className="flex-1 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-xl transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleFinalDelete}
                  disabled={confirmText !== 'DELETE'}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Move to Trash
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Processing / Result */}
          {step === 3 && (
            <div className="text-center py-4">
              {!result && !error && (
                <>
                  <div className="mx-auto w-12 h-12 rounded-full border-4 border-dark-600 border-t-blue-500 animate-spin mb-4" />
                  <p className="text-gray-400">Moving to trash...</p>
                </>
              )}
              {result && (
                <>
                  <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Moved to Trash</h3>
                  <p className="text-gray-400 text-sm">
                    The file has been safely moved to DiskLens trash.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-4 px-6 py-2.5 bg-dark-700 hover:bg-dark-600 text-white rounded-xl transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
              {error && (
                <>
                  <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                    <X size={28} className="text-red-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Failed</h3>
                  <p className="text-red-400 text-sm">{error}</p>
                  <button
                    onClick={onClose}
                    className="mt-4 px-6 py-2.5 bg-dark-700 hover:bg-dark-600 text-white rounded-xl transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

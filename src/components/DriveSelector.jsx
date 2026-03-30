import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Download, Smartphone, Monitor, AlertCircle, Shield } from 'lucide-react';
import { supportsFileSystemAccess, isMobile, captureInstallPrompt, triggerInstallPrompt, isInstallable } from '../hooks/useScan';

export default function DriveSelector({ onSelectDrive, scanning }) {
  const [installable, setInstallable] = useState(false);
  const hasAPI = supportsFileSystemAccess();
  const mobile = isMobile();

  useEffect(() => {
    captureInstallPrompt();
    const check = setInterval(() => {
      setInstallable(isInstallable());
    }, 1000);
    return () => clearInterval(check);
  }, []);

  const handleSelectFolder = async () => {
    if (scanning) return;
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      onSelectDrive(dirHandle);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Folder picker error:', err);
      }
    }
  };

  const handleInstall = async () => {
    await triggerInstallPrompt();
    setInstallable(isInstallable());
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* ─── Desktop: Full Access ─── */}
      {hasAPI && !mobile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <motion.button
            onClick={handleSelectFolder}
            disabled={scanning}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full group relative overflow-hidden rounded-2xl border-2 border-dashed border-dark-500 hover:border-blue-500/50 p-10 text-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--bg-card)' }}
          >
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                <FolderOpen size={32} className="text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Select a Folder to Scan</h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto">
                Choose any folder on your computer. Mono Lens will analyze all files and subdirectories
                to show you exactly where your disk space is going.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600/10 text-blue-400 text-sm font-medium">
                <FolderOpen size={16} />
                Browse Folders
              </div>
            </div>
          </motion.button>

          {/* Privacy notice */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-start gap-3 rounded-xl border border-dark-600 p-4"
            style={{ background: 'var(--bg-card)' }}
          >
            <Shield size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-400">
                <span className="text-white font-medium">100% Private</span> — Your files are scanned
                entirely in your browser. Nothing is uploaded or sent to any server.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ─── Mobile: Install Prompt ─── */}
      {mobile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="rounded-2xl border border-dark-600 p-8 text-center"
            style={{ background: 'var(--bg-card)' }}>
            <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
              <Smartphone size={32} className="text-orange-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Install Mono Lens</h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
              For the best experience on mobile, install Mono Lens as an app.
              It works offline and gets automatic updates.
            </p>

            {installable ? (
              <button
                onClick={handleInstall}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors"
              >
                <Download size={18} />
                Install Mono Lens
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-500 text-xs">
                  To install: tap the browser menu (three dots) and select "Add to Home Screen" or "Install App"
                </p>
              </div>
            )}
          </div>

          {/* Desktop alternative */}
          <div className="flex items-start gap-3 rounded-xl border border-dark-600 p-4"
            style={{ background: 'var(--bg-card)' }}>
            <Monitor size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-400">
              <span className="text-white font-medium">Full disk scanning</span> is available
              on desktop browsers (Chrome, Edge). Open this site on your computer for the complete experience.
            </p>
          </div>
        </motion.div>
      )}

      {/* ─── Unsupported Browser ─── */}
      {!hasAPI && !mobile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-dark-600 p-8 text-center"
          style={{ background: 'var(--bg-card)' }}
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Browser Not Supported</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto mb-4">
            Your browser doesn't support the File System Access API.
            Please use <span className="text-white font-medium">Google Chrome</span> or
            <span className="text-white font-medium"> Microsoft Edge</span> for full functionality.
          </p>
        </motion.div>
      )}

      {/* ─── Install as Desktop App (shown for all desktop users) ─── */}
      {!mobile && installable && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border border-dark-600 p-4"
          style={{ background: 'var(--bg-card)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download size={18} className="text-purple-400" />
              <div>
                <p className="text-sm text-white font-medium">Install as Desktop App</p>
                <p className="text-xs text-gray-500">Runs in its own window with auto-updates</p>
              </div>
            </div>
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-purple-600/10 text-purple-400 hover:bg-purple-600/20 rounded-lg text-sm font-medium transition-colors"
            >
              Install
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

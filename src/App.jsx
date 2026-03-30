import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Table2, Map, Trash2, ArrowLeft,
  RotateCcw, Search, Sun, Moon, Wifi, WifiOff,
} from 'lucide-react';
import { useTheme } from './ThemeContext';
import DriveSelector from './components/DriveSelector';
import ScanProgress from './components/ScanProgress';
import Dashboard from './components/Dashboard';
import Charts from './components/Charts';
import FileTable from './components/FileTable';
import TreeMap from './components/TreeMap';
import DeleteModal from './components/DeleteModal';
import { useScan, fetchTrash, restoreFile } from './hooks/useScan';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'charts', label: 'Charts', icon: BarChart3 },
  { id: 'files', label: 'Files', icon: Table2 },
  { id: 'treemap', label: 'Tree Map', icon: Map },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ─── Service Worker Registration + Update Detection ──────

function useServiceWorker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Check for updates periodically
      setInterval(() => reg.update(), 60 * 1000);

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }
        });
      });
    }).catch((err) => {
      console.log('SW registration failed:', err);
    });

    // Refresh when new SW takes over
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const applyUpdate = () => {
    navigator.serviceWorker.ready.then((reg) => {
      if (reg.waiting) {
        reg.waiting.postMessage('SKIP_WAITING');
      }
    });
  };

  return { updateAvailable, applyUpdate };
}

// ─── Main App ────────────────────────────────────────────

export default function App() {
  const { isDark, toggleTheme } = useTheme();
  const { updateAvailable, applyUpdate } = useServiceWorker();

  const {
    status, summary, files, filesMeta, error, scanProgress, scanId,
    startScan, loadFiles, reset,
  } = useScan();

  const [tab, setTab] = useState('overview');
  const [folderName, setFolderName] = useState('');
  const [dirHandle, setDirHandle] = useState(null);
  const [deleteFile, setDeleteFile] = useState(null);
  const [trashItems, setTrashItems] = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);

  const handleSelectDrive = (handle) => {
    setDirHandle(handle);
    setFolderName(handle.name);
    setTab('overview');
    startScan(handle);
  };

  const handleBack = () => {
    reset();
    setFolderName('');
    setDirHandle(null);
    setTab('overview');
  };

  const handleRescan = () => {
    if (dirHandle) startScan(dirHandle);
  };

  const loadTrash = async () => {
    setTrashLoading(true);
    try {
      const data = await fetchTrash();
      setTrashItems(data.items || []);
    } catch (err) {
      console.error('Failed to load trash:', err);
    }
    setTrashLoading(false);
  };

  const handleRestore = async (trashId) => {
    try {
      await restoreFile(trashId);
      loadTrash();
    } catch (err) {
      console.error('Restore failed:', err);
    }
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    if (newTab === 'trash') loadTrash();
  };

  return (
    <div className="min-h-screen bg-dark-950">

      {/* ─── Update Banner ─── */}
      <AnimatePresence>
        {updateAvailable && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-blue-600 text-white text-sm text-center overflow-hidden"
          >
            <div className="px-4 py-2 flex items-center justify-center gap-3">
              <Wifi size={14} />
              <span>A new version of Mono Lens is available!</span>
              <button
                onClick={applyUpdate}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
              >
                Update Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-40 bg-dark-900/80 backdrop-blur-xl border-b border-dark-700">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status !== 'idle' && (
              <button
                onClick={handleBack}
                className="p-2 rounded-lg hover:bg-dark-700 text-gray-400 hover:text-white transition-colors mr-1"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Search size={18} style={{ color: '#fff' }} />
              </div>
              <h1 className="text-lg font-bold text-white tracking-tight">Mono Lens</h1>
            </div>
            <span className="text-xs text-gray-600 bg-dark-800 px-2 py-0.5 rounded-full">v2.0</span>
          </div>

          {status === 'complete' && (
            <div className="flex items-center gap-1">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTabChange(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all ${
                    tab === t.id
                      ? 'bg-blue-600/10 text-blue-400 font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-dark-700'
                  }`}
                >
                  <t.icon size={15} />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            {status === 'complete' && (
              <button
                onClick={handleRescan}
                className="p-2 rounded-lg hover:bg-dark-700 text-gray-400 hover:text-white transition-colors"
                title="Rescan"
              >
                <RotateCcw size={16} />
              </button>
            )}

            {/* Theme Toggle */}
            <motion.button
              onClick={toggleTheme}
              className="relative p-2 rounded-lg hover:bg-dark-700 transition-colors overflow-hidden"
              style={{ background: isDark ? 'transparent' : 'rgba(59, 130, 246, 0.08)' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              title={isDark ? 'Switch to Day Mode' : 'Switch to Night Mode'}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                  <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Sun size={18} style={{ color: '#fbbf24' }} />
                  </motion.div>
                ) : (
                  <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Moon size={18} style={{ color: '#6366f1' }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="max-w-[1440px] mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {/* Idle: Folder Picker */}
          {status === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-10">
                <motion.h2
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl font-bold text-white mb-3"
                >
                  Analyze Your Disk Space
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-gray-400 max-w-lg mx-auto"
                >
                  Select a folder to scan. Mono Lens analyzes files directly in your browser —
                  nothing is uploaded, everything stays private.
                </motion.p>
              </div>
              <DriveSelector onSelectDrive={handleSelectDrive} scanning={false} />
            </motion.div>
          )}

          {/* Scanning */}
          {status === 'scanning' && (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ScanProgress path={folderName} filesScanned={scanProgress} />
            </motion.div>
          )}

          {/* Error */}
          {status === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-red-400 text-2xl">!</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Scan Failed</h3>
              <p className="text-red-400 text-sm mb-6">{error}</p>
              <button onClick={handleBack} className="px-6 py-2.5 bg-dark-700 hover:bg-dark-600 text-white rounded-xl transition-colors">
                Try Again
              </button>
            </motion.div>
          )}

          {/* Results */}
          {status === 'complete' && (
            <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              {tab === 'overview' && (
                <>
                  <Dashboard summary={summary} scanPath={folderName} />
                  <Charts summary={summary} />
                  <TreeMap data={summary?.treeMap} summary={summary} onDeleteFile={setDeleteFile} />
                </>
              )}

              {tab === 'charts' && <Charts summary={summary} />}

              {tab === 'files' && (
                <FileTable
                  files={files}
                  meta={filesMeta}
                  scanId={scanId}
                  onLoadFiles={loadFiles}
                  onDeleteFile={setDeleteFile}
                />
              )}

              {tab === 'treemap' && <TreeMap data={summary?.treeMap} summary={summary} onDeleteFile={setDeleteFile} />}

              {tab === 'trash' && (
                <div className="bg-dark-800 rounded-xl border border-dark-600 overflow-hidden">
                  <div className="p-4 border-b border-dark-600 flex items-center justify-between">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <Trash2 size={18} className="text-gray-400" />
                      Mono Lens Trash
                    </h3>
                    <span className="text-sm text-gray-500">
                      {trashItems.length} items |{' '}
                      {formatBytes(trashItems.reduce((s, i) => s + i.size, 0))}
                    </span>
                  </div>

                  {trashLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                  ) : trashItems.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">Trash is empty</div>
                  ) : (
                    <div className="divide-y divide-dark-700">
                      {trashItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-dark-700/50">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-white truncate">{item.name}</div>
                            <div className="text-xs text-gray-500 truncate">{item.originalPath}</div>
                          </div>
                          <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                            <span className="text-sm text-gray-400 font-mono">{formatBytes(item.size)}</span>
                            <span className="text-xs text-gray-600">
                              {new Date(item.trashedAt).toLocaleDateString()}
                            </span>
                            <button
                              onClick={() => handleRestore(item.id)}
                              className="px-3 py-1.5 text-xs bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 rounded-lg transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Delete Modal */}
      {deleteFile && (
        <DeleteModal
          file={deleteFile}
          onClose={() => setDeleteFile(null)}
          onDeleted={() => {
            setDeleteFile(null);
            loadFiles(scanId, { sort: 'size', order: 'desc', page: 1 });
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-dark-800 mt-16">
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex items-center justify-between text-xs text-gray-600">
          <span>Mono Lens v2.0 — Disk Space Analyzer</span>
          <span>100% Private — All scanning happens in your browser</span>
        </div>
      </footer>
    </div>
  );
}

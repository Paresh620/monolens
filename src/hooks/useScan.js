import { useState, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════
// Mono Lens — 100% Client-Side File Scanner
// Uses the File System Access API (no backend required)
// ═══════════════════════════════════════════════════════

// ─── File Category Detection ────────────────────────────

const IMAGE_EXTS = new Set(['.jpg','.jpeg','.png','.gif','.webp','.bmp','.svg','.ico','.avif','.tiff']);
const VIDEO_EXTS = new Set(['.mp4','.avi','.mkv','.mov','.wmv','.flv','.webm','.m4v','.mpg','.mpeg']);
const AUDIO_EXTS = new Set(['.mp3','.wav','.flac','.aac','.ogg','.wma','.m4a','.opus']);
const DOC_EXTS = new Set(['.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.txt','.rtf','.csv','.odt']);
const CODE_EXTS = new Set(['.js','.jsx','.ts','.tsx','.py','.java','.cpp','.c','.h','.css','.html','.json','.xml','.yaml','.yml','.md','.sql','.sh','.bat','.go','.rs','.php','.rb','.swift','.kt']);
const ARCHIVE_EXTS = new Set(['.zip','.rar','.7z','.tar','.gz','.bz2','.xz','.iso']);
const EXEC_EXTS = new Set(['.exe','.msi','.dll','.sys','.app','.dmg','.deb','.rpm']);

function getCategory(ext) {
  const e = (ext || '').toLowerCase();
  if (IMAGE_EXTS.has(e)) return 'image';
  if (VIDEO_EXTS.has(e)) return 'video';
  if (AUDIO_EXTS.has(e)) return 'audio';
  if (DOC_EXTS.has(e)) return 'document';
  if (CODE_EXTS.has(e)) return 'code';
  if (ARCHIVE_EXTS.has(e)) return 'archive';
  if (EXEC_EXTS.has(e)) return 'executable';
  return 'other';
}

function getExtension(name) {
  const idx = name.lastIndexOf('.');
  return idx > 0 ? name.slice(idx).toLowerCase() : '';
}

// ─── Recursive Directory Scanner ────────────────────────

async function scanDirectory(dirHandle, path = '', maxDepth = 12, depth = 0, signal, onProgress) {
  const files = [];
  let dirCount = 0;

  if (depth > maxDepth || signal?.aborted) return { files, dirCount };

  try {
    for await (const entry of dirHandle.values()) {
      if (signal?.aborted) break;

      if (entry.kind === 'file') {
        try {
          const file = await entry.getFile();
          const ext = getExtension(file.name);
          files.push({
            name: file.name,
            path: path ? `${path}/${file.name}` : file.name,
            size: file.size,
            modified: file.lastModified,
            ext,
            category: getCategory(ext),
            type: 'file',
            _handle: entry,
            _parentHandle: dirHandle,
          });
          if (onProgress) onProgress(files.length);
        } catch {
          // Permission denied or file locked — skip
        }
      } else if (entry.kind === 'directory') {
        dirCount++;
        try {
          const subPath = path ? `${path}/${entry.name}` : entry.name;
          const sub = await scanDirectory(entry, subPath, maxDepth, depth + 1, signal, onProgress);
          files.push(...sub.files);
          dirCount += sub.dirCount;
        } catch {
          // Permission denied — skip
        }
      }
    }
  } catch {
    // Iterator error — skip
  }

  return { files, dirCount };
}

// ─── Build Summary from Scanned Files ───────────────────

function buildSummary(files, dirCount) {
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const fileCount = files.length;

  // By extension
  const extMap = {};
  for (const f of files) {
    const e = f.ext || '(none)';
    if (!extMap[e]) extMap[e] = { ext: e, totalSize: 0, count: 0 };
    extMap[e].totalSize += f.size;
    extMap[e].count++;
  }
  const byExtension = Object.values(extMap).sort((a, b) => b.totalSize - a.totalSize);

  // By directory (top-level grouping)
  const dirMap = {};
  for (const f of files) {
    const parts = f.path.split('/');
    const dir = parts.length > 1 ? parts[0] : '(root)';
    if (!dirMap[dir]) dirMap[dir] = { path: dir, totalSize: 0, count: 0 };
    dirMap[dir].totalSize += f.size;
    dirMap[dir].count++;
  }
  const byDirectory = Object.values(dirMap).sort((a, b) => b.totalSize - a.totalSize);

  // Top files by size
  const topFiles = [...files].sort((a, b) => b.size - a.size).slice(0, 100);

  return {
    totalSize,
    fileCount,
    dirCount,
    byExtension,
    byDirectory,
    topFiles,
  };
}

// ─── Main Hook ──────────────────────────────────────────

export function useScan() {
  const [status, setStatus] = useState('idle');
  const [summary, setSummary] = useState(null);
  const [allFiles, setAllFiles] = useState([]);
  const [files, setFiles] = useState([]);
  const [filesMeta, setFilesMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [error, setError] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const abortRef = useRef(null);
  const dirHandleRef = useRef(null);
  const allFilesRef = useRef([]);

  const applyFilters = useCallback((sourceFiles, params = {}) => {
    let filtered = sourceFiles;
    const { sort = 'size', order = 'desc', search = '', ext = '', page = 1, limit = 50 } = params;

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q));
    }
    if (ext) {
      filtered = filtered.filter(f => f.ext === ext);
    }

    filtered = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sort === 'size') cmp = a.size - b.size;
      else if (sort === 'name') cmp = a.name.localeCompare(b.name);
      else if (sort === 'ext') cmp = (a.ext || '').localeCompare(b.ext || '');
      else if (sort === 'modified') cmp = (a.modified || 0) - (b.modified || 0);
      return order === 'desc' ? -cmp : cmp;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const paged = filtered.slice(start, start + limit);

    setFiles(paged);
    setFilesMeta({ total, page: safePage, totalPages });
  }, []);

  const startScan = useCallback(async (dirHandle) => {
    if (!dirHandle) return;

    setStatus('scanning');
    setError(null);
    setSummary(null);
    setAllFiles([]);
    setFiles([]);
    setScanProgress(0);

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    dirHandleRef.current = dirHandle;

    try {
      const result = await scanDirectory(
        dirHandle, '', 12, 0, controller.signal,
        (count) => setScanProgress(count)
      );

      if (controller.signal.aborted) return;

      const summaryData = buildSummary(result.files, result.dirCount);
      setSummary(summaryData);
      setAllFiles(result.files);
      allFilesRef.current = result.files;
      setStatus('complete');

      applyFilters(result.files, { page: 1, sort: 'size', order: 'desc' });
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Scan failed');
        setStatus('error');
      }
    }
  }, [applyFilters]);

  const loadFiles = useCallback((_scanId, params = {}) => {
    applyFilters(allFilesRef.current, params);
  }, [applyFilters]);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setStatus('idle');
    setSummary(null);
    setAllFiles([]);
    setFiles([]);
    setError(null);
    setScanProgress(0);
    dirHandleRef.current = null;
    allFilesRef.current = [];
  }, []);

  return {
    status, scanId: 'local', summary, files, filesMeta, error, scanProgress,
    allFiles,
    startScan, loadFiles, reset,
  };
}

// ─── Trash System (IndexedDB) ───────────────────────────

const TRASH_DB = 'monolens-trash';
const TRASH_STORE = 'items';

function openTrashDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(TRASH_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TRASH_STORE)) {
        db.createObjectStore(TRASH_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function trashFile(file) {
  try {
    const db = await openTrashDB();
    const tx = db.transaction(TRASH_STORE, 'readwrite');
    const store = tx.objectStore(TRASH_STORE);

    const trashItem = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: file.name,
      originalPath: file.path,
      size: file.size,
      ext: file.ext,
      category: file.category,
      trashedAt: Date.now(),
    };

    store.put(trashItem);

    if (file._parentHandle && file._handle) {
      await file._parentHandle.removeEntry(file.name);
    }

    return { success: true, trashItem };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function fetchTrash() {
  try {
    const db = await openTrashDB();
    const tx = db.transaction(TRASH_STORE, 'readonly');
    const store = tx.objectStore(TRASH_STORE);

    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve({ items: req.result || [] });
      req.onerror = () => reject(req.error);
    });
  } catch {
    return { items: [] };
  }
}

export async function restoreFile(trashId) {
  try {
    const db = await openTrashDB();
    const tx = db.transaction(TRASH_STORE, 'readwrite');
    tx.objectStore(TRASH_STORE).delete(trashId);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── File Operations (Browser-native) ──────────────────

export async function openFile(file) {
  if (file._handle) {
    try {
      const f = await file._handle.getFile();
      const url = URL.createObjectURL(f);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'No file handle available' };
}

export async function exploreFile() {
  return { success: false, error: 'Explore in folder is available in the desktop app.' };
}

export function getThumbnailUrl() {
  return null;
}

export async function getFileThumbnailBlob(file) {
  if (!file?._handle) return null;
  const ext = (file.ext || '').toLowerCase();
  if (!IMAGE_EXTS.has(ext)) return null;
  try {
    const f = await file._handle.getFile();
    return URL.createObjectURL(f);
  } catch {
    return null;
  }
}

// ─── PWA Install Prompt ────────────────────────────────

let deferredInstallPrompt = null;

export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });
}

export async function triggerInstallPrompt() {
  if (!deferredInstallPrompt) return false;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  return outcome === 'accepted';
}

export function isInstallable() {
  return deferredInstallPrompt !== null;
}

// ─── Feature Detection ──────────────────────────────────

export function supportsFileSystemAccess() {
  return 'showDirectoryPicker' in window;
}

export function isMobile() {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && window.innerWidth < 768);
}

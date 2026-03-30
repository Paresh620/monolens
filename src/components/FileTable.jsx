import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown, ArrowUp, ArrowDown, Search, Trash2,
  File, Folder, Filter, ChevronLeft, ChevronRight,
  FolderOpen, Copy, LayoutGrid, LayoutList, Play,
  Image, Film, Music, FileText, Code, Archive, Monitor,
  FileQuestion,
} from 'lucide-react';
import { openFile, exploreFile, getFileThumbnailBlob } from '../hooks/useScan';

// ─── Helpers ───────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(ms) {
  if (!ms) return '-';
  return new Date(ms).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function getSizeColor(size) {
  if (size > 1024 * 1024 * 1024) return 'text-red-400';
  if (size > 100 * 1024 * 1024) return 'text-orange-400';
  if (size > 10 * 1024 * 1024) return 'text-yellow-400';
  if (size > 1024 * 1024) return 'text-blue-400';
  return 'text-gray-400';
}

const IMAGE_EXTS = new Set(['.jpg','.jpeg','.png','.gif','.webp','.bmp','.svg','.ico','.avif']);

const CATEGORY_ICONS = {
  image: { icon: Image, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  video: { icon: Film, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  audio: { icon: Music, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  document: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  code: { icon: Code, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  archive: { icon: Archive, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  executable: { icon: Monitor, color: 'text-red-400', bg: 'bg-red-500/10' },
  other: { icon: FileQuestion, color: 'text-gray-400', bg: 'bg-gray-500/10' },
};

function getCategoryInfo(file) {
  if (file.type === 'directory') return { icon: Folder, color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
  return CATEGORY_ICONS[file.category] || CATEGORY_ICONS.other;
}

function isImageFile(file) {
  return IMAGE_EXTS.has(file.ext?.toLowerCase());
}

// ─── Thumbnail Component ───────────────────────────────────

function FileThumbnail({ file, size = 'sm' }) {
  const [imgError, setImgError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const catInfo = getCategoryInfo(file);
  const CatIcon = catInfo.icon;

  const sizeClasses = {
    sm: 'w-9 h-9 rounded-lg',
    md: 'w-12 h-12 rounded-lg',
    lg: 'w-full h-32 rounded-xl',
  };

  const iconSizes = { sm: 18, md: 22, lg: 40 };

  // Load thumbnail via browser File System Access API
  useEffect(() => {
    if (!isImageFile(file) || imgError) return;
    let cancelled = false;
    getFileThumbnailBlob(file).then((url) => {
      if (!cancelled && url) setBlobUrl(url);
      else if (!cancelled) setImgError(true);
    });
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [file.path]);

  if (isImageFile(file) && !imgError && blobUrl) {
    return (
      <div className={`${sizeClasses[size]} overflow-hidden flex-shrink-0 bg-dark-900 relative`}>
        {!loaded && (
          <div className="absolute inset-0 shimmer" />
        )}
        <img
          src={blobUrl}
          alt={file.name}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onError={() => setImgError(true)}
          onLoad={() => setLoaded(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} ${catInfo.bg} flex items-center justify-center flex-shrink-0`}>
      <CatIcon size={iconSizes[size]} className={catInfo.color} />
    </div>
  );
}

// ─── Context Menu ──────────────────────────────────────────

function ContextMenu({ x, y, file, onClose, onDelete }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const handleOpen = async () => {
    try { await openFile(file); } catch (err) { console.error(err); }
    onClose();
  };

  const handleExplore = async () => {
    try { await exploreFile(file); } catch (err) { console.error(err); }
    onClose();
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(file.path);
    onClose();
  };

  const handleDelete = () => {
    onDelete(file);
    onClose();
  };

  const adjustedX = Math.min(x, window.innerWidth - 230);
  const adjustedY = Math.min(y, window.innerHeight - 260);

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.12 }}
      className="fixed z-[100] bg-dark-800 border border-dark-500 rounded-xl shadow-2xl py-1.5 w-56 overflow-hidden"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <button
        onClick={handleOpen}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-blue-600/20 hover:text-blue-400 transition-colors"
      >
        <Play size={16} />
        Open File
      </button>
      <button
        onClick={handleExplore}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-dark-600 hover:text-white transition-colors"
      >
        <FolderOpen size={16} />
        Explore in Folder
      </button>
      <button
        onClick={handleCopyPath}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-dark-600 hover:text-white transition-colors"
      >
        <Copy size={16} />
        Copy Path
      </button>
      <div className="border-t border-dark-600 my-1" />
      <button
        onClick={handleDelete}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-red-600/20 hover:text-red-400 transition-colors"
      >
        <Trash2 size={16} />
        Move to Trash
      </button>
    </motion.div>
  );
}

// ─── Grid Card ─────────────────────────────────────────────

function GridCard({ file, onContextMenu, onDoubleClick, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group bg-dark-800 border border-dark-600 rounded-xl overflow-hidden hover:border-dark-400 hover:bg-dark-700/50 transition-all cursor-pointer"
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
    >
      {/* Thumbnail */}
      <div className="p-3 pb-0">
        <FileThumbnail file={file} size="lg" />
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="text-sm text-white truncate font-medium" title={file.name}>
          {file.name}
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="inline-flex px-1.5 py-0.5 text-[10px] font-mono bg-dark-900 text-gray-500 rounded">
            {file.ext}
          </span>
          <span className={`text-xs font-mono font-medium ${getSizeColor(file.size)}`}>
            {formatBytes(file.size)}
          </span>
        </div>
        <div className="text-[10px] text-gray-600 mt-1 truncate" title={file.path}>
          {file.path}
        </div>
      </div>

      {/* Hover actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(file); }}
          className="p-1.5 rounded-lg bg-dark-900/80 text-gray-400 hover:text-red-400 hover:bg-red-500/20 transition-colors backdrop-blur-sm"
          title="Move to trash"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main FileTable Component ──────────────────────────────

export default function FileTable({ files, meta, scanId, onLoadFiles, onDeleteFile }) {
  const [sortCol, setSortCol] = useState('size');
  const [sortOrder, setSortOrder] = useState('desc');
  const [search, setSearch] = useState('');
  const [extFilter, setExtFilter] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  const handleSort = (col) => {
    const newOrder = sortCol === col && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortCol(col);
    setSortOrder(newOrder);
    onLoadFiles(scanId, { sort: col, order: newOrder, search, ext: extFilter, page: 1 });
  };

  const handleSearch = (value) => {
    setSearch(value);
    onLoadFiles(scanId, { sort: sortCol, order: sortOrder, search: value, ext: extFilter, page: 1 });
  };

  const handleExtFilter = (value) => {
    setExtFilter(value);
    onLoadFiles(scanId, { sort: sortCol, order: sortOrder, search, ext: value, page: 1 });
  };

  const handlePage = (page) => {
    onLoadFiles(scanId, { sort: sortCol, order: sortOrder, search, ext: extFilter, page });
  };

  const handleDoubleClick = useCallback(async (file) => {
    try {
      await openFile(file);
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  }, []);

  const handleRightClick = useCallback((e, file) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  }, []);

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ArrowUpDown size={14} className="text-gray-600" />;
    return sortOrder === 'desc'
      ? <ArrowDown size={14} className="text-blue-400" />
      : <ArrowUp size={14} className="text-blue-400" />;
  };

  const extensions = useMemo(() => {
    const exts = new Set(files.map(f => f.ext));
    return [...exts].sort();
  }, [files]);

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-600 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-dark-600">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-9 pr-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <select
            value={extFilter}
            onChange={(e) => handleExtFilter(e.target.value)}
            className="pl-8 pr-8 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm text-gray-300 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">All extensions</option>
            {extensions.map(ext => (
              <option key={ext} value={ext}>{ext}</option>
            ))}
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex bg-dark-900 rounded-lg p-0.5 border border-dark-600">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
            title="List view"
          >
            <LayoutList size={15} />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
            title="Grid view with thumbnails"
          >
            <LayoutGrid size={15} />
          </button>
        </div>

        <div className="text-sm text-gray-400">
          {meta.total.toLocaleString()} files
        </div>

        <div className="text-xs text-gray-600 hidden md:block">
          Double-click to open
        </div>
      </div>

      {/* ─── Grid View ─── */}
      {viewMode === 'grid' && (
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {files.map((file) => (
              <div key={file.path} className="relative">
                <GridCard
                  file={file}
                  onContextMenu={(e) => handleRightClick(e, file)}
                  onDoubleClick={() => handleDoubleClick(file)}
                  onDelete={onDeleteFile}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── List View ─── */}
      {viewMode === 'list' && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-900/50">
                {[
                  { key: 'name', label: 'Name', width: '45%' },
                  { key: 'ext', label: 'Type', width: '10%' },
                  { key: 'size', label: 'Size', width: '12%' },
                  { key: 'modified', label: 'Modified', width: '13%' },
                  { key: 'actions', label: '', width: '8%' },
                ].map(col => (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={`px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider ${
                      col.key !== 'actions' ? 'cursor-pointer hover:text-white select-none' : ''
                    }`}
                    onClick={() => col.key !== 'actions' && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      {col.key !== 'actions' && <SortIcon col={col.key} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {files.map((file, i) => (
                <motion.tr
                  key={file.path}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5) }}
                  className="hover:bg-dark-700/50 transition-colors group cursor-pointer"
                  onContextMenu={(e) => handleRightClick(e, file)}
                  onDoubleClick={() => handleDoubleClick(file)}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileThumbnail file={file} size="sm" />
                      <div className="min-w-0">
                        <div className="text-sm text-white truncate max-w-[400px]" title={file.name}>
                          {file.name}
                        </div>
                        <div className="text-xs text-gray-600 truncate max-w-[400px]" title={file.path}>
                          {file.path}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex px-2 py-0.5 text-xs font-mono bg-dark-900 text-gray-400 rounded">
                      {file.ext}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-sm font-mono font-medium ${getSizeColor(file.size)}`}>
                      {formatBytes(file.size)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-400">
                    {formatDate(file.modified)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteFile(file); }}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Move to trash"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {files.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No files match your filters
        </div>
      )}

      {/* Right-click Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            file={contextMenu.file}
            onClose={() => setContextMenu(null)}
            onDelete={onDeleteFile}
          />
        )}
      </AnimatePresence>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-dark-600">
          <div className="text-sm text-gray-500">
            Page {meta.page} of {meta.totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePage(meta.page - 1)}
              disabled={meta.page <= 1}
              className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
              let page;
              if (meta.totalPages <= 5) {
                page = i + 1;
              } else if (meta.page <= 3) {
                page = i + 1;
              } else if (meta.page >= meta.totalPages - 2) {
                page = meta.totalPages - 4 + i;
              } else {
                page = meta.page - 2 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => handlePage(page)}
                  className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                    page === meta.page
                      ? 'bg-blue-600 text-white'
                      : 'bg-dark-700 hover:bg-dark-600 text-gray-400'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => handlePage(meta.page + 1)}
              disabled={meta.page >= meta.totalPages}
              className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { openFile, exploreFile, getThumbnailUrl } from '../hooks/useScan';
import { useTheme } from '../ThemeContext';
import {
  Play, FolderOpen, Copy, Trash2, X, Filter,
  Image, Film, Music, FileText, Code, Archive, Monitor, FileQuestion,
} from 'lucide-react';

// ─── Helpers ───────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const IMAGE_EXTS = new Set(['.jpg','.jpeg','.png','.gif','.webp','.bmp','.svg','.ico','.avif']);

// Premium gradient styles per category — with LIGHT variants
const CATEGORY_STYLES = {
  image:      {
    gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 40%, #34d399 100%)',
    gradientLight: 'linear-gradient(135deg, #d1fae5 0%, #6ee7b7 40%, #34d399 100%)',
    glow: '#059669', glowDark: '#34d399', label: 'Images', icon: Image,
  },
  video:      {
    gradient: 'linear-gradient(135deg, #2e1065 0%, #7c3aed 40%, #a78bfa 100%)',
    gradientLight: 'linear-gradient(135deg, #ede9fe 0%, #c4b5fd 40%, #8b5cf6 100%)',
    glow: '#7c3aed', glowDark: '#a78bfa', label: 'Videos', icon: Film,
  },
  audio:      {
    gradient: 'linear-gradient(135deg, #831843 0%, #db2777 40%, #f472b6 100%)',
    gradientLight: 'linear-gradient(135deg, #fce7f3 0%, #f9a8d4 40%, #ec4899 100%)',
    glow: '#db2777', glowDark: '#f472b6', label: 'Audio', icon: Music,
  },
  document:   {
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 40%, #60a5fa 100%)',
    gradientLight: 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 40%, #3b82f6 100%)',
    glow: '#2563eb', glowDark: '#60a5fa', label: 'Documents', icon: FileText,
  },
  code:       {
    gradient: 'linear-gradient(135deg, #164e63 0%, #0891b2 40%, #22d3ee 100%)',
    gradientLight: 'linear-gradient(135deg, #cffafe 0%, #67e8f9 40%, #06b6d4 100%)',
    glow: '#0891b2', glowDark: '#22d3ee', label: 'Code', icon: Code,
  },
  archive:    {
    gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 40%, #fbbf24 100%)',
    gradientLight: 'linear-gradient(135deg, #fef3c7 0%, #fcd34d 40%, #f59e0b 100%)',
    glow: '#d97706', glowDark: '#fbbf24', label: 'Archives', icon: Archive,
  },
  executable: {
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 40%, #f87171 100%)',
    gradientLight: 'linear-gradient(135deg, #fee2e2 0%, #fca5a5 40%, #ef4444 100%)',
    glow: '#dc2626', glowDark: '#f87171', label: 'Executables', icon: Monitor,
  },
  other:      {
    gradient: 'linear-gradient(135deg, #1f2937 0%, #4b5563 40%, #9ca3af 100%)',
    gradientLight: 'linear-gradient(135deg, #f3f4f6 0%, #d1d5db 40%, #9ca3af 100%)',
    glow: '#4b5563', glowDark: '#9ca3af', label: 'Other', icon: FileQuestion,
  },
};

function getCategory(ext) {
  const e = (ext || '').toLowerCase();
  if (IMAGE_EXTS.has(e)) return 'image';
  if (['.mp4','.avi','.mkv','.mov','.wmv','.flv','.webm','.m4v'].includes(e)) return 'video';
  if (['.mp3','.wav','.flac','.aac','.ogg','.wma','.m4a'].includes(e)) return 'audio';
  if (['.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.txt','.rtf','.csv'].includes(e)) return 'document';
  if (['.js','.jsx','.ts','.tsx','.py','.java','.cpp','.c','.h','.css','.html','.json','.xml','.yaml','.yml','.md','.sql','.sh','.bat'].includes(e)) return 'code';
  if (['.zip','.rar','.7z','.tar','.gz','.bz2','.xz'].includes(e)) return 'archive';
  if (e === '.exe' || e === '.msi' || e === '.dll') return 'executable';
  return 'other';
}

// ─── Squarified Treemap Layout (Bruls-Huizing-van Wijk) ────

function worstRatio(row, rowSize, sideLen) {
  const s2 = sideLen * sideLen;
  const r2 = rowSize * rowSize;
  let minVal = Infinity, maxVal = 0;
  for (const v of row) {
    if (v < minVal) minVal = v;
    if (v > maxVal) maxVal = v;
  }
  return Math.max(
    (s2 * maxVal) / (r2),
    (r2) / (s2 * minVal)
  );
}

function squarify(items, x, y, w, h) {
  if (!items.length || w <= 0 || h <= 0) return [];

  const totalValue = items.reduce((s, i) => s + i.size, 0);
  if (totalValue <= 0) return [];

  const totalArea = w * h;
  const normalized = items
    .map(item => ({ ...item, _area: (item.size / totalValue) * totalArea }))
    .sort((a, b) => b._area - a._area);

  const rects = [];

  function layoutRow(row, rowTotal, bx, by, bw, bh) {
    const vertical = bw >= bh;
    const sideLen = vertical ? bh : bw;
    const rowThickness = sideLen > 0 ? rowTotal / sideLen : 0;

    let offset = 0;
    for (const item of row) {
      const itemLen = sideLen > 0 ? item._area / rowThickness : 0;
      if (vertical) {
        rects.push({ ...item, x: bx, y: by + offset, w: rowThickness, h: itemLen });
      } else {
        rects.push({ ...item, x: bx + offset, y: by, w: itemLen, h: rowThickness });
      }
      offset += itemLen;
    }

    if (vertical) {
      return { x: bx + rowThickness, y: by, w: bw - rowThickness, h: bh };
    } else {
      return { x: bx, y: by + rowThickness, w: bw, h: bh - rowThickness };
    }
  }

  function process(data, bx, by, bw, bh) {
    if (data.length === 0) return;
    if (data.length === 1) {
      rects.push({ ...data[0], x: bx, y: by, w: bw, h: bh });
      return;
    }
    if (bw <= 0 || bh <= 0) return;

    const sideLen = Math.min(bw, bh);
    let row = [];
    let rowSum = 0;
    let remaining = [...data];

    row.push(remaining[0]._area);
    rowSum = remaining[0]._area;
    let rowItems = [remaining[0]];

    for (let i = 1; i < remaining.length; i++) {
      const testRow = [...row, remaining[i]._area];
      const testSum = rowSum + remaining[i]._area;

      const currentWorst = worstRatio(row, rowSum, sideLen);
      const newWorst = worstRatio(testRow, testSum, sideLen);

      if (newWorst <= currentWorst) {
        row.push(remaining[i]._area);
        rowSum += remaining[i]._area;
        rowItems.push(remaining[i]);
      } else {
        break;
      }
    }

    const bounds = layoutRow(rowItems, rowSum, bx, by, bw, bh);
    process(remaining.slice(rowItems.length), bounds.x, bounds.y, bounds.w, bounds.h);
  }

  process(normalized, x, y, w, h);
  return rects;
}

// ─── Context Menu ──────────────────────────────────────────

function BlockContextMenu({ x, y, file, onClose, onDelete, isDark }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) onClose(); };
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onEsc); };
  }, [onClose]);

  const adjustedX = Math.min(x, window.innerWidth - 240);
  const adjustedY = Math.min(y, window.innerHeight - 230);

  const menuBg = isDark ? 'rgba(15,15,32,0.95)' : 'rgba(255,255,255,0.97)';
  const menuBorder = isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB';
  const textColor = isDark ? '#E5E7EB' : '#374151';
  const hoverBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const dividerColor = isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6';

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.92, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.12 }}
      className="fixed z-[100] w-60 overflow-hidden"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div className="backdrop-blur-xl rounded-2xl shadow-2xl py-2"
        style={{ background: menuBg, border: `1px solid ${menuBorder}` }}>
        <button onClick={async () => { await openFile(file); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
          style={{ color: textColor }}
          onMouseEnter={e => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = '#06b6d4'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = textColor; }}>
          <Play size={15} /> Open File
        </button>
        <button onClick={async () => { await exploreFile(file); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
          style={{ color: textColor }}
          onMouseEnter={e => { e.currentTarget.style.background = hoverBg; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
          <FolderOpen size={15} /> Explore in Folder
        </button>
        <button onClick={() => { navigator.clipboard.writeText(file.path); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
          style={{ color: textColor }}
          onMouseEnter={e => { e.currentTarget.style.background = hoverBg; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
          <Copy size={15} /> Copy Path
        </button>
        <div className="my-1.5 mx-3" style={{ borderTop: `1px solid ${dividerColor}` }} />
        <button onClick={() => { onDelete?.(file); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
          style={{ color: textColor }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = textColor; }}>
          <Trash2 size={15} /> Move to Trash
        </button>
      </div>
    </motion.div>
  );
}

// ─── Tooltip ───────────────────────────────────────────────

function Tooltip({ file, x, y, isDark }) {
  const cat = getCategory(file.ext);
  const style = CATEGORY_STYLES[cat];
  const glowColor = isDark ? style.glowDark : style.glow;

  const tooltipBg = isDark ? 'rgba(10,10,22,0.95)' : 'rgba(255,255,255,0.97)';
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB';
  const nameColor = isDark ? '#f9fafb' : '#111827';
  const pathColor = isDark ? '#6b7280' : '#9ca3af';
  const sizeColor = isDark ? '#f9fafb' : '#111827';
  const hintBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const hintColor = isDark ? '#6b7280' : '#9ca3af';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed z-50 pointer-events-none"
      style={{ left: Math.min(x + 16, window.innerWidth - 300), top: y + 16 }}
    >
      <div className="backdrop-blur-xl rounded-2xl px-4 py-3 max-w-xs"
        style={{
          background: tooltipBg,
          border: `1px solid ${tooltipBorder}`,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.1)',
        }}>
        <div className="font-semibold text-sm truncate" style={{ color: nameColor }}>{file.name}</div>
        <div className="text-[11px] mt-1 truncate font-mono" style={{ color: pathColor }}>{file.path}</div>
        <div className="flex items-center gap-3 mt-2.5">
          <span className="font-mono font-bold" style={{ color: sizeColor }}>{formatBytes(file.size)}</span>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold"
            style={{ background: glowColor + '20', color: glowColor }}>
            {file.ext}
          </span>
          <span className="text-[11px]" style={{ color: pathColor }}>{style.label}</span>
        </div>
        <div className="text-[10px] mt-2.5 flex items-center gap-2" style={{ color: hintColor }}>
          <span className="px-1.5 py-0.5 rounded" style={{ background: hintBg }}>dbl-click open</span>
          <span className="px-1.5 py-0.5 rounded" style={{ background: hintBg }}>right-click menu</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── File Block (Premium Gradient Design) ──────────────────

function FileBlock({ file, rect, onDoubleClick, onContextMenu, dimmed, isDark }) {
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const cat = getCategory(file.ext);
  const style = CATEGORY_STYLES[cat];
  const CatIcon = style.icon;
  const isImage = IMAGE_EXTS.has(file.ext?.toLowerCase());
  const glowColor = isDark ? style.glowDark : style.glow;

  const BLOCK_GAP = 3;
  const w = Math.max(0, rect.w - BLOCK_GAP);
  const h = Math.max(0, rect.h - BLOCK_GAP);

  const showName = w > 80 && h > 50;
  const showSize = w > 55 && h > 35;
  const showExt = w > 40 && h > 25;
  const showThumb = isImage && w > 60 && h > 60 && !imgError;
  const showIcon = w > 35 && h > 35 && !showThumb;

  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  // Text colors adapt: on gradient blocks, white text works in dark mode;
  // in light mode, use darker text on the lighter gradients
  const blockTextPrimary = isDark ? 'white' : '#111827';
  const blockTextSecondary = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)';
  const blockTextMuted = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
  const blockTextBold = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: dimmed ? 0.15 : 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="absolute overflow-hidden"
        style={{
          left: rect.x + BLOCK_GAP / 2,
          top: rect.y + BLOCK_GAP / 2,
          width: w,
          height: h,
          background: isDark ? style.gradient : style.gradientLight,
          borderRadius: Math.min(12, Math.min(w, h) / 3),
          cursor: 'pointer',
          zIndex: hovered ? 20 : 1,
          border: hovered
            ? `2px solid ${glowColor}`
            : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
          boxShadow: hovered
            ? `0 0 24px ${glowColor}40, 0 8px 32px rgba(0,0,0,${isDark ? '0.4' : '0.15'}), inset 0 1px 0 rgba(255,255,255,${isDark ? '0.1' : '0.3'})`
            : isDark
              ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.2)'
              : 'inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 4px rgba(0,0,0,0.08)',
          transform: hovered ? 'scale(1.03)' : 'scale(1)',
          transition: 'transform 0.2s ease, border 0.2s ease, box-shadow 0.25s ease, opacity 0.3s ease',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={handleMouseMove}
        onDoubleClick={() => onDoubleClick(file)}
        onContextMenu={(e) => onContextMenu(e, file)}
      >
        {/* Glassmorphic overlay */}
        <div className="absolute inset-0" style={{
          background: hovered
            ? isDark
              ? 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.15) 100%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(0,0,0,0.05) 100%)'
            : isDark
              ? 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 40%, rgba(0,0,0,0.2) 100%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 40%, rgba(0,0,0,0.03) 100%)',
        }} />

        {/* Image thumbnail background */}
        {showThumb && (
          <>
            <img
              src={getThumbnailUrl(file.path)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: imgLoaded ? 0.4 : 0, transition: 'opacity 0.3s' }}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              loading="lazy"
            />
            {imgLoaded && <div className="absolute inset-0" style={{
              background: isDark
                ? 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.5) 100%)',
            }} />}
          </>
        )}

        {/* Content */}
        <div className="relative h-full flex flex-col justify-end p-2" style={{ gap: 1 }}>
          {showIcon && (
            <div className="absolute top-2 right-2" style={{ opacity: isDark ? 0.2 : 0.25 }}>
              <CatIcon size={Math.min(28, Math.min(w, h) * 0.25)} color={isDark ? 'white' : '#111827'} />
            </div>
          )}

          {showName && (
            <div className="truncate font-semibold leading-tight" style={{
              color: blockTextPrimary,
              fontSize: Math.min(13, Math.max(9, w * 0.065)),
              textShadow: isDark ? '0 1px 4px rgba(0,0,0,0.5)' : '0 1px 2px rgba(255,255,255,0.5)',
            }}>
              {file.name}
            </div>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            {showSize && (
              <span className="font-mono font-bold leading-none" style={{
                color: blockTextSecondary,
                fontSize: Math.min(12, Math.max(8, w * 0.06)),
                textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.5)' : 'none',
              }}>
                {formatBytes(file.size)}
              </span>
            )}
            {showExt && showSize && (
              <span className="leading-none" style={{
                color: blockTextMuted,
                fontSize: Math.min(10, Math.max(7, w * 0.05)),
              }}>
                {file.ext}
              </span>
            )}
            {showExt && !showSize && (
              <span className="font-bold leading-none mx-auto" style={{
                color: blockTextBold,
                fontSize: Math.min(11, Math.max(8, Math.min(w, h) * 0.2)),
                textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.5)' : 'none',
              }}>
                {file.ext}
              </span>
            )}
          </div>
        </div>

        {/* Hover shine effect */}
        {hovered && (
          <div className="absolute inset-0 pointer-events-none" style={{
            background: `radial-gradient(circle at ${((mousePos.x - rect.x) / w) * 100}% ${((mousePos.y - rect.y) / h) * 100}%, rgba(255,255,255,${isDark ? '0.08' : '0.15'}), transparent 60%)`,
          }} />
        )}
      </motion.div>

      {hovered && !dimmed && (
        <Tooltip file={file} x={mousePos.x} y={mousePos.y} isDark={isDark} />
      )}
    </>
  );
}

// ─── Filter Pill Components ────────────────────────────────

function CategoryPill({ cat, active, count, onClick, isDark }) {
  const style = CATEGORY_STYLES[cat];
  const Icon = style.icon;
  const glowColor = isDark ? style.glowDark : style.glow;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
      style={{
        background: active
          ? glowColor + '20'
          : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
        color: active ? glowColor : isDark ? '#9ca3af' : '#6b7280',
        border: active
          ? `1px solid ${glowColor}40`
          : isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',
        boxShadow: active ? `0 0 12px ${glowColor}15` : 'none',
      }}
    >
      <Icon size={12} />
      {style.label}
      <span style={{
        color: active ? glowColor : isDark ? '#6b7280' : '#9ca3af',
        fontSize: 10,
        opacity: 0.8,
      }}>
        {count}
      </span>
    </button>
  );
}

// ─── Main TreeMap Component ────────────────────────────────

export default function TreeMap({ data, summary, onDeleteFile }) {
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 900, h: 520 });
  const [contextMenu, setContextMenu] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeExt, setActiveExt] = useState(null);
  const { isDark } = useTheme();

  const topFiles = summary?.topFiles || [];

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (width > 0) setDims({ w: width, h: Math.max(420, Math.min(620, width * 0.5)) });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const allFiles = useMemo(() =>
    topFiles.slice(0, 100).map(f => ({ ...f, category: f.category || getCategory(f.ext) })),
    [topFiles]
  );

  const categoryStats = useMemo(() => {
    const map = {};
    for (const f of allFiles) {
      if (!map[f.category]) map[f.category] = { count: 0, size: 0 };
      map[f.category].count++;
      map[f.category].size += f.size;
    }
    return map;
  }, [allFiles]);

  const extStats = useMemo(() => {
    const map = {};
    for (const f of allFiles) {
      if (!map[f.ext]) map[f.ext] = { count: 0, size: 0 };
      map[f.ext].count++;
      map[f.ext].size += f.size;
    }
    return Object.entries(map)
      .map(([ext, s]) => ({ ext, ...s }))
      .sort((a, b) => b.size - a.size);
  }, [allFiles]);

  const displayFiles = useMemo(() => {
    let result = allFiles;
    if (activeCategory) result = result.filter(f => f.category === activeCategory);
    if (activeExt) result = result.filter(f => f.ext === activeExt);
    return result;
  }, [allFiles, activeCategory, activeExt]);

  const handleDoubleClick = useCallback(async (file) => {
    try { await openFile(file); } catch (err) { console.error(err); }
  }, []);

  const handleContextMenu = useCallback((e, file) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  }, []);

  const toggleCategory = (cat) => {
    setActiveExt(null);
    setActiveCategory(prev => prev === cat ? null : cat);
  };

  const toggleExt = (ext) => {
    setActiveCategory(null);
    setActiveExt(prev => prev === ext ? null : ext);
  };

  const clearFilters = () => {
    setActiveCategory(null);
    setActiveExt(null);
  };

  // Theme-aware colors
  const containerBg = isDark
    ? 'linear-gradient(180deg, #0d0d1a 0%, #111122 100%)'
    : '#FFFFFF';
  const containerBorder = isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB';
  const canvasBg = isDark
    ? 'linear-gradient(135deg, #080810 0%, #0c0c1a 50%, #0a0a14 100%)'
    : 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 50%, #E5E7EB 100%)';
  const canvasShadow = isDark
    ? 'inset 0 1px 0 rgba(255,255,255,0.03), inset 0 -1px 0 rgba(0,0,0,0.3)'
    : 'inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.04)';
  const headingColor = isDark ? '#f9fafb' : '#111827';
  const subColor = isDark ? '#6b7280' : '#9ca3af';
  const separatorColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const legendTextColor = isDark ? '#6b7280' : '#9ca3af';
  const legendSizeColor = isDark ? '#4b5563' : '#9ca3af';

  if (!topFiles.length) {
    return (
      <div className="rounded-2xl p-12 text-center" style={{
        background: isDark
          ? 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)'
          : '#FFFFFF',
        border: `1px solid ${containerBorder}`,
        boxShadow: isDark ? 'none' : 'var(--card-shadow)',
      }}>
        <p style={{ color: subColor }}>No file data available</p>
      </div>
    );
  }

  const GAP = 4;
  const rects = squarify(displayFiles, GAP, GAP, dims.w - GAP * 2, dims.h - GAP * 2);
  const totalSize = displayFiles.reduce((s, f) => s + f.size, 0);
  const hasFilter = activeCategory || activeExt;

  const availableCategories = Object.keys(categoryStats).sort((a, b) =>
    categoryStats[b].size - categoryStats[a].size
  );

  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: containerBg,
      border: `1px solid ${containerBorder}`,
      boxShadow: isDark ? 'none' : 'var(--card-shadow)',
    }}>
      {/* ─── Header ─── */}
      <div className="px-6 pt-5 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg tracking-tight" style={{ color: headingColor }}>
              File Size Map
            </h3>
            <p className="text-xs mt-1" style={{ color: subColor }}>
              {hasFilter
                ? `${displayFiles.length} files (${formatBytes(totalSize)}) matching filter`
                : `Top ${allFiles.length} largest files (${formatBytes(allFiles.reduce((s, f) => s + f.size, 0))})`
              }
              <span className="ml-2" style={{ color: isDark ? '#4b5563' : '#d1d5db' }}>
                Double-click to open
              </span>
            </p>
          </div>
          {hasFilter && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all"
              style={{
                color: isDark ? '#9ca3af' : '#6b7280',
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
              }}>
              <X size={12} /> Clear filter
            </button>
          )}
        </div>
      </div>

      {/* ─── Filter Toolbar ─── */}
      <div className="px-6 pb-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {availableCategories.map(cat => (
            <CategoryPill
              key={cat}
              cat={cat}
              active={activeCategory === cat}
              count={categoryStats[cat].count}
              onClick={() => toggleCategory(cat)}
              isDark={isDark}
            />
          ))}
        </div>

        <div className="hidden sm:block" style={{ width: 1, height: 24, background: separatorColor }} />

        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: isDark ? '#6b7280' : '#9ca3af' }} />
          <select
            value={activeExt || ''}
            onChange={(e) => {
              setActiveCategory(null);
              setActiveExt(e.target.value || null);
            }}
            className="pl-8 pr-8 py-2 rounded-lg text-sm appearance-none focus:outline-none cursor-pointer transition-colors"
            style={{
              background: isDark ? '#0a0a16' : '#F9FAFB',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB'}`,
              color: isDark ? '#d1d5db' : '#374151',
              minWidth: 170,
            }}
          >
            <option value="">All extensions</option>
            {extStats.map(({ ext, count, size }) => (
              <option key={ext} value={ext}>
                {ext}  ({count} files, {formatBytes(size)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Treemap Canvas ─── */}
      <div className="px-4 pb-4">
        <div
          ref={containerRef}
          className="relative rounded-xl overflow-hidden"
          style={{
            height: dims.h,
            background: canvasBg,
            boxShadow: canvasShadow,
          }}
        >
          {rects.map((rect, i) => (
            <FileBlock
              key={rect.path || i}
              file={rect}
              rect={rect}
              dimmed={false}
              isDark={isDark}
              onDoubleClick={handleDoubleClick}
              onContextMenu={handleContextMenu}
            />
          ))}

          {displayFiles.length === 0 && hasFilter && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm" style={{ color: subColor }}>No files match this filter</p>
                <button onClick={clearFilters} className="text-xs mt-2 hover:underline"
                  style={{ color: '#06b6d4' }}>
                  Clear filter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Bottom Legend ─── */}
      <div className="px-6 pb-4 flex items-center justify-between">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {availableCategories.map(cat => {
            const s = CATEGORY_STYLES[cat];
            return (
              <div key={cat} className="flex items-center gap-1.5 text-[11px]"
                style={{ color: legendTextColor }}>
                <div className="w-2.5 h-2.5 rounded-sm"
                  style={{ background: isDark ? s.gradient : s.gradientLight }} />
                {s.label}
                <span style={{ color: legendSizeColor }}>{formatBytes(categoryStats[cat].size)}</span>
              </div>
            );
          })}
        </div>
        <div className="text-[10px]" style={{ color: legendSizeColor }}>
          {allFiles.length} files visualized
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <BlockContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            file={contextMenu.file}
            onClose={() => setContextMenu(null)}
            onDelete={onDeleteFile}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

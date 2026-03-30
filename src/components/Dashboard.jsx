import { motion } from 'framer-motion';
import { HardDrive, FileText, FolderOpen, Database, TrendingUp } from 'lucide-react';
import { useTheme } from '../ThemeContext';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const StatCard = ({ icon: Icon, label, value, sub, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-dark-800 border border-dark-600 rounded-xl p-5 hover:border-dark-400 transition-colors"
  >
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-gray-400">{label}</div>
        {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  </motion.div>
);

export default function Dashboard({ summary, scanPath }) {
  const { isDark } = useTheme();
  if (!summary) return null;

  const { totalSize, fileCount, dirCount, byExtension, topFiles } = summary;

  const avgFileSize = fileCount > 0 ? totalSize / fileCount : 0;
  const topExt = byExtension?.[0];

  const stats = [
    {
      icon: Database,
      label: 'Total Size',
      value: formatBytes(totalSize),
      sub: `Across ${fileCount + dirCount} items`,
      color: 'bg-blue-500/10 text-blue-400',
    },
    {
      icon: FileText,
      label: 'Files',
      value: fileCount.toLocaleString(),
      sub: `Avg ${formatBytes(avgFileSize)} per file`,
      color: 'bg-purple-500/10 text-purple-400',
    },
    {
      icon: FolderOpen,
      label: 'Directories',
      value: dirCount.toLocaleString(),
      color: 'bg-cyan-500/10 text-cyan-400',
    },
    {
      icon: TrendingUp,
      label: 'Largest Type',
      value: topExt?.ext || '-',
      sub: topExt ? `${formatBytes(topExt.totalSize)} in ${topExt.count} files` : undefined,
      color: 'bg-orange-500/10 text-orange-400',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Scan Path Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 text-sm"
      >
        <HardDrive size={14} className="text-gray-500" />
        <span className="text-gray-500">Scanned:</span>
        <span className="font-mono text-blue-400">{scanPath}</span>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} {...stat} delay={i * 0.1} />
        ))}
      </div>

      {/* Quick Insight */}
      {topFiles?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="border border-dark-600 rounded-xl p-4"
          style={{
            background: isDark
              ? 'linear-gradient(to right, rgba(59,130,246,0.05), rgba(139,92,246,0.05))'
              : 'linear-gradient(to right, rgba(59,130,246,0.06), rgba(139,92,246,0.06))',
          }}
        >
          <div className="text-sm text-gray-400">
            <span className="text-white font-medium">Quick insight:</span> The largest file is{' '}
            <span className="text-blue-400 font-mono">{topFiles[0].name}</span>
            {' '}at <span className="text-orange-400 font-medium">{formatBytes(topFiles[0].size)}</span>
            {topFiles.length > 1 && (
              <>
                . The top 10 files account for{' '}
                <span className="text-purple-400 font-medium">
                  {formatBytes(topFiles.slice(0, 10).reduce((s, f) => s + f.size, 0))}
                </span>
                {' '}({totalSize > 0 ? Math.round(topFiles.slice(0, 10).reduce((s, f) => s + f.size, 0) / totalSize * 100) : 0}% of total).
              </>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

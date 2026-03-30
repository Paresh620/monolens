import { motion } from 'framer-motion';
import { Loader2, Search } from 'lucide-react';

export default function ScanProgress({ path, filesScanned = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="relative">
        <motion.div
          className="w-24 h-24 rounded-full border-4 border-dark-600"
          style={{ borderTopColor: '#3b82f6' }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Search size={28} className="text-blue-400" />
        </div>
      </div>

      <h3 className="mt-8 text-xl font-semibold text-white">Scanning Files</h3>
      <p className="mt-2 text-gray-400 text-sm max-w-md text-center">
        Analyzing <span className="text-blue-400 font-mono">{path}</span>
      </p>

      {filesScanned > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 px-4 py-2 bg-dark-800 border border-dark-600 rounded-xl"
        >
          <span className="text-2xl font-bold text-white font-mono">
            {filesScanned.toLocaleString()}
          </span>
          <span className="text-gray-400 text-sm ml-2">files found</span>
        </motion.div>
      )}

      <p className="mt-4 text-gray-500 text-xs">
        This may take a moment for large directories...
      </p>

      <div className="mt-4 flex items-center gap-2 text-gray-500 text-sm">
        <Loader2 size={14} className="animate-spin" />
        Processing files and calculating sizes
      </div>
    </motion.div>
  );
}

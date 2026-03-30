import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useTheme } from '../ThemeContext';

const COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316',
  '#a855f7', '#0ea5e9',
];

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function CustomTooltip({ active, payload, isDark }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div style={{
      background: isDark ? 'rgba(15,15,32,0.95)' : 'rgba(255,255,255,0.97)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB'}`,
      borderRadius: 8,
      padding: '8px 12px',
      boxShadow: isDark
        ? '0 8px 32px rgba(0,0,0,0.5)'
        : '0 4px 16px rgba(0,0,0,0.1)',
    }}>
      <p style={{ color: isDark ? '#f9fafb' : '#111827', fontWeight: 500, fontSize: 13 }}>
        {data.ext || data.name || data.path}
      </p>
      <p style={{ color: '#3b82f6', fontSize: 12, marginTop: 4 }}>
        {formatBytes(data.totalSize || data.size || data.value)}
      </p>
      {data.count != null && (
        <p style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}>
          {data.count.toLocaleString()} files
        </p>
      )}
    </div>
  );
}

export default function Charts({ summary }) {
  const [activeChart, setActiveChart] = useState('extension');
  const { isDark } = useTheme();

  if (!summary) return null;

  // Theme-aware colors for chart axes
  const axisColor = isDark ? '#9CA3AF' : '#6B7280';
  const labelColor = isDark ? '#D1D5DB' : '#374151';
  const legendColor = isDark ? '#D1D5DB' : '#4B5563';

  const extData = (summary.byExtension || []).slice(0, 12).map(e => ({
    ...e,
    name: e.ext,
    value: e.totalSize,
  }));

  const dirData = (summary.byDirectory || []).slice(0, 15).map(d => ({
    ...d,
    name: d.path.split(/[/\\]/).slice(-2).join('/'),
    value: d.totalSize,
  }));

  const topFilesData = (summary.topFiles || []).slice(0, 15).map(f => ({
    name: f.name.length > 25 ? f.name.slice(0, 22) + '...' : f.name,
    size: f.size,
    fullName: f.name,
    path: f.path,
  }));

  const tabs = [
    { id: 'extension', label: 'By Extension' },
    { id: 'directory', label: 'By Directory' },
    { id: 'topfiles', label: 'Largest Files' },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Selector */}
      <div className="flex gap-1 bg-dark-800 rounded-lg p-1 w-fit"
        style={{ boxShadow: isDark ? 'none' : 'var(--card-shadow)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveChart(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeChart === tab.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-dark-700'
            }`}
            style={activeChart === tab.id ? { color: '#fff' } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeChart}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-dark-800 rounded-xl border border-dark-600 p-6"
      >
        {activeChart === 'extension' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div>
              <h3 className="text-white font-semibold mb-4">Size Distribution by Extension</h3>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={extData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={130}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {extData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: legendColor, fontSize: 12 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Extension List */}
            <div>
              <h3 className="text-white font-semibold mb-4">Extension Breakdown</h3>
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2">
                {extData.map((ext, i) => {
                  const maxSize = extData[0]?.totalSize || 1;
                  const percent = (ext.totalSize / maxSize) * 100;
                  return (
                    <div key={ext.ext} className="group">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                          <span className="text-gray-300 font-mono">{ext.ext}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500 text-xs">{ext.count.toLocaleString()} files</span>
                          <span className="text-white font-medium">{formatBytes(ext.totalSize)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden ml-5"
                        style={{ background: isDark ? '#1e1e3a' : '#E5E7EB' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 0.5, delay: i * 0.05 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeChart === 'directory' && (
          <div>
            <h3 className="text-white font-semibold mb-4">Largest Directories</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={dirData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" tickFormatter={formatBytes} tick={{ fill: axisColor, fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={180}
                  tick={{ fill: labelColor, fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Bar dataKey="totalSize" radius={[0, 4, 4, 0]}>
                  {dirData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeChart === 'topfiles' && (
          <div>
            <h3 className="text-white font-semibold mb-4">Largest Individual Files</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topFilesData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" tickFormatter={formatBytes} tick={{ fill: axisColor, fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={200}
                  tick={{ fill: labelColor, fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Bar dataKey="size" radius={[0, 4, 4, 0]}>
                  {topFilesData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>
    </div>
  );
}

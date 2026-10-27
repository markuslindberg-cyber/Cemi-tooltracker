import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { History, Loader2 } from 'lucide-react';
import ToolLogRow from '@/components/history/ToolLogRow';

const PAGE_SIZE = 50;

export default function MaskinHistorik() {
  const [logs, setLogs] = useState([]);
  const [toolNames, setToolNames] = useState({});
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = async (next) => {
    const page = await base44.entities.ToolLog.list({ sort: '-change_date', limit: PAGE_SIZE, ...(next ? { cursor: next } : {}) });
    const ids = [...new Set(page.items.map(l => l.tool_id).filter(id => id && !toolNames[id]))];
    if (ids.length) {
      const tools = await base44.entities.Tool.filter({ id: { $in: ids } });
      setToolNames(prev => ({ ...prev, ...Object.fromEntries(tools.map(t => [t.id, t.name])) }));
    }
    setLogs(prev => next ? [...prev, ...page.items] : page.items);
    setCursor(page.next_cursor);
    setHasMore(page.has_more);
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const loadMore = () => { setLoadingMore(true); load(cursor).finally(() => setLoadingMore(false)); };

  return (
    <div className="p-4 lg:p-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8B1E1E] font-semibold mb-2">Maskiner</p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Ändringshistorik</h1>
        <p className="text-gray-500 mt-1">Vem ändrade vad och när – senaste först.</p>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="hidden md:grid grid-cols-[150px_1fr_1.4fr_170px] gap-4 px-5 py-3 text-[11px] uppercase tracking-wider text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-800">
          <span>När</span><span>Maskin · Fält</span><span>Ändring</span><span>Vem</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-gray-500"><History className="w-10 h-10 mx-auto mb-3 text-gray-300" />Ingen ändringshistorik ännu</div>
        ) : logs.map(log => <ToolLogRow key={log.id} log={log} toolName={toolNames[log.tool_id]} />)}
      </div>
      {hasMore && (
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}Visa fler
          </Button>
        </div>
      )}
    </div>
  );
}
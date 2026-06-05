import React, { useState, useMemo } from 'react';
import { CATEGORIES, NODES, EDGES } from '@/components/knowledge-graph/graphData';
import GraphNode from '@/components/knowledge-graph/GraphNode';
import GraphDetailPanel from '@/components/knowledge-graph/GraphDetailPanel';
import GraphLegend from '@/components/knowledge-graph/GraphLegend';
import WorkflowDiagram from '@/components/knowledge-graph/WorkflowDiagram';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, GitBranch, Network } from 'lucide-react';

export default function KnowledgeGraph() {
  const [selectedId, setSelectedId] = useState(null);
  const [filterCat, setFilterCat] = useState(null);
  const [search, setSearch] = useState('');

  // Nodes connected to selected node
  const connectedIds = useMemo(() => {
    if (!selectedId) return null;
    const ids = new Set([selectedId]);
    EDGES.forEach(e => {
      if (e.from === selectedId) ids.add(e.to);
      if (e.to === selectedId) ids.add(e.from);
    });
    return ids;
  }, [selectedId]);

  const filteredNodes = useMemo(() => {
    let nodes = NODES;
    if (filterCat) nodes = nodes.filter(n => n.cat === filterCat);
    if (search) {
      const q = search.toLowerCase();
      nodes = nodes.filter(n =>
        n.label.toLowerCase().includes(q) ||
        n.desc.toLowerCase().includes(q)
      );
    }
    return nodes;
  }, [filterCat, search]);

  // Group by category
  const grouped = useMemo(() => {
    const map = {};
    filteredNodes.forEach(n => {
      if (!map[n.cat]) map[n.cat] = [];
      map[n.cat].push(n);
    });
    return map;
  }, [filteredNodes]);

  const handleSelect = (id) => {
    setSelectedId(prev => prev === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-[#7c3aed] rounded-xl flex items-center justify-center shadow-lg shadow-[#7c3aed]/25">
              <Network className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">Knowledge Graph</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Systemarkitektur – alla flöden, funktioner och kopplingar</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="graph" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="graph" className="flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5" /> Nodvy
            </TabsTrigger>
            <TabsTrigger value="workflows" className="flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" /> Flöden
            </TabsTrigger>
          </TabsList>

          <TabsContent value="graph" className="mt-6 space-y-5">
            {/* Search + Legend */}
            <div className="space-y-3">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Sök noder..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <GraphLegend activeFilter={filterCat} onFilterChange={setFilterCat} />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Node grid */}
              <div className="lg:col-span-2 space-y-6">
                {Object.entries(grouped).map(([cat, nodes]) => {
                  const catInfo = CATEGORIES[cat];
                  return (
                    <div key={cat}>
                      <h3 className="text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-2" style={{ color: catInfo.color }}>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catInfo.color }} />
                        {catInfo.label} ({nodes.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {nodes.map(node => (
                          <GraphNode
                            key={node.id}
                            node={node}
                            isSelected={selectedId === node.id}
                            isHighlighted={connectedIds ? connectedIds.has(node.id) : null}
                            onSelect={handleSelect}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {filteredNodes.length === 0 && (
                  <p className="text-gray-400 text-sm py-8 text-center">Inga noder matchar filtret.</p>
                )}
              </div>

              {/* Detail panel */}
              <div className="lg:col-span-1">
                {selectedId ? (
                  <div className="sticky top-4">
                    <GraphDetailPanel nodeId={selectedId} onClose={() => setSelectedId(null)} />
                  </div>
                ) : (
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    <Network className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p>Klicka på en nod för att se detaljer och kopplingar.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{NODES.length}</p>
                <p className="text-xs text-gray-500">Totala noder</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{EDGES.length}</p>
                <p className="text-xs text-gray-500">Kopplingar</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{NODES.filter(n => n.cat === 'function').length}</p>
                <p className="text-xs text-gray-500">Backend-funktioner</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{NODES.filter(n => n.cat === 'entity').length}</p>
                <p className="text-xs text-gray-500">Entiteter</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="workflows" className="mt-6">
            <WorkflowDiagram />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
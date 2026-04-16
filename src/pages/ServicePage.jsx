import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Search, Wrench, ClipboardList, Plus, Calendar, User, DollarSign,
  CheckCircle2, ChevronRight, Package, ArrowLeft, Camera, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Html5QrcodeScanner } from 'html5-qrcode';

const SERVICE_TYPE_LABELS = {
  repair: 'Reparation',
  maintenance: 'Underhåll',
  inspection: 'Inspektion',
  calibration: 'Kalibrering',
  replacement_parts: 'Reservdelar',
  annual_service: 'Årlig service',
};

const SERVICE_TYPE_COLORS = {
  repair: 'bg-red-100 text-red-700',
  maintenance: 'bg-blue-100 text-blue-700',
  inspection: 'bg-purple-100 text-purple-700',
  calibration: 'bg-yellow-100 text-yellow-700',
  replacement_parts: 'bg-green-100 text-green-700',
  annual_service: 'bg-orange-100 text-orange-700',
};

// ─── Add Service Dialog ──────────────────────────────────────────────────────
function AddServiceDialog({ open, onClose, tool, prefillTemplate }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    service_type: 'maintenance',
    service_date: new Date().toISOString().split('T')[0],
    cost: '',
    description: '',
    performed_by: '',
    notes: '',
    invoice_number: '',
    supplier: '',
  });

  useEffect(() => {
    if (open && prefillTemplate) {
      setForm(f => ({
        ...f,
        service_type: prefillTemplate.service_type || 'maintenance',
        cost: prefillTemplate.cost ?? '',
        description: prefillTemplate.description || '',
        performed_by: f.performed_by,
        notes: f.notes,
        service_date: new Date().toISOString().split('T')[0],
        _template_name: prefillTemplate.name,
        _parts_used: prefillTemplate.parts_used || [],
      }));
    } else if (open) {
      setForm({
        service_type: 'maintenance',
        service_date: new Date().toISOString().split('T')[0],
        cost: '',
        description: '',
        performed_by: '',
        notes: '',
        invoice_number: '',
        supplier: '',
        _parts_used: [],
        _newPart: '',
      });
    }
  }, [open, prefillTemplate]);

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user?.full_name) setForm(f => ({ ...f, performed_by: user.full_name }));
    }).catch(() => {});
  }, [open]);

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceRecords', tool?.id] });
      toast.success('Service tillagd');
      onClose();
    },
  });

  const handleSave = () => {
    if (!tool) return;
    saveMutation.mutate({
      tool_id: tool.id,
      tool_name: tool.name,
      service_type: form.service_type,
      service_date: form.service_date,
      cost: form.cost === '' ? 0 : Number(form.cost),
      description: form.description,
      performed_by: form.performed_by,
      invoice_number: form.invoice_number || null,
      supplier: form.supplier || null,
      notes: (form.notes || '') + (form._template_name ? `\n[Från mall: ${form._template_name}]` : '') + (form._parts_used?.length > 0 ? `\nDelar: ${form._parts_used.map(p => `${p.part_name} ×${p.quantity}`).join(', ')}` : ''),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lägg till service</DialogTitle>
          <DialogDescription>
            {tool?.name}
            {form._template_name && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 rounded px-2 py-0.5">Från mall: {form._template_name}</span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Typ av service</Label>
              <Select value={form.service_type} onValueChange={v => setForm(f => ({ ...f, service_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SERVICE_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Datum</Label>
              <Input type="date" value={form.service_date} onChange={e => setForm(f => ({ ...f, service_date: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Utförd av</Label>
            <Input value={form.performed_by} onChange={e => setForm(f => ({ ...f, performed_by: e.target.value }))} placeholder="Namn..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Kostnad (kr)</Label>
              <Input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label>Fakturanummer</Label>
              <Input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} placeholder="Valfritt..." />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Beskrivning / vad som utförts</Label>
            <Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Beskriv serviceåtgärden..." />
          </div>
          <div className="space-y-1">
            <Label>Leverantör / tekniker</Label>
            <div className="relative">
              <Input
                value={form.supplier}
                onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                placeholder="Namn på leverantör..."
                className="w-full"
              />
              {form.supplier && suppliers.filter(s => s.toLowerCase().includes(form.supplier.toLowerCase())).length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-input rounded-md shadow-md max-h-48 overflow-y-auto">
                  {suppliers.filter(s => s.toLowerCase().includes(form.supplier.toLowerCase())).map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setForm(f => ({ ...f, supplier: s }))}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Delar/komponenter</Label>
            {(form._parts_used || []).map((p, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <Package className="w-4 h-4 text-gray-400" />
                <span className="flex-1 text-sm">{p.part_name}</span>
                <Input
                  type="number"
                  min="1"
                  value={p.quantity}
                  onChange={e => setForm(f => ({
                    ...f,
                    _parts_used: f._parts_used.map((x, j) => j === i ? { ...x, quantity: Number(e.target.value) } : x)
                  }))}
                  className="w-16 h-7 text-sm"
                />
                <button
                  onClick={() => setForm(f => ({ ...f, _parts_used: f._parts_used.filter((_, j) => j !== i) }))}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                placeholder="Ny del..."
                value={form._newPart || ''}
                onChange={e => setForm(f => ({ ...f, _newPart: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === 'Enter' && form._newPart?.trim()) {
                    setForm(f => ({ ...f, _parts_used: [...(f._parts_used || []), { part_name: f._newPart.trim(), quantity: 1 }], _newPart: '' }));
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!form._newPart?.trim()) return;
                  setForm(f => ({ ...f, _parts_used: [...(f._parts_used || []), { part_name: f._newPart.trim(), quantity: 1 }], _newPart: '' }));
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Anteckningar</Label>
            <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Eventuella anteckningar..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-[#8B1E1E] hover:bg-[#6B1515]">
            {saveMutation.isPending ? 'Sparar...' : 'Spara service'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tool Service History ────────────────────────────────────────────────────
function ToolServiceHistory({ tool, onBack }) {
  const [addOpen, setAddOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['serviceRecords', tool.id],
    queryFn: () => base44.entities.ServiceRecord.filter({ tool_id: tool.id }, '-service_date', 100),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['serviceTemplates'],
    queryFn: () => base44.entities.ServiceTemplate.list('name'),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['serviceSuppliers'],
    queryFn: async () => {
      const records = await base44.entities.ServiceRecord.list('-updated_date', 500);
      const unique = [...new Set(records.filter(r => r.supplier).map(r => r.supplier))].sort();
      return unique;
    },
  });

  const openManual = () => { setSelectedTemplate(null); setAddOpen(true); };
  const openFromTemplate = (t) => { setSelectedTemplate(t); setTemplatePickerOpen(false); setAddOpen(true); };

  return (
    <div className="space-y-6">
      {/* Back + Tool header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">{tool.name}</h2>
          <p className="text-sm text-gray-500">
            {tool.category} {tool.location_name ? `· ${tool.location_name}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTemplatePickerOpen(true)}>
            <ClipboardList className="w-4 h-4 mr-2" /> Från mall
          </Button>
          <Button onClick={openManual} className="bg-[#8B1E1E] hover:bg-[#6B1515]">
            <Plus className="w-4 h-4 mr-2" /> Manuell service
          </Button>
        </div>
      </div>

      {/* Service records */}
      {isLoading && <div className="text-center py-8 text-gray-500">Laddar servicehistorik...</div>}

      {!isLoading && records.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Ingen servicehistorik för den här maskinen.</p>
          <div className="flex gap-3 justify-center mt-4">
            <Button variant="outline" onClick={() => setTemplatePickerOpen(true)}>
              <ClipboardList className="w-4 h-4 mr-2" /> Från mall
            </Button>
            <Button onClick={openManual} className="bg-[#8B1E1E] hover:bg-[#6B1515]">
              <Plus className="w-4 h-4 mr-2" /> Lägg till service
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {records.map(r => (
          <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <Badge className={SERVICE_TYPE_COLORS[r.service_type] || 'bg-gray-100 text-gray-700'}>
                  {SERVICE_TYPE_LABELS[r.service_type] || r.service_type}
                </Badge>
                {r.service_date && (
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(r.service_date), 'd MMMM yyyy', { locale: sv })}
                  </p>
                )}
              </div>
              <div className="text-right">
                {r.cost != null && r.cost > 0 && (
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-1 justify-end">
                    <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                    {Number(r.cost).toLocaleString('sv-SE')} kr
                  </p>
                )}
              </div>
            </div>
            {r.description && <p className="text-sm text-gray-700 mb-2">{r.description}</p>}
            {r.notes && <p className="text-xs text-gray-500 italic mb-2">{r.notes}</p>}
            {r.performed_by && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                <User className="w-3.5 h-3.5" />
                Utförd av: <span className="font-medium text-gray-700">{r.performed_by}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Template picker dialog */}
      <Dialog open={templatePickerOpen} onOpenChange={setTemplatePickerOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Välj servicemall</DialogTitle>
            <DialogDescription>Välj en mall — datum och kommentar kan justeras i nästa steg.</DialogDescription>
          </DialogHeader>
          {templates.length === 0 ? (
            <p className="text-center text-gray-500 py-6">Inga mallar skapade. Gå till Service Mallar för att skapa.</p>
          ) : (
            <div className="space-y-2 py-2">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => openFromTemplate(t)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">{t.name}</p>
                    <p className="text-sm text-gray-500">
                      {SERVICE_TYPE_LABELS[t.service_type]}
                      {t.cost != null ? ` · ${Number(t.cost).toLocaleString('sv-SE')} kr` : ''}
                    </p>
                    {t.description && <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{t.description}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AddServiceDialog
        open={addOpen}
        onClose={() => { setAddOpen(false); setSelectedTemplate(null); }}
        tool={tool}
        prefillTemplate={selectedTemplate}
      />
    </div>
  );
}

// ─── Main Service Page ───────────────────────────────────────────────────────
export default function ServicePage() {
  const [barcode, setBarcode] = useState('');
  const [selectedTool, setSelectedTool] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const inputRef = useRef(null);

  const { data: tools = [] } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list('-updated_date', 500),
  });

  useEffect(() => {
    if (!selectedTool && !scannerActive) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedTool, scannerActive]);

  useEffect(() => {
    if (!scannerActive) return;
    const scanner = new Html5QrcodeScanner('service-barcode-scanner', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    scanner.render((text) => {
      scanner.clear();
      setScannerActive(false);
      handleLookup(text);
    }, () => {});
    return () => { scanner.clear().catch(() => {}); };
  }, [scannerActive, tools]);

  const handleLookup = (code) => {
    const trimmed = (code || barcode).trim();
    if (!trimmed) return;
    const found = tools.find(t => t.barcode === trimmed || t.model_number === trimmed || t.name?.toLowerCase() === trimmed.toLowerCase());
    if (found) {
      setSelectedTool(found);
      setNotFound(false);
      setBarcode('');
    } else {
      setNotFound(true);
    }
  };

  if (selectedTool) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <ToolServiceHistory tool={selectedTool} onBack={() => { setSelectedTool(null); setNotFound(false); }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wrench className="w-7 h-7 text-[#8B1E1E]" /> Service
        </h1>
        <p className="text-gray-500 text-sm mt-1">Skanna eller sök maskin för att se och registrera service</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <Label className="text-sm text-gray-600 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Extern skanner / sök på streckkod eller namn
        </Label>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Skanna streckkod eller skriv maskinnamn..."
            value={barcode}
            onChange={e => { setBarcode(e.target.value); setNotFound(false); }}
            onKeyDown={e => { if (e.key === 'Enter') handleLookup(); }}
            className="flex-1 border-2 border-green-300 focus:border-green-500 bg-green-50/30"
            autoFocus
          />
          <Button onClick={() => handleLookup()}>
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {notFound && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <Wrench className="w-4 h-4" /> Ingen maskin hittad för: <strong>{barcode}</strong>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-500">ELLER KAMERASKANNA</span></div>
        </div>

        <Button variant="outline" className="w-full" onClick={() => setScannerActive(v => !v)}>
          <Camera className="w-4 h-4 mr-2" /> {scannerActive ? 'Stäng kamera' : 'Öppna kameraskanner'}
        </Button>

        {scannerActive && <div id="service-barcode-scanner" className="rounded-xl overflow-hidden" />}
      </div>

      {/* Recent tools shortcut */}
      {tools.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Välj maskin från lista</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {tools.filter(t => t.status !== 'retired' && t.status !== 'sålda').map(t => (
              <button
                key={t.id}
                onClick={() => { setSelectedTool(t); setNotFound(false); }}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  {t.image_url
                    ? <img src={t.image_url} alt={t.name} className="w-9 h-9 object-cover rounded-lg" />
                    : <div className="w-9 h-9 bg-gray-200 rounded-lg flex items-center justify-center"><Package className="w-4 h-4 text-gray-400" /></div>
                  }
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.category}{t.location_name ? ` · ${t.location_name}` : ''}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
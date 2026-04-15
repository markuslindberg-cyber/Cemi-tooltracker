import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Edit2, Save, X, Plus, Trash2, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { calculateUttagMatching } from '@/lib/calculateUttagUtils';

export default function LokalvardArtikelDetaljer() {
  const { artikelnummer } = useParams();
  const navigate = useNavigate();
  const [artikel, setArtikel] = useState(null);
  const [artikelData, setArtikelData] = useState([]);
  const [transaktioner, setTransaktioner] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [inköp, setInköp] = useState([]);
  const [editingInköp, setEditingInköp] = useState(null);
  const [inköpForm, setInköpForm] = useState({});
  const [showAddInköp, setShowAddInköp] = useState(false);
  const [newInköpForm, setNewInköpForm] = useState({ datum: new Date().toISOString().split('T')[0], antal: '', pris: '' });
  const [expandedUttag, setExpandedUttag] = useState({});

  useEffect(() => {
    loadData();
  }, [artikelnummer]);

  useEffect(() => {
    // Debug: logg all inköp data
    if (artikel && inköp.length > 0) {
      console.log('Inköp för artikel:', artikel.id);
      console.log(inköp.map(i => ({ id: i.id, datum: i.datum, antal: i.antal, pris: i.pris })));
    }
  }, [inköp, artikel]);

  const loadData = async () => {
    try {
      const [artiklarData, uttagData, checkoutData, inköpData] = await Promise.all([
        base44.entities.LokalvardsArtikel.list(null, 10000),
        base44.entities.Uttag.list(null, 100000),
        base44.entities.LokalvardCheckout?.list ? base44.entities.LokalvardCheckout.list(null, 100000) : Promise.resolve([]),
        base44.entities.LokalvardInköp?.list ? base44.entities.LokalvardInköp.list() : Promise.resolve([])
      ]);

      window.artiklarData = artiklarData;

      const fundArticle = artiklarData.find(a => 
        a.artikelnummer === artikelnummer || 
        a.streckkod === artikelnummer || 
        a.old_streckkod === artikelnummer
      );
      if (!fundArticle) {
        navigate('/Lokalvard/Lager');
        return;
      }

      setArtikel(fundArticle);
      setForm({
        benamning: fundArticle.benamning,
        artikelnummer: fundArticle.artikelnummer || '',
        streckkod: fundArticle.streckkod || '',
        old_streckkod: fundArticle.old_streckkod || '',
        pris: fundArticle.pris,
        inkopsdatum: fundArticle.inkopsdatum,
        antal_inkopta: fundArticle.antal_inkopta,
        lagertroskelvarde: fundArticle.lagertroskelvarde || 10,
        utgaende: fundArticle.utgaende || false
      });

      const streckkod = fundArticle.streckkod;
      const oldStreckkod = fundArticle.old_streckkod;

      const relateradeUttag = uttagData.filter(u => 
        u.artiklar?.some(a => 
          a.benamning === streckkod || 
          a.benamning === oldStreckkod ||
          a.artikel_id === streckkod || 
          a.artikel_id === oldStreckkod
        )
      );

      const checkoutAsUttag = (checkoutData || []).map(co => {
        const dateStr = co.checked_out_date || new Date().toISOString();
        return {
          id: co.id,
          datum: dateStr,
          personal_id: '',
          personal_namn: co.checked_out_by_name,
          kund_id: co.customer_id,
          kund_namn: co.customer_name,
          ordernummer: co.request_id,
          artiklar: co.checked_out_items.map(item => ({
            artikel_id: item.item_id,
            benamning: item.name,
            antal: item.scanned_quantity || item.quantity,
            pris_per_enhet: 0,
            total_pris: 0
          })),
          total_kostnad: 0,
          manad: dateStr.substring(0, 7)
        };
      }).filter(co => 
        co.artiklar?.some(a => 
          a.artikel_id === streckkod || 
          a.artikel_id === oldStreckkod || 
          a.benamning === streckkod ||
          a.benamning === oldStreckkod
        )
      );

      const allTransactions = [...relateradeUttag, ...checkoutAsUttag].sort((a, b) => new Date(b.datum) - new Date(a.datum));
      setTransaktioner(allTransactions);
      
      // Hämta alla artiklar med samma streckkod eller old_streckkod för att visa alla relaterade inköp
      const sammaStreckkod = artiklarData.filter(a => 
        a.streckkod === fundArticle.streckkod || 
        a.old_streckkod === fundArticle.streckkod ||
        a.streckkod === fundArticle.old_streckkod ||
        a.id === fundArticle.id
      ).map(a => a.id);
      const relateradeInköp = inköpData?.filter(i => 
        sammaStreckkod.includes(i.artikel_id) || 
        i.artikel_id === fundArticle.streckkod || 
        i.artikel_id === fundArticle.old_streckkod
      ) || [];
      
      // Ta bort dubletter (samma artikel_id, datum, antal och pris)
      const uniqueInköp = Array.from(new Map(
        relateradeInköp.map(i => [`${i.artikel_id}|${i.datum}|${i.antal}|${i.pris}`, i])
      ).values());
      
      setInköp(uniqueInköp.sort((a, b) => new Date(b.datum) - new Date(a.datum)));
      setArtikelData(artiklarData);
    } catch (error) {
      toast.error('Kunde inte ladda data');
      navigate('/Lokalvard/Lager');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await base44.entities.LokalvardsArtikel.update(artikel.id, {
        benamning: form.benamning,
        artikelnummer: form.artikelnummer || null,
        streckkod: form.streckkod || null,
        old_streckkod: form.old_streckkod || null,
        pris: parseFloat(form.pris),
        inkopsdatum: form.inkopsdatum,
        antal_inkopta: parseInt(form.antal_inkopta),
        lagertroskelvarde: parseInt(form.lagertroskelvarde),
        utgaende: form.utgaende
      });
      toast.success('Artikel uppdaterad!');
      setEditing(false);
      loadData();
    } catch (error) {
      toast.error('Kunde inte uppdatera artikel');
    }
  };

  const handleEditInköp = (i) => {
    setEditingInköp(i.id);
    setInköpForm({
      datum: i.datum,
      antal: i.antal,
      pris: i.pris
    });
  };

  const handleSaveInköp = async () => {
    try {
      await base44.entities.LokalvardInköp.update(editingInköp, {
        datum: inköpForm.datum,
        antal: parseInt(inköpForm.antal),
        pris: parseFloat(inköpForm.pris)
      });
      toast.success('Inköp uppdaterat!');
      setEditingInköp(null);
      loadData();
    } catch (error) {
      toast.error('Kunde inte uppdatera inköp');
    }
  };

  const handleDeleteInköp = async (id) => {
    if (confirm('Är du säker på att du vill ta bort detta inköp?')) {
      try {
        await base44.entities.LokalvardInköp.delete(id);
        toast.success('Inköp borttaget!');
        loadData();
      } catch (error) {
        toast.error('Kunde inte ta bort inköp');
      }
    }
  };

  const handleAddInköp = async () => {
    if (!newInköpForm.antal || !newInköpForm.pris) {
      toast.error('Fyll i alla fält');
      return;
    }
    try {
      await base44.entities.LokalvardInköp.create({
        artikel_id: artikel.id,
        datum: newInköpForm.datum,
        antal: parseInt(newInköpForm.antal),
        pris: parseFloat(newInköpForm.pris)
      });
      toast.success('Inköp tillagt!');
      setShowAddInköp(false);
      setNewInköpForm({ datum: new Date().toISOString().split('T')[0], antal: '', pris: '' });
      loadData();
    } catch (error) {
      toast.error('Kunde inte lägga till inköp');
    }
  };

  const totalFromInköp = inköp.reduce((sum, i) => sum + i.antal, 0);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (!artikel) return null;

  const totalInköpt = totalFromInköp > 0 ? totalFromInköp : artikel.antal_inkopta;
  const totalUttag = calculateUttagMatching(transaktioner, artikelData, artikel.streckkod, artikel.old_streckkod);
  const saldo = totalInköpt - totalUttag;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/Lokalvard/Lager')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold">{artikel.benamning}</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Artikelinformation</h2>
          {!editing && (
            <Button
              onClick={() => setEditing(true)}
              variant="outline"
              className="gap-2"
            >
              <Edit2 className="w-4 h-4" /> Redigera
            </Button>
          )}
        </div>

        {!editing ? (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Artikelnummer</p>
              <p className="text-lg font-semibold">{artikel.artikelnummer || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Nuvarande pris</p>
              <p className="text-lg font-semibold">{artikel.pris.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</p>
              {inköp.length > 1 && inköp[inköp.length - 1]?.pris && inköp[inköp.length - 1].pris !== artikel.pris && (
                <p className="text-sm text-gray-500 mt-1">
                  Tidigare pris: {inköp[inköp.length - 1].pris.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Inköpsdatum</p>
              <p className="text-lg font-semibold">{artikel.inkopsdatum}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Antal inköpt</p>
              <p className="text-lg font-semibold">{totalInköpt}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Lagertröskelvärde</p>
              <p className="text-lg font-semibold">{artikel.lagertroskelvarde}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Totalt uttag</p>
              <p className="text-lg font-semibold text-blue-600">{totalUttag}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Saldo</p>
              <p className={`text-lg font-semibold ${saldo === 0 ? 'text-red-600' : saldo < artikel.lagertroskelvarde ? 'text-yellow-600' : 'text-green-600'}`}>
                {saldo}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-lg font-semibold">
                {artikel.utgaende ? <span className="text-orange-600">Utgående</span> : <span className="text-green-600">Aktiv</span>}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Benämning</label>
              <input
                type="text"
                value={form.benamning}
                onChange={(e) => setForm({ ...form, benamning: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Artikelnummer</label>
                <input
                  type="text"
                  value={form.artikelnummer}
                  onChange={(e) => setForm({ ...form, artikelnummer: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Streckkod</label>
                <input
                  type="text"
                  value={form.streckkod}
                  onChange={(e) => setForm({ ...form, streckkod: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Tidigare streckkod</label>
              <input
                type="text"
                value={form.old_streckkod}
                onChange={(e) => setForm({ ...form, old_streckkod: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Pris</label>
              <input
                type="number"
                step="0.01"
                value={form.pris}
                onChange={(e) => setForm({ ...form, pris: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Inköpsdatum</label>
                <input
                  type="date"
                  value={form.inkopsdatum}
                  onChange={(e) => setForm({ ...form, inkopsdatum: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Antal inköpt</label>
                <input
                  type="number"
                  value={form.antal_inkopta}
                  onChange={(e) => setForm({ ...form, antal_inkopta: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Lagertröskelvärde</label>
              <input
                type="number"
                value={form.lagertroskelvarde}
                onChange={(e) => setForm({ ...form, lagertroskelvarde: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="utgaende-edit"
                checked={form.utgaende}
                onCheckedChange={(checked) => setForm({ ...form, utgaende: !!checked })}
              />
              <label htmlFor="utgaende-edit" className="text-sm font-semibold cursor-pointer">
                Utgående artikel (köps inte längre in)
              </label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setEditing(false)}
                variant="outline"
                className="flex-1 gap-2"
              >
                <X className="w-4 h-4" /> Avbryt
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
              >
                <Save className="w-4 h-4" /> Spara
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Uttag av denna artikel</h2>
        {!transaktioner || transaktioner.length === 0 ? (
          <p className="text-gray-600">Inga uttag registrerade</p>
        ) : (
          <div className="space-y-1">
            {transaktioner.map(uttag => {
               const matchingItems = uttag.artiklar.filter(item => 
                  item.benamning === artikel.streckkod ||
                  item.benamning === artikel.old_streckkod ||
                  item.artikel_id === artikel.streckkod ||
                  item.artikel_id === artikel.old_streckkod
                );
               const totalUttagForArticle = calculateUttagMatching(transaktioner, artikelData, artikel.streckkod, artikel.old_streckkod || '');
              const totalAntal = matchingItems.reduce((s, i) => s + (i.antal || 0), 0);
              const totalPris = matchingItems.reduce((s, i) => s + (i.antal * i.pris_per_enhet || 0), 0);
              const datum = uttag.datum ? uttag.datum.split('T')[0] : '-';
              const isExpanded = !!expandedUttag[uttag.id];
              return (
                <div key={uttag.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedUttag(prev => ({ ...prev, [uttag.id]: !prev[uttag.id] }))}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />}
                    <span className="text-sm font-medium w-28 shrink-0">{datum}</span>
                    <span className="text-sm text-gray-700 flex-1">{uttag.kund_namn}</span>
                    <span className="text-sm text-gray-500 mr-4">{uttag.personal_namn}</span>
                    <span className="text-sm font-semibold w-16 text-right shrink-0">{totalAntal} st</span>
                    <span className="text-sm font-semibold w-24 text-right shrink-0">{totalPris.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</span>
                  </button>
                  {isExpanded && (
                    <table className="w-full">
                      <thead className="bg-white border-t border-b">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Artikel</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Antal</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Pris/enhet</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Totalt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {matchingItems.map((item, idx) => (
                          <tr key={idx} className="bg-white">
                            <td className="px-4 py-2 text-sm text-gray-700">{item.benamning || item.artikel_id}</td>
                            <td className="px-4 py-2 text-right text-sm">{item.antal}</td>
                            <td className="px-4 py-2 text-right text-sm">{item.pris_per_enhet?.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</td>
                            <td className="px-4 py-2 text-right text-sm font-semibold">{(item.antal * item.pris_per_enhet)?.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Inköp av denna artikel</h2>
          {!showAddInköp && (
            <Button
              onClick={() => setShowAddInköp(true)}
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" /> Lägg till inköp
            </Button>
          )}
        </div>

        {showAddInköp && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3 border border-gray-200">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Datum</label>
                <input
                  type="date"
                  value={newInköpForm.datum}
                  onChange={(e) => setNewInköpForm({ ...newInköpForm, datum: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Antal</label>
                <input
                  type="number"
                  value={newInköpForm.antal}
                  onChange={(e) => setNewInköpForm({ ...newInköpForm, antal: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Pris per enhet</label>
                <input
                  type="number"
                  step="0.01"
                  value={newInköpForm.pris}
                  onChange={(e) => setNewInköpForm({ ...newInköpForm, pris: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAddInköp}
                className="bg-green-600 hover:bg-green-700"
              >
                Lägg till
              </Button>
              <Button
                onClick={() => setShowAddInköp(false)}
                variant="outline"
              >
                Avbryt
              </Button>
            </div>
          </div>
        )}

        {inköp.length === 0 ? (
          <p className="text-gray-600">Ingen inköp registrerad än</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Datum</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Antal</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Pris per enhet</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Totalt</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Åtgärd</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inköp.map(i => (
                  <tr key={i.id}>
                    {editingInköp === i.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={inköpForm.datum}
                            onChange={(e) => setInköpForm({ ...inköpForm, datum: e.target.value })}
                            className="px-3 py-1 border border-gray-300 rounded w-full"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={inköpForm.antal}
                            onChange={(e) => setInköpForm({ ...inköpForm, antal: e.target.value })}
                            className="px-3 py-1 border border-gray-300 rounded w-full text-right"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={inköpForm.pris}
                            onChange={(e) => setInköpForm({ ...inköpForm, pris: e.target.value })}
                            className="px-3 py-1 border border-gray-300 rounded w-full text-right"
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {(inköpForm.antal * inköpForm.pris).toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={handleSaveInköp}
                            className="text-green-600 hover:bg-green-50 p-1 rounded"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingInköp(null)}
                            className="text-gray-600 hover:bg-gray-100 p-1 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">{i.datum}</td>
                        <td className="px-4 py-3 text-right">{i.antal}</td>
                        <td className="px-4 py-3 text-right">{i.pris.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</td>
                        <td className="px-4 py-3 text-right text-gray-600">{(i.antal * i.pris).toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => handleEditInköp(i)}
                            className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteInköp(i.id)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


    </div>
  );
}
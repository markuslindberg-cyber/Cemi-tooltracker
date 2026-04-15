import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, FileDown, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function LokalvardInköpImport() {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);

  const { data: artiklar = [] } = useQuery({
    queryKey: ['lokalvardsArtiklar'],
    queryFn: () => base44.entities.LokalvardsArtikel.list(null, 10000).catch(() => []),
  });

  const { data: befintligaInköp = [] } = useQuery({
    queryKey: ['lokalvardInköp'],
    queryFn: () => base44.entities.LokalvardInköp?.list ? base44.entities.LokalvardInköp.list(null, 10000) : Promise.resolve([]),
  });

  const handleDownloadTemplate = () => {
    const headers = ['streckkod', 'datum', 'antal', 'pris'];
    const exampleRow = ['5701092107145', '2026-04-15', '50', '99.99'];
    const csv = [headers, exampleRow, ...Array(19).fill(Array(4).fill(''))].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'lokalvard_inkop_mall.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            streckkod: { type: 'string' },
            datum: { type: 'string' },
            antal: { type: 'number' },
            pris: { type: 'number' }
          }
        }
      });

      if (result.status === 'success' && Array.isArray(result.output)) {
        const processedResults = [];

        for (const row of result.output) {
          if (!row.streckkod || !row.datum || row.antal === undefined || row.pris === undefined) {
            processedResults.push({
              ...row,
              status: 'error',
              message: 'Saknade obligatoriska fält'
            });
            continue;
          }

          // Hitta artikeln baserat på streckkod (nya eller gamla)
          const artikel = artiklar.find(a => 
            a.streckkod === row.streckkod || a.old_streckkod === row.streckkod
          );

          if (!artikel) {
            processedResults.push({
              ...row,
              status: 'error',
              message: `Artikel med streckkod ${row.streckkod} hittades inte`
            });
            continue;
          }

          // Kontrollera om detta inköp redan finns
          const befintligt = befintligaInköp.find(i => {
            const artikelMatch = i.artikel_id === artikel.id;
            const datumMatch = i.datum === row.datum;
            const antalMatch = i.antal === row.antal;
            return artikelMatch && datumMatch && antalMatch;
          });

          if (befintligt) {
            processedResults.push({
              ...row,
              artikelNamn: artikel.benamning,
              status: 'skipped',
              message: 'Inköp med samma datum och antal existerar redan'
            });
            continue;
          }

          // Skapa det nya inköpet
          try {
            await base44.entities.LokalvardInköp.create({
              artikel_id: artikel.id,
              datum: row.datum,
              antal: parseInt(row.antal),
              pris: parseFloat(row.pris)
            });
            processedResults.push({
              ...row,
              artikelNamn: artikel.benamning,
              status: 'success',
              message: 'Inköp tillagt'
            });
          } catch (err) {
            processedResults.push({
              ...row,
              artikelNamn: artikel.benamning,
              status: 'error',
              message: `Kunde inte spara inköp: ${err.message}`
            });
          }
        }

        setResults(processedResults);
        const successCount = processedResults.filter(r => r.status === 'success').length;
        const skippedCount = processedResults.filter(r => r.status === 'skipped').length;
        const errorCount = processedResults.filter(r => r.status === 'error').length;
        
        if (successCount > 0) {
          toast.success(`${successCount} inköp tillagda${skippedCount > 0 ? `, ${skippedCount} hoppades över` : ''}${errorCount > 0 ? `, ${errorCount} fel` : ''}`);
        } else if (skippedCount > 0) {
          toast.info(`Alla inköp fanns redan (${skippedCount})`);
        } else {
          toast.error(`Ingen inköp importerades (${errorCount} fel)`);
        }
      } else {
        toast.error('Importfel: ' + (result.details || 'Okänt fel'));
      }
    } catch (err) {
      toast.error('Importfel: ' + (err.message || 'Okänt fel'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">📥 Importera inköp</h1>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
        <h2 className="font-semibold text-blue-900">Instruktioner:</h2>
        <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
          <li>Ladda ned mallen och fyll i streckkod, datum (YYYY-MM-DD), antal och pris</li>
          <li>Systemet söker automatiskt efter artiklar baserat på streckkoden (både nya och gamla)</li>
          <li>Om ett inköp redan finns med samma streckkod, datum och antal, kommer det att hoppas över</li>
          <li>Varje rad processas individuellt och du får en rapport över vad som importerades</li>
        </ul>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
         <div className="flex gap-3">
           <Button onClick={handleDownloadTemplate} className="bg-purple-600 hover:bg-purple-700">
             <FileDown className="w-4 h-4 mr-2" /> Ladda ned mall
           </Button>
           <Button onClick={handleImportClick} disabled={uploading} className="bg-blue-600 hover:bg-blue-700">
             {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
             <Upload className="w-4 h-4 mr-2" /> {uploading ? 'Importerar...' : 'Välj Excel/CSV-fil'}
           </Button>
           <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
         </div>
         {uploading && (
           <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
             <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
             <span className="text-sm text-blue-700">Bearbetar fil och importerar data...</span>
           </div>
         )}
       </div>

      {results && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Importresultat</h2>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-700">{results.filter(r => r.status === 'success').length}</div>
              <div className="text-sm text-green-600">Tillagda</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-700">{results.filter(r => r.status === 'skipped').length}</div>
              <div className="text-sm text-yellow-600">Hoppade över</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-700">{results.filter(r => r.status === 'error').length}</div>
              <div className="text-sm text-red-600">Fel</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Status</th>
                  <th className="px-4 py-2 text-left font-semibold">Streckkod</th>
                  <th className="px-4 py-2 text-left font-semibold">Artikel</th>
                  <th className="px-4 py-2 text-left font-semibold">Datum</th>
                  <th className="px-4 py-2 text-right font-semibold">Antal</th>
                  <th className="px-4 py-2 text-right font-semibold">Pris</th>
                  <th className="px-4 py-2 text-left font-semibold">Meddelande</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((row, idx) => (
                  <tr key={idx} className={
                    row.status === 'success' ? 'bg-green-50' :
                    row.status === 'skipped' ? 'bg-yellow-50' :
                    'bg-red-50'
                  }>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        {row.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                        {row.status === 'skipped' && <AlertCircle className="w-4 h-4 text-yellow-600" />}
                        {row.status === 'error' && <X className="w-4 h-4 text-red-600" />}
                        <span className="text-xs font-medium capitalize">{row.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{row.streckkod}</td>
                    <td className="px-4 py-2 text-xs">{row.artikelNamn || '–'}</td>
                    <td className="px-4 py-2 text-xs">{row.datum}</td>
                    <td className="px-4 py-2 text-right text-xs">{row.antal}</td>
                    <td className="px-4 py-2 text-right text-xs">{row.pris?.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button 
            onClick={() => setResults(null)} 
            variant="outline"
            className="w-full"
          >
            Rensa resultat
          </Button>
        </div>
      )}
    </div>
  );
}
import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, FileDown, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function LokalvardInköpImport() {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null); // { rows, fileName } – visas innan bekräftelse
  const [results, setResults] = useState(null);
  const [importLogs, setImportLogs] = useState([]);
  const [logHistory, setLogHistory] = useState([]);

  // Ladda importhistorik från localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('importLogHistory');
    if (savedHistory) setLogHistory(JSON.parse(savedHistory));
  }, []);

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

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    // Ta bort BOM om det finns
    const headerLine = lines[0].replace(/^\uFEFF/, '');
    const headers = headerLine.split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
    return lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
      const row = {};
      headers.forEach((h, i) => { row[h] = cols[i] || ''; });
      return row;
    }).filter(row => row.streckkod || row.datum); // filtrera tomma rader
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      let rows = [];

      if (file.name.endsWith('.csv')) {
        // Direkt CSV-parsning
        const text = await file.text();
        rows = parseCSV(text).map(r => ({
          streckkod: String(r.streckkod || '').trim(),
          datum: String(r.datum || '').trim(),
          antal: parseFloat(r.antal) || 0,
          pris: parseFloat(r.pris) || 0,
        })).filter(r => r.streckkod && r.datum && r.antal > 0);
      } else {
        // För Excel-filer, använd AI-extraktion
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: 'object',
            properties: {
              streckkod: { type: 'string', description: 'Barcode/streckkod column' },
              datum: { type: 'string', description: 'Date in YYYY-MM-DD format' },
              antal: { type: 'number', description: 'Quantity/antal column' },
              pris: { type: 'number', description: 'Price per unit/pris column' }
            }
          }
        });
        if (result.status === 'success' && Array.isArray(result.output)) {
          rows = result.output.map(r => ({
            streckkod: String(r.streckkod || '').trim(),
            datum: String(r.datum || '').trim(),
            antal: parseFloat(r.antal) || 0,
            pris: parseFloat(r.pris) || 0,
          })).filter(r => r.streckkod && r.datum && r.antal > 0);
        } else {
          toast.error('Importfel: ' + (result.details || 'Okänt fel'));
          return;
        }
      }

      if (rows.length > 0) {
        // Visa förhandsgranskning – kör INTE importen ännu
        setPreview({ rows, fileName: file.name });
      } else {
        toast.error('Inga giltiga rader hittades i filen. Kontrollera att kolumnnamnen är: streckkod, datum, antal, pris');
      }
    } catch (err) {
      toast.error('Importfel: ' + (err.message || 'Okänt fel'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!preview) return;
    const { rows, fileName } = preview;
    setPreview(null);
    setImporting(true);
    setImportLogs([`Startar import av ${rows.length} rader från ${fileName}...`]);

    try {
      const res = await base44.functions.invoke('processLokalvardInkopImport', { rows });
      const { results: processedResults } = res.data;
      setResults(processedResults);

      const successCount = processedResults.filter(r => r.status === 'success').length;
      const skippedCount = processedResults.filter(r => r.status === 'skipped').length;
      const errorCount = processedResults.filter(r => r.status === 'error').length;

      setImportLogs([
        `Import slutförd!`,
        `✓ ${successCount} inköp tillagda`,
        `⊘ ${skippedCount} hoppade över`,
        `✕ ${errorCount} fel`
      ]);

      const timestamp = new Date().toLocaleString('sv-SE');
      const historyEntry = { timestamp, fileName, successCount, skippedCount, errorCount, totalRows: rows.length };
      const currentHistory = JSON.parse(localStorage.getItem('importLogHistory') || '[]');
      currentHistory.unshift(historyEntry);
      localStorage.setItem('importLogHistory', JSON.stringify(currentHistory.slice(0, 50)));
      setLogHistory(currentHistory.slice(0, 50));
    } catch (err) {
      toast.error('Import misslyckades: ' + (err.message || 'Okänt fel'));
    } finally {
      setImporting(false);
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
         <div className="hidden lg:flex gap-3">
           <Button onClick={handleDownloadTemplate} className="bg-purple-600 hover:bg-purple-700">
             <FileDown className="w-4 h-4 mr-2" /> Ladda ned mall
           </Button>
           <Button onClick={handleImportClick} disabled={uploading || importing || !!preview} className="bg-blue-600 hover:bg-blue-700">
             {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
             <Upload className="w-4 h-4 mr-2" /> {uploading ? 'Läser fil...' : 'Välj Excel/CSV-fil'}
           </Button>
           <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
         </div>
         {uploading && (
           <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
             <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
             <span className="text-sm text-blue-700">Läser och tolkar filen...</span>
           </div>
         )}
         {importing && (
           <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
             <Loader2 className="w-4 h-4 animate-spin text-green-600" />
             <span className="text-sm text-green-700">Importerar inköp till databasen...</span>
           </div>
         )}
       </div>

      {/* Förhandsgranskning – innan bekräftelse */}
      {preview && (
        <div className="bg-white rounded-lg border border-amber-300 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-amber-800">Förhandsgranskning</h2>
              <p className="text-sm text-amber-700 mt-1">{preview.rows.length} rader lästa från <strong>{preview.fileName}</strong>. Granska innan du importerar.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreview(null)}>
                Avbryt
              </Button>
              <Button onClick={handleConfirmImport} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Importera {preview.rows.length} rader
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 border-b sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">#</th>
                  <th className="px-4 py-2 text-left font-semibold">Streckkod</th>
                  <th className="px-4 py-2 text-left font-semibold">Datum</th>
                  <th className="px-4 py-2 text-right font-semibold">Antal</th>
                  <th className="px-4 py-2 text-right font-semibold">Pris</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-amber-50">
                    <td className="px-4 py-2 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-2 font-mono text-xs">{row.streckkod}</td>
                    <td className="px-4 py-2 text-xs">{row.datum}</td>
                    <td className="px-4 py-2 text-right text-xs">{row.antal}</td>
                    <td className="px-4 py-2 text-right text-xs">{row.pris?.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {importLogs.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="bg-white rounded p-3 font-mono text-sm space-y-1 max-h-40 overflow-y-auto">
            {importLogs.map((log, idx) => (
              <div key={idx} className="text-gray-700">{log}</div>
            ))}
          </div>
        </div>
      )}

      {logHistory.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Importhistorik</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Datum & tid</th>
                  <th className="px-4 py-2 text-left font-semibold">Filnamn</th>
                  <th className="px-4 py-2 text-right font-semibold">Totalt rader</th>
                  <th className="px-4 py-2 text-right font-semibold">Tillagda</th>
                  <th className="px-4 py-2 text-right font-semibold">Hoppade över</th>
                  <th className="px-4 py-2 text-right font-semibold">Fel</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logHistory.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs text-gray-600">{entry.timestamp}</td>
                    <td className="px-4 py-2 text-gray-900">{entry.fileName}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{entry.totalRows}</td>
                    <td className="px-4 py-2 text-right"><span className="text-green-600 font-semibold">{entry.successCount}</span></td>
                    <td className="px-4 py-2 text-right"><span className="text-yellow-600 font-semibold">{entry.skippedCount}</span></td>
                    <td className="px-4 py-2 text-right"><span className="text-red-600 font-semibold">{entry.errorCount}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
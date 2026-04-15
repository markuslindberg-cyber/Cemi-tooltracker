import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, FileDown, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function LokalvardInköpImport() {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [importProgress, setImportProgress] = useState(null);

  // Hämta status från localStorage vid sidladdning och polling
  useEffect(() => {
    const checkImportStatus = () => {
      const savedProgress = localStorage.getItem('importProgress');
      if (savedProgress) {
        setImportProgress(JSON.parse(savedProgress));
      }
    };

    checkImportStatus();
    const interval = setInterval(checkImportStatus, 1000);
    
    return () => clearInterval(interval);
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
        // Spara progress och kör import i bakgrunden
        const progress = { status: 'running', file_url: file_url, rows: result.output };
        setImportProgress(progress);
        localStorage.setItem('importProgress', JSON.stringify(progress));

        // Kör import asynkront
        base44.functions.invoke('processLokalvardInkopImport', {
          rows: result.output,
          fileUrl: file_url
        }).then(res => {
          const { results: processedResults, summary } = res.data;
          setResults(processedResults);
          setImportProgress(null);
          localStorage.removeItem('importProgress');
          
          const { successCount, skippedCount, errorCount } = summary;
          if (successCount > 0) {
            toast.success(`${successCount} inköp tillagda${skippedCount > 0 ? `, ${skippedCount} hoppades över` : ''}${errorCount > 0 ? `, ${errorCount} fel` : ''}`);
          } else if (skippedCount > 0) {
            toast.info(`Alla inköp fanns redan (${skippedCount})`);
          } else {
            toast.error(`Ingen inköp importerades (${errorCount} fel)`);
          }
        }).catch(err => {
          toast.error('Importfel: ' + (err.message || 'Okänt fel'));
          setImportProgress(null);
          localStorage.removeItem('importProgress');
        });
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

      {importProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <div>
              <p className="font-semibold text-blue-900">Import pågår i bakgrunden</p>
              <p className="text-sm text-blue-700">Du kan navigera vidare – importen fortsätter arbeta</p>
            </div>
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
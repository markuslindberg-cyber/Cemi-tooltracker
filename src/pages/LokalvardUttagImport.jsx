import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, FileDown } from 'lucide-react';
import { useState, useRef } from 'react';

export default function LokalvardUttagImport() {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleDownloadTemplate = () => {
    const headers = ['datum', 'personal', 'kund', 'ordernummer', 'streckkod', 'antal', 'pris', 'månad'];
    const rows = [
      headers,
      ['2026-01-15', 'Anna Andersson', 'Företag AB', 'ORD-001', '71617', '5', '49.99', '2026-01'],
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'lokalvard_uttag_mall.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            datum: { type: 'string' },
            personal: { type: 'string' },
            kund: { type: 'string' },
            ordernummer: { type: 'string' },
            streckkod: { type: 'string' },
            antal: { type: 'number' },
            pris: { type: 'number' },
            månad: { type: 'string' }
          }
        }
      });

      if (extracted.status !== 'success' || !Array.isArray(extracted.output)) {
        setResult({ success: false, error: 'Extraction failed: ' + extracted.details });
        setUploading(false);
        return;
      }

      const valid = extracted.output.filter(r => r.datum && r.personal && r.kund && r.streckkod);
      if (valid.length === 0) {
        setResult({ success: false, error: 'No valid rows found' });
        setUploading(false);
        return;
      }

      const processRes = await base44.functions.invoke('processUttagImport', { uttagRecords: valid });

      if (processRes.data.success) {
        setResult({
          success: true,
          message: `${processRes.data.created} uttag importerade!`
        });
      } else {
        setResult({ success: false, error: processRes.data.error });
      }
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">📊 Importera Uttag</h1>
        <p className="text-gray-600">Importera historiska uttag från Excel eller CSV</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="flex gap-3 flex-wrap">
          <Button onClick={handleDownloadTemplate} className="bg-purple-600 hover:bg-purple-700">
            <FileDown className="w-4 h-4 mr-2" /> Hämta mall
          </Button>
          <Button onClick={handleImportClick} disabled={uploading} className="bg-blue-600 hover:bg-blue-700">
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {uploading ? 'Importerar...' : 'Välj fil'}
          </Button>
        </div>
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
      </div>

      {result && (
        <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className={result.success ? 'text-green-700' : 'text-red-700'}>
            {result.success ? '✓ ' + result.message : '✗ ' + result.error}
          </p>
        </div>
      )}
    </div>
  );
}
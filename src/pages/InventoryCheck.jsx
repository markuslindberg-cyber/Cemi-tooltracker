import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  Package,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InventoryCheck() {
  const queryClient = useQueryClient();
  const [scannerActive, setScannerActive] = useState(false);
  const [scannedTool, setScannedTool] = useState(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [checkedTools, setCheckedTools] = useState(new Set());
  const [tempStatus, setTempStatus] = useState('');
  const [tempCondition, setTempCondition] = useState('');

  const { data: tools = [] } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list('-updated_date', 500),
  });

  const updateToolMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Tool.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tools']);
    },
  });

  useEffect(() => {
    if (!scannerActive) return;

    const scanner = new Html5QrcodeScanner(
      "barcode-scanner",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        handleScan(decodedText);
        scanner.clear();
        setScannerActive(false);
      },
      (error) => {
        // Scanning errors are normal, ignore them
      }
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [scannerActive]);

  const handleScan = (barcode) => {
    const tool = tools.find(t => t.barcode === barcode);
    if (tool) {
      setScannedTool(tool);
      setTempStatus(tool.status);
      setTempCondition(tool.condition);
      setCheckedTools(prev => new Set([...prev, tool.id]));
    } else {
      alert(`No tool found with barcode: ${barcode}`);
    }
  };

  const handleManualSearch = () => {
    if (!manualBarcode) return;
    handleScan(manualBarcode);
    setManualBarcode('');
  };

  const handleConfirmCheck = async () => {
    if (!scannedTool) return;

    const updates = {};
    if (tempStatus !== scannedTool.status) updates.status = tempStatus;
    if (tempCondition !== scannedTool.condition) updates.condition = tempCondition;
    updates.last_seen_date = new Date().toISOString();

    if (Object.keys(updates).length > 0) {
      await updateToolMutation.mutateAsync({ id: scannedTool.id, data: updates });
    }

    setScannedTool(null);
  };

  const handleResetCheck = () => {
    setCheckedTools(new Set());
  };

  const checkedCount = checkedTools.size;
  const totalCount = tools.length;
  const uncheckedTools = tools.filter(t => !checkedTools.has(t.id));

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Check</h1>
            <p className="text-gray-500 mt-1">Scan tools to verify inventory</p>
          </div>
          <Button
            onClick={handleResetCheck}
            variant="outline"
            disabled={checkedCount === 0}
          >
            Reset Check
          </Button>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Progress</span>
            <span className="text-sm font-bold text-[#8B1E1E]">
              {checkedCount} / {totalCount}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-[#8B1E1E] h-3 rounded-full transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          {checkedCount === totalCount && totalCount > 0 && (
            <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-200 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">
                All tools checked!
              </span>
            </div>
          )}
        </div>

        {/* Scanner Section */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Scan Tool Barcode</h2>
          
          {!scannerActive ? (
            <div className="space-y-4">
              <Button
                onClick={() => setScannerActive(true)}
                className="w-full bg-[#8B1E1E] hover:bg-[#6B1515] h-14"
                size="lg"
              >
                <Camera className="w-5 h-5 mr-2" />
                Start Camera Scanner
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-500">OR</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Enter barcode manually"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
                />
                <Button onClick={handleManualSearch} disabled={!manualBarcode}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div id="barcode-scanner" className="rounded-xl overflow-hidden" />
              <Button
                onClick={() => setScannerActive(false)}
                variant="outline"
                className="w-full"
              >
                Cancel Scanning
              </Button>
            </div>
          )}
        </div>

        {/* Scanned Tool Details */}
        {scannedTool && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
                {scannedTool.image_url ? (
                  <img src={scannedTool.image_url} alt={scannedTool.name} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <Package className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900">{scannedTool.name}</h3>
                {scannedTool.model_number && (
                  <p className="text-sm text-gray-500">{scannedTool.model_number}</p>
                )}
                {scannedTool.location_name && (
                  <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                    <MapPin className="w-4 h-4" />
                    {scannedTool.location_name}
                  </div>
                )}
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={tempStatus} onValueChange={setTempStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_use">In Use</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="missing">Missing</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={tempCondition} onValueChange={setTempCondition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => setScannedTool(null)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmCheck}
                className="flex-1 bg-[#8B1E1E] hover:bg-[#6B1515]"
                disabled={updateToolMutation.isPending}
              >
                {updateToolMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirm Check
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Unchecked Tools */}
        {uncheckedTools.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Not Yet Checked ({uncheckedTools.length})
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {uncheckedTools.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                      {tool.image_url ? (
                        <img src={tool.image_url} alt={tool.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{tool.name}</p>
                      {tool.barcode && (
                        <p className="text-xs text-gray-500">Barcode: {tool.barcode}</p>
                      )}
                    </div>
                  </div>
                  {tool.location_name && (
                    <Badge variant="outline" className="text-xs">
                      {tool.location_name}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
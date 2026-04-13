import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function Inventarier() {
  const [sheets, setSheets] = useState([{ name: 'Sheet1', cells: {} }]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [cellSelection, setCellSelection] = useState({ row: 0, col: 0 });
  const [editingCell, setEditingCell] = useState(null);
  const [cellValue, setCellValue] = useState('');
  const gridRef = useRef(null);

  const ROWS = 50;
  const COLS = 10;
  const COL_WIDTH = 120;
  const ROW_HEIGHT = 32;

  const currentSheet = sheets[activeSheet];

  const getCellId = (row, col) => `${row},${col}`;
  const getCellValue = (row, col) => currentSheet.cells[getCellId(row, col)]?.value || '';

  const handleCellClick = (row, col) => {
    setCellSelection({ row, col });
    setEditingCell(null);
    setCellValue(getCellValue(row, col));
  };

  const handleCellDoubleClick = (row, col) => {
    setEditingCell({ row, col });
    setCellValue(getCellValue(row, col));
  };

  const saveCellValue = () => {
    const { row, col } = cellSelection;
    const newSheets = [...sheets];
    const cellId = getCellId(row, col);
    
    if (!newSheets[activeSheet].cells[cellId]) {
      newSheets[activeSheet].cells[cellId] = {};
    }
    newSheets[activeSheet].cells[cellId].value = cellValue;
    setSheets(newSheets);
    setEditingCell(null);
  };

  const handleKeyDown = (e) => {
    if (!editingCell) return;

    if (e.key === 'Enter') {
      saveCellValue();
      setCellSelection(prev => ({ ...prev, row: prev.row + 1 }));
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      saveCellValue();
      setCellSelection(prev => ({ ...prev, col: prev.col + 1 }));
    }
  };

  const addSheet = () => {
    const newName = `Sheet${sheets.length + 1}`;
    setSheets([...sheets, { name: newName, cells: {} }]);
    setActiveSheet(sheets.length);
  };

  const deleteSheet = (index) => {
    if (sheets.length === 1) {
      toast.error('Du måste ha minst ett kalkylblad');
      return;
    }
    const newSheets = sheets.filter((_, i) => i !== index);
    setSheets(newSheets);
    setActiveSheet(Math.max(0, index - 1));
  };

  const exportAsCSV = () => {
    let csv = '';
    for (let row = 0; row < ROWS; row++) {
      const rowData = [];
      for (let col = 0; col < COLS; col++) {
        rowData.push(getCellValue(row, col));
      }
      csv += rowData.join(',') + '\n';
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSheet.name}.csv`;
    a.click();
  };

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Topbar */}
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inventarier</h1>
        <div className="flex gap-2">
          <Button onClick={exportAsCSV} variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" /> Exportera
          </Button>
        </div>
      </div>

      {/* Sheet Tabs */}
      <div className="border-b border-gray-200 px-4 flex items-center gap-2 bg-gray-50">
        {sheets.map((sheet, index) => (
          <div key={index} className="relative">
            <button
              onClick={() => setActiveSheet(index)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSheet === index
                  ? 'border-[#8B1E1E] text-[#8B1E1E]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {sheet.name}
            </button>
            {sheets.length > 1 && (
              <button
                onClick={() => deleteSheet(index)}
                className="absolute -top-1 -right-2 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addSheet}
          className="px-2 py-2 text-gray-600 hover:text-gray-900"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Formula Bar */}
      <div className="border-b border-gray-200 px-4 py-3 bg-gray-50 flex items-center gap-4">
        <span className="text-sm font-medium text-gray-600 min-w-16">
          {String.fromCharCode(65 + cellSelection.col)}{cellSelection.row + 1}
        </span>
        <input
          type="text"
          value={editingCell ? cellValue : getCellValue(cellSelection.row, cellSelection.col)}
          onChange={(e) => setCellValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => editingCell || setEditingCell(cellSelection)}
          onBlur={() => editingCell && saveCellValue()}
          className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1E1E]"
          placeholder="Mata in värde eller formel"
        />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto" ref={gridRef}>
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="w-12 h-8 bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-600 sticky top-0 left-0 z-20"></th>
              {Array.from({ length: COLS }).map((_, col) => (
                <th
                  key={col}
                  className="h-8 bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-600 sticky top-0"
                  style={{ width: COL_WIDTH }}
                >
                  {String.fromCharCode(65 + col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }).map((_, row) => (
              <tr key={row}>
                <td className="w-12 bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-600 text-center sticky left-0 z-10">
                  {row + 1}
                </td>
                {Array.from({ length: COLS }).map((_, col) => (
                  <td
                    key={`${row}-${col}`}
                    onClick={() => handleCellClick(row, col)}
                    onDoubleClick={() => handleCellDoubleClick(row, col)}
                    className={`border border-gray-200 cursor-cell text-sm p-1 ${
                      cellSelection.row === row && cellSelection.col === col
                        ? 'bg-blue-100 border-blue-500 border-2'
                        : 'hover:bg-gray-50'
                    }`}
                    style={{ width: COL_WIDTH, height: ROW_HEIGHT }}
                  >
                    {editingCell?.row === row && editingCell?.col === col ? (
                      <input
                        autoFocus
                        type="text"
                        value={cellValue}
                        onChange={(e) => setCellValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={saveCellValue}
                        className="w-full h-full border-0 outline-none text-sm p-1"
                      />
                    ) : (
                      <div className="truncate">{getCellValue(row, col)}</div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
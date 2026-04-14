import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ChevronRight, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export default function LokalvardUttag() {
  const [selectedUttag, setSelectedUttag] = useState(null);

  const { data: uttag = [], isLoading } = useQuery({
    queryKey: ['uttag'],
    queryFn: () => base44.entities.Uttag.list('-datum', 100).catch(() => []),
  });

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: sv });
  };

  const formatMonth = (monthString) => {
    const [year, month] = monthString.split('-');
    return format(new Date(year, parseInt(month) - 1), 'MMMM yyyy', { locale: sv });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Uttag – Lokalvård</h1>
        <p className="text-gray-600 mt-2">Historik över alla uttag av lokalvårdsartiklar</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : uttag.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">Inga uttag registrerade ännu</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {uttag.map((u) => (
            <Card
              key={u.id}
              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => setSelectedUttag(u)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-baseline gap-4">
                    <h3 className="font-semibold text-gray-900">{u.kund_namn}</h3>
                    <p className="text-sm text-gray-500">{formatDate(u.datum)}</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Personnummer: {u.personal_namn}</p>
                  <p className="text-sm text-gray-600">
                    {u.artiklar.length} artikel{u.artiklar.length !== 1 ? 'ar' : ''} • Totalt: {u.total_kostnad.toFixed(2)} kr
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedUttag && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Uttag detaljer</h2>
              <button
                onClick={() => setSelectedUttag(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Övergripande info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Kund</p>
                  <p className="font-semibold text-gray-900">{selectedUttag.kund_namn}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Datum</p>
                  <p className="font-semibold text-gray-900">{formatDate(selectedUttag.datum)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Personal</p>
                  <p className="font-semibold text-gray-900">{selectedUttag.personal_namn}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Månad</p>
                  <p className="font-semibold text-gray-900">{formatMonth(selectedUttag.manad)}</p>
                </div>
              </div>

              {selectedUttag.ordernummer && (
                <div>
                  <p className="text-sm text-gray-600">Ordernummer</p>
                  <p className="font-semibold text-gray-900">{selectedUttag.ordernummer}</p>
                </div>
              )}

              {/* Artiklar */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Artiklar</h3>
                <div className="space-y-2">
                  {selectedUttag.artiklar.map((artikel, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div>
                        <p className="font-medium text-gray-900">{artikel.benamning}</p>
                        <p className="text-sm text-gray-600">Antal: {artikel.antal}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{artikel.total_pris.toFixed(2)} kr</p>
                        <p className="text-sm text-gray-600">{artikel.pris_per_enhet.toFixed(2)} kr/st</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-6 flex items-center justify-between">
                <p className="text-lg font-bold">Total kostnad</p>
                <p className="text-2xl font-bold text-[#8B1E1E]">{selectedUttag.total_kostnad.toFixed(2)} kr</p>
              </div>

              <Button
                onClick={() => setSelectedUttag(null)}
                className="w-full"
                variant="outline"
              >
                Stäng
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
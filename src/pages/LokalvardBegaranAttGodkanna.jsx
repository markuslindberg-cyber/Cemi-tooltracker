import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Check, X, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export default function LokalvardBegaranAttGodkanna() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [user, setUser] = useState(null);

  const { data: personal = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: async () => {
      const members = await base44.entities.TeamMember.list(null, 10000).catch(() => []);
      return members;
    },
  });

  const personalMap = React.useMemo(() => {
    const map = {};
    personal.forEach(p => {
      map[p.id] = p.name;
    });
    return map;
  }, [personal]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: pendingRequests = [], isLoading } = useQuery({
    queryKey: ['pendingWorkwearRequests'],
    queryFn: async () => {
      const requests = await base44.entities.WorkwearRequest.list('-request_date', 10000);
      return requests.filter(r => r.status === 'pending');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (requestId) =>
      base44.entities.WorkwearRequest.update(requestId, {
        status: 'approved',
        approved_by_email: user?.email,
        approved_by_name: personalMap[user?.id] || user?.full_name,
        approved_date: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['pendingWorkwearRequests']);
      setSelectedRequest(null);
      setRejectNotes('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId) =>
      base44.entities.WorkwearRequest.update(requestId, {
        status: 'rejected',
        notes: rejectNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['pendingWorkwearRequests']);
      setSelectedRequest(null);
      setRejectNotes('');
    },
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Begäran att godkänna – Lokalvård</h1>
        <p className="text-gray-600 mt-2">Granska och godkänna begäranden om lokalvårdsartiklar</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : pendingRequests.length === 0 ? (
        <Card className="p-12 text-center">
          <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">Inga väntande begäranden</p>
          <p className="text-gray-500 text-sm mt-2">Alla begäranden har redan granskats</p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Requests List */}
          <div className="lg:col-span-1">
            <div className="space-y-2 max-h-[700px] overflow-y-auto">
              {pendingRequests.map((request) => (
                <button
                  key={request.id}
                  onClick={() => {
                    setSelectedRequest(request);
                    setRejectNotes('');
                  }}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedRequest?.id === request.id
                      ? 'border-[#8B1E1E] bg-[#8B1E1E]/5'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <p className="font-semibold text-gray-900">{request.customer_name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {request.requested_items.length} artikel(r)
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {format(new Date(request.request_date), 'dd MMM HH:mm', { locale: sv })}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Request Details */}
          {selectedRequest && (
            <div className="lg:col-span-2">
              <Card className="p-6 space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Begäran detaljer</h2>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Kund</p>
                      <p className="font-semibold text-gray-900">{selectedRequest.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Begärd av</p>
                      <p className="font-semibold text-gray-900">{selectedRequest.requested_by_name}</p>
                      <p className="text-sm text-gray-500">{selectedRequest.requested_by_email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Datum</p>
                      <p className="font-semibold text-gray-900">
                        {format(new Date(selectedRequest.request_date), 'dd MMMM yyyy HH:mm', { locale: sv })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Begärda artiklar</h3>
                  <div className="space-y-3">
                    {selectedRequest.requested_items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-600">{item.subcategory}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{item.quantity} st</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedRequest.notes && (
                  <div className="border-t pt-6">
                    <p className="text-sm text-gray-600 mb-2">Anteckningar</p>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedRequest.notes}</p>
                  </div>
                )}

                <div className="border-t pt-6 space-y-4">
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">
                      Anteckningar vid avslag (valfritt)
                    </label>
                    <Textarea
                      placeholder="Förklara varför begäran avslås..."
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => approveMutation.mutate(selectedRequest.id)}
                      disabled={approveMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {approveMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Godkänner...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Godkänn
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => rejectMutation.mutate(selectedRequest.id)}
                      disabled={rejectMutation.isPending}
                      variant="outline"
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {rejectMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Avslår...
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 mr-2" />
                          Avslå
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
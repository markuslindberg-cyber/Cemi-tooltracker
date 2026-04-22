import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from '@/api/base44Client';

// Roles that can self-deactivate without a replacement
const SELF_SERVICE_ROLES = ['lokalvårdare', 'verktygsförvaltare'];

export default function DeactivateAccountDialog({ open, onOpenChange, user }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('deactivate');
  const [confirmDelete, setConfirmDelete] = useState('');

  const canSelfDeactivate = SELF_SERVICE_ROLES.includes(user?.role);

  const handleDeactivate = async () => {
    setLoading(true);
    setError('');
    try {
      // Find own TeamMember record
      const members = await base44.entities.TeamMember.filter({ email: user.email });
      const member = members[0];
      if (!member) {
        setError('Kunde inte hitta din teammedlemsprofil.');
        setLoading(false);
        return;
      }

      await base44.functions.invoke('inactivateUser', {
        targetMemberId: member.id,
        replacementMemberId: null,
      });

      // Log out after deactivation
      base44.auth.logout();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Något gick fel.');
      setLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (confirmDelete !== 'PERMANENT_DELETE') {
      setError('Vänligen bekräfta genom att skriva "PERMANENT_DELETE"');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Find own TeamMember record
      const members = await base44.entities.TeamMember.filter({ email: user.email });
      const member = members[0];
      if (!member) {
        setError('Kunde inte hitta din teammedlemsprofil.');
        setLoading(false);
        return;
      }

      // Call permanent delete function
      await base44.functions.invoke('permanentlyDeleteUser', {
        targetMemberId: member.id,
        userEmail: user.email,
      });

      // Log out after deletion
      base44.auth.logout();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Något gick fel.');
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">Kontohantering</AlertDialogTitle>
        </AlertDialogHeader>

        {canSelfDeactivate ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="deactivate">Inaktivera</TabsTrigger>
              <TabsTrigger value="delete" className="text-red-600">Permanent borttagning</TabsTrigger>
            </TabsList>

            <TabsContent value="deactivate" className="space-y-3 py-4">
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm text-gray-600">
                  <p>
                    Är du säker på att du vill <strong>inaktivera</strong> ditt konto? Du kommer inte längre
                    att kunna logga in på ToolTrack.
                  </p>
                  <p>
                    All din historik (ändringsloggar, lån, uttag m.m.) bevaras i systemet
                    och påverkas inte av inaktiveringen.
                  </p>
                  <p className="font-medium text-gray-700">
                    ✓ En administratör kan återaktivera ditt konto vid behov.
                  </p>
                  {error && (
                    <p className="text-red-600 font-medium">{error}</p>
                  )}
                </div>
              </AlertDialogDescription>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel disabled={loading}>Avbryt</AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={handleDeactivate}
                  disabled={loading}
                >
                  {loading ? 'Inaktiverar...' : 'Inaktivera'}
                </Button>
              </AlertDialogFooter>
            </TabsContent>

            <TabsContent value="delete" className="space-y-3 py-4">
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="font-semibold text-red-700 mb-2">⚠️ Varning: Denna åtgärd kan inte ångras</p>
                    <p className="text-red-600">
                      Permanent borttagning raderar ditt konto och <strong>all</strong> associerad data från systemet.
                      Detta kan påverka rapporter och historik som är kopplad till dina åtgärder.
                    </p>
                  </div>
                  <p>
                    För att bekräfta permanent borttagning, vänligen skriv:
                  </p>
                  <input
                    type="text"
                    placeholder="Skriv: PERMANENT_DELETE"
                    value={confirmDelete}
                    onChange={(e) => setConfirmDelete(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  {error && (
                    <p className="text-red-600 font-medium">{error}</p>
                  )}
                </div>
              </AlertDialogDescription>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel disabled={loading}>Avbryt</AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={handlePermanentDelete}
                  disabled={loading || confirmDelete !== 'PERMANENT_DELETE'}
                >
                  {loading ? 'Tar bort...' : 'Radera slutgiltigt'}
                </Button>
              </AlertDialogFooter>
            </TabsContent>
          </Tabs>
        ) : (
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-gray-600 py-4">
              <p>
                Som <strong>{user?.role}</strong> kan du inte inaktivera eller ta bort ditt konto själv.
              </p>
              <p>
                Kontakta en administratör eller ägare för att hantera kontoåtkomst.
                De behöver först utse en ersättare för dina ansvarsområden innan
                kontot kan inaktiveras eller tas bort.
              </p>
              {error && (
                <p className="text-red-600 font-medium">{error}</p>
              )}
            </div>
          </AlertDialogDescription>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
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
import { base44 } from '@/api/base44Client';

// Roles that can self-deactivate without a replacement
const SELF_SERVICE_ROLES = ['lokalvårdare', 'verktygsförvaltare'];

export default function DeactivateAccountDialog({ open, onOpenChange, user }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">Inaktivera konto</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-gray-600">
              {canSelfDeactivate ? (
                <>
                  <p>
                    Är du säker på att du vill inaktivera ditt konto? Du kommer inte längre
                    att kunna logga in på ToolTrack.
                  </p>
                  <p>
                    All din historik (ändringsloggar, lån, uttag m.m.) bevaras i systemet
                    och påverkas inte av inaktiveringen.
                  </p>
                  <p className="font-medium text-gray-700">
                    En administratör kan återaktivera ditt konto vid behov.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Som <strong>{user?.role}</strong> kan du inte inaktivera ditt konto själv.
                  </p>
                  <p>
                    Kontakta en administratör eller ägare för att inaktivera ditt konto.
                    De behöver först utse en ersättare för dina ansvarsområden innan
                    kontot kan inaktiveras.
                  </p>
                </>
              )}
              {error && (
                <p className="text-red-600 font-medium">{error}</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Avbryt</AlertDialogCancel>
          {canSelfDeactivate && (
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={loading}
            >
              {loading ? 'Inaktiverar...' : 'Inaktivera mitt konto'}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
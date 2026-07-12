import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MobileSelect from '@/components/ui/mobile-select';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, UserPlus } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'verktygsförvaltare', label: 'Verktygsförvaltare' },
  { value: 'mekaniker', label: 'Mekaniker' },
  { value: 'admin_lokalvård', label: 'Admin Lokalvård' },
  { value: 'lokalvårdare', label: 'Lokalvårdare' },
  { value: 'admin', label: 'Admin' },
  { value: 'ägare', label: 'Ägare' },
];

export default function InviteUserDialog({ open, onOpenChange }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('verktygsförvaltare');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await base44.functions.invoke('inviteUserAsService', { email: email.trim(), appRole: role });
      toast({ title: 'Inbjudan skickad', description: `En inbjudan har skickats till ${email.trim()}` });
      setEmail('');
      setRole('verktygsförvaltare');
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Kunde inte skicka inbjudan', description: err?.message || 'Något gick fel', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#8B1E1E]" />
            Bjud in användare
          </DialogTitle>
          <DialogDescription>
            Skicka en inbjudan via e-post. Användaren får en länk för att skapa sitt konto.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="invite-email">E-postadress</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="namn@foretag.se"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
          </div>
          <div className="space-y-2">
            <Label>Roll i appen</Label>
            <MobileSelect
              value={role}
              onChange={(v) => setRole(typeof v === 'object' ? v.target.value : v)}
              options={ROLE_OPTIONS}
              placeholder="Välj roll"
            />
            <p className="text-xs text-gray-500">Rollen kan ändras senare under Personal.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button
            onClick={handleInvite}
            disabled={!email.trim() || loading}
            className="bg-[#8B1E1E] hover:bg-[#6B1515]"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Skicka inbjudan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
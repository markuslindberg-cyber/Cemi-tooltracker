import React, { useState, useEffect } from 'react'; // v2
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronsUpDown, Check } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const defaultLocation = {
  name: '',
  type: 'jobsite',
  address: '',
  contacts: [],
  parent_location_id: '',
  parent_location_name: '',
  is_active: true,
  notes: '',
};

export default function LocationFormModal({
  isOpen,
  onClose,
  location,
  onSubmit,
  isLoading,
}) {
  const [formData, setFormData] = useState(defaultLocation);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const { data: allLocations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
    enabled: isOpen,
  });

  useEffect(() => {
    if (location) {
      setFormData({ ...defaultLocation, ...location });
    } else {
      setFormData(defaultLocation);
    }
  }, [location, isOpen]);

  const handleChange = (field, value) => {
    if (field === 'parent_location_id') {
      const parentLoc = allLocations.find(l => l.id === value);
      const primaryContact = parentLoc?.contacts?.find(c => c.is_primary);
      setFormData(prev => ({
        ...prev,
        [field]: value,
        parent_location_name: parentLoc?.name || '',
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleAddContact = () => {
    if (!newContactName.trim()) return;
    const contact = {
      id: Math.random().toString(36).substr(2, 9),
      name: newContactName,
      email: newContactEmail,
      phone: newContactPhone,
      is_primary: formData.contacts.length === 0, // First contact is primary
    };
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, contact]
    }));
    setNewContactName('');
    setNewContactEmail('');
    setNewContactPhone('');
  };

  const handleRemoveContact = (contactId) => {
    setFormData(prev => {
      const updated = prev.contacts.filter(c => c.id !== contactId);
      // If removed was primary, set first as primary
      if (updated.length > 0 && !updated.some(c => c.is_primary)) {
        updated[0].is_primary = true;
      }
      return { ...prev, contacts: updated };
    });
  };

  const handleSetPrimaryContact = (contactId) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map(c => ({
        ...c,
        is_primary: c.id === contactId
      }))
    }));
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const handleClose = () => {
    setFormData(defaultLocation);
    onClose();
  };

  const isEditing = !!location?.id;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditing ? 'Redigera plats' : 'Lägg till ny plats'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Platsnamn *</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="t.ex. Huvudlager"
            />
          </div>

          <div className="space-y-2">
            <Label>Typ *</Label>
            <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jobsite">Arbetsplats</SelectItem>
                <SelectItem value="warehouse">Lager</SelectItem>
                <SelectItem value="office">Kontor</SelectItem>
                <SelectItem value="vehicle">Fordon</SelectItem>
                <SelectItem value="other">Övrigt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Huvudplats (för fordon/satelliter)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {formData.parent_location_name || "Ingen huvudplats"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Sök plats..." />
                  <CommandEmpty>Ingen plats hittades.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    <CommandItem
                      value="none"
                      onSelect={() => handleChange('parent_location_id', '')}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          !formData.parent_location_id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Ingen huvudplats
                    </CommandItem>
                    {allLocations.filter(l => l.id !== location?.id).map((loc) => (
                      <CommandItem
                        key={loc.id}
                        value={loc.name}
                        onSelect={() => handleChange('parent_location_id', loc.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.parent_location_id === loc.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {loc.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Adress</Label>
            <Textarea
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Ange fullständig adress"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label>Kontaktpersoner</Label>
              <div className="space-y-3">
                {formData.contacts.map((contact, idx) => (
                  <div key={contact.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{contact.name}</p>
                        {contact.email && <p className="text-xs text-gray-500">{contact.email}</p>}
                        {contact.phone && <p className="text-xs text-gray-500">{contact.phone}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {contact.is_primary && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Huvudansvarig</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryContact(contact.id)}
                          disabled={contact.is_primary}
                          className="text-xs px-2 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                        >
                          Sätt som huvudansvarig
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveContact(contact.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-2">
                <p className="text-xs font-medium text-gray-600">Lägg till ny kontakt</p>
                <Input
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Namn *"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddContact()}
                />
                <Input
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  placeholder="E-post (valfritt)"
                  type="email"
                />
                <Input
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="Telefon (valfritt)"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddContact}
                  className="w-full"
                >
                  Lägg till kontakt
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Anteckningar</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Lägg till anteckningar..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <Label>Aktiv plats</Label>
              <p className="text-sm text-gray-500">Inaktiva platser visas inte i förflyttningar</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange('is_active', checked)}
            />
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={handleClose}>
            Avbryt
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name || !formData.type || isLoading}
            className="bg-[#8B1E1E] hover:bg-[#6B1515]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sparar...
              </>
            ) : (
              isEditing ? 'Spara ändringar' : 'Lägg till plats'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
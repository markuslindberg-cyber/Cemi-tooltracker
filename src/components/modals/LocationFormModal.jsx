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
  contact_person: '',
  contact_phone: '',
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
      setFormData(prev => ({
        ...prev,
        [field]: value,
        parent_location_name: parentLoc?.name || '',
        // Auto-fill contact info from parent
        contact_person: parentLoc?.contact_person || prev.contact_person,
        contact_phone: parentLoc?.contact_phone || prev.contact_phone,
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
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
            <div className="space-y-2">
              <Label>Ansvarig person</Label>
              <Input
                value={formData.contact_person}
                onChange={(e) => handleChange('contact_person', e.target.value)}
                placeholder="Namn"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefonnummer</Label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => handleChange('contact_phone', e.target.value)}
                placeholder="Telefonnummer"
              />
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
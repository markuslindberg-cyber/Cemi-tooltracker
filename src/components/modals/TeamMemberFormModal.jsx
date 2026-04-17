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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Loader2, ChevronsUpDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const defaultMember = {
  name: '',
  email: '',
  phone: '',
  role: 'admin lokalvård',
  default_location_id: '',
  default_location_name: '',
  location_ids: [],
  location_names: [],
  is_active: true,
  send_invitation: true,
};

export default function TeamMemberFormModal({
  isOpen,
  onClose,
  member,
  locations,
  onSubmit,
  isLoading,
}) {
  const [formData, setFormData] = useState(defaultMember);

  useEffect(() => {
    if (member) {
      setFormData({ ...defaultMember, ...member });
    } else {
      setFormData(defaultMember);
    }
  }, [member, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'default_location_id') {
      const location = locations?.find(l => l.id === value);
      setFormData(prev => ({ ...prev, [field]: value, default_location_name: location?.name || '' }));
    }
  };

  const handleAddLocation = (locationId) => {
    const location = locations?.find(l => l.id === locationId);
    if (!location || formData.location_ids.includes(locationId)) return;
    
    setFormData(prev => ({
      ...prev,
      location_ids: [...prev.location_ids, locationId],
      location_names: [...prev.location_names, location.name]
    }));
  };

  const handleRemoveLocation = (locationId) => {
    setFormData(prev => {
      const idx = prev.location_ids.indexOf(locationId);
      return {
        ...prev,
        location_ids: prev.location_ids.filter(id => id !== locationId),
        location_names: prev.location_names.filter((_, i) => i !== idx)
      };
    });
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const handleClose = () => {
    setFormData(defaultMember);
    onClose();
  };

  const isEditing = !!member?.id;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditing ? 'Redigera teammedlem' : 'Lägg till teammedlem'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Fullständigt namn *</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Anna Svensson"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>E-post</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="anna@exempel.se"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="070-123 45 67"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Roll</Label>
            <Select value={formData.role} onValueChange={(v) => handleChange('role', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="admin lokalvård">Admin Lokalvård</SelectItem>
                <SelectItem value="lokalvårdare">Lokalvårdare</SelectItem>
                <SelectItem value="verktygsförvaltare">Verktygsförvaltare</SelectItem>
                <SelectItem value="ägare">Ägare</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!isEditing && (
            <div className="flex items-center justify-between pt-2">
              <div>
                <Label>Skicka inbjudan via e-post</Label>
                <p className="text-sm text-gray-500">Skicka inbjudningslänk till användaren</p>
              </div>
              <Switch
                checked={formData.send_invitation}
                onCheckedChange={(checked) => handleChange('send_invitation', checked)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Standardplats</Label>
            <Select value={formData.default_location_id} onValueChange={(v) => handleChange('default_location_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Välj standardplats" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Ingen</SelectItem>
                {locations?.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Platser där personen arbetar</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.location_ids.map((id) => {
                const location = locations?.find(l => l.id === id);
                return (
                  <Badge key={id} variant="secondary" className="gap-1">
                    {location?.name || 'Okänd'}
                    <button
                      type="button"
                      onClick={() => handleRemoveLocation(id)}
                      className="hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  Lägg till plats...
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Sök plats..." />
                  <CommandEmpty>Ingen plats hittades.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {locations?.map((location) => (
                      <CommandItem
                        key={location.id}
                        value={location.name}
                        onSelect={() => handleAddLocation(location.id)}
                        disabled={formData.location_ids.includes(location.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.location_ids.includes(location.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {location.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <Label>Aktiv medlem</Label>
              <p className="text-sm text-gray-500">Inaktiva medlemmar visas inte i tilldelningar</p>
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
            disabled={!formData.name || isLoading}
            className="bg-[#8B1E1E] hover:bg-[#6B1515]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sparar...
              </>
            ) : (
              isEditing ? 'Spara ändringar' : 'Lägg till medlem'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
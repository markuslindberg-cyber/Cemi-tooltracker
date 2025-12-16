import React, { useState, useEffect } from 'react';
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
import { Loader2 } from "lucide-react";

const defaultLocation = {
  name: '',
  type: 'jobsite',
  address: '',
  contact_person: '',
  contact_phone: '',
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

  useEffect(() => {
    if (location) {
      setFormData({ ...defaultLocation, ...location });
    } else {
      setFormData(defaultLocation);
    }
  }, [location, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
            {isEditing ? 'Edit Location' : 'Add New Location'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Location Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Main Warehouse"
            />
          </div>

          <div className="space-y-2">
            <Label>Type *</Label>
            <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jobsite">Jobsite</SelectItem>
                <SelectItem value="warehouse">Warehouse</SelectItem>
                <SelectItem value="office">Office</SelectItem>
                <SelectItem value="vehicle">Vehicle</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Enter full address"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input
                value={formData.contact_person}
                onChange={(e) => handleChange('contact_person', e.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => handleChange('contact_phone', e.target.value)}
                placeholder="Phone number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Add any notes..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <Label>Active Location</Label>
              <p className="text-sm text-gray-500">Inactive locations won't appear in transfers</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange('is_active', checked)}
            />
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name || !formData.type || isLoading}
            className="bg-[#8B1E1E] hover:bg-[#6B1515]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              isEditing ? 'Save Changes' : 'Add Location'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
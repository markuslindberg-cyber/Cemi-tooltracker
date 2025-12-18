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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, X, Wrench } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ServiceHistoryPanel from '@/components/ServiceHistoryPanel';
import ServiceRecordModal from '@/components/modals/ServiceRecordModal';

const subcategoryOptions = {
  power_tools: ['Drills', 'Saws', 'Grinders', 'Sanders', 'Impact Drivers', 'Rotary Hammers', 'Other'],
  hand_tools: ['Wrenches', 'Screwdrivers', 'Hammers', 'Pliers', 'Socket Sets', 'Utility Knives', 'Other'],
  measuring: ['Tape Measures', 'Levels', 'Laser Tools', 'Squares', 'Calipers', 'Other'],
  safety: ['Hard Hats', 'Safety Glasses', 'Gloves', 'Harnesses', 'Ear Protection', 'Respirators', 'Other'],
  accessories: ['Batteries', 'Chargers', 'Blades', 'Bits', 'Fasteners', 'Other'],
  heavy_equipment: ['Excavators', 'Loaders', 'Generators', 'Compressors', 'Scaffolding', 'Other'],
  other: ['Other'],
};

const defaultTool = {
  name: '',
  model_number: '',
  category: 'power_tools',
  subcategory: '',
  status: 'available',
  condition: 'good',
  purchase_date: '',
  purchase_price: '',
  location_id: '',
  location_name: '',
  assigned_to_email: '',
  assigned_to_name: '',
  notes: '',
  barcode: '',
  image_url: '',
};

export default function ToolFormModal({
  isOpen,
  onClose,
  tool,
  locations,
  teamMembers,
  onSubmit,
  isLoading,
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(defaultTool);
  const [uploading, setUploading] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);

  const { data: serviceRecords = [] } = useQuery({
    queryKey: ['serviceRecords', tool?.id],
    queryFn: () => tool?.id ? base44.entities.ServiceRecord.filter({ tool_id: tool.id }, '-service_date') : Promise.resolve([]),
    enabled: !!tool?.id && isOpen,
  });

  const createServiceRecordMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['serviceRecords']);
      setShowServiceModal(false);
    },
  });

  useEffect(() => {
    if (tool) {
      setFormData({ ...defaultTool, ...tool });
    } else {
      setFormData(defaultTool);
    }
  }, [tool, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-fill location/person names
    if (field === 'location_id') {
      const location = locations?.find(l => l.id === value);
      setFormData(prev => ({ ...prev, [field]: value, location_name: location?.name || '' }));
    }
    if (field === 'assigned_to_email') {
      const member = teamMembers?.find(m => m.email === value);
      setFormData(prev => ({ ...prev, [field]: value, assigned_to_name: member?.name || '' }));
    }
    // Reset subcategory when category changes
    if (field === 'category') {
      setFormData(prev => ({ ...prev, [field]: value, subcategory: '' }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, image_url: file_url }));
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
    };
    onSubmit(data);
  };

  const handleClose = () => {
    setFormData(defaultTool);
    onClose();
  };

  const isEditing = !!tool?.id;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {isEditing ? 'Edit Tool' : 'Add New Tool'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Tool Details</TabsTrigger>
              {isEditing && <TabsTrigger value="service">Service History</TabsTrigger>}
            </TabsList>

            <TabsContent value="details" className="space-y-6 py-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Tool Image</Label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                {formData.image_url ? (
                  <div className="relative w-full h-full">
                    <img src={formData.image_url} alt="Tool" className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleChange('image_url', '')}
                      className="absolute top-1 right-1 p-1 bg-[#8B1E1E] rounded-full text-white hover:bg-[#6B1515]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : uploading ? (
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild disabled={uploading}>
                  <span>
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tool Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Impact Driver"
              />
            </div>
            <div className="space-y-2">
              <Label>Model / Serial Number</Label>
              <Input
                value={formData.model_number}
                onChange={(e) => handleChange('model_number', e.target.value)}
                placeholder="e.g., 2857-20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={(v) => handleChange('category', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="power_tools">Power Tools</SelectItem>
                  <SelectItem value="hand_tools">Hand Tools</SelectItem>
                  <SelectItem value="measuring">Measuring</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="accessories">Accessories</SelectItem>
                  <SelectItem value="heavy_equipment">Heavy Equipment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subcategory</Label>
              <Select value={formData.subcategory} onValueChange={(v) => handleChange('subcategory', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {subcategoryOptions[formData.category]?.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="missing">Missing</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={formData.condition} onValueChange={(v) => handleChange('condition', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Barcode / Tag ID</Label>
              <Input
                value={formData.barcode}
                onChange={(e) => handleChange('barcode', e.target.value)}
                placeholder="Scan or enter barcode"
              />
            </div>
          </div>

          {/* Purchase Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => handleChange('purchase_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Purchase Price ($)</Label>
              <Input
                type="number"
                value={formData.purchase_price}
                onChange={(e) => handleChange('purchase_price', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={formData.location_id} onValueChange={(v) => handleChange('location_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Not assigned</SelectItem>
                  {locations?.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select value={formData.assigned_to_email} onValueChange={(v) => handleChange('assigned_to_email', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Unassigned</SelectItem>
                  {teamMembers?.map((member) => (
                    <SelectItem key={member.email || member.id} value={member.email}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
            />
              </div>
            </TabsContent>

            {isEditing && (
              <TabsContent value="service" className="space-y-4 py-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Service & Repair History</h3>
                  <Button
                    onClick={() => setShowServiceModal(true)}
                    size="sm"
                    className="bg-[#8B1E1E] hover:bg-[#6B1515]"
                  >
                    <Wrench className="w-4 h-4 mr-2" />
                    Add Service Record
                  </Button>
                </div>
                <ServiceHistoryPanel serviceRecords={serviceRecords} />
              </TabsContent>
            )}
          </Tabs>

          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.category || isLoading}
              className="bg-[#8B1E1E] hover:bg-[#6B1515]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                isEditing ? 'Save Changes' : 'Add Tool'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ServiceRecordModal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        tool={tool}
        onSubmit={(data) => createServiceRecordMutation.mutate(data)}
      />
    </>
  );
}
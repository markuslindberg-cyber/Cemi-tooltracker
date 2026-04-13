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
import { Loader2, Upload, X, Wrench, Check, ChevronsUpDown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ServiceHistoryPanel from '@/components/ServiceHistoryPanel';
import ServiceRecordModal from '@/components/modals/ServiceRecordModal';
import { useMemo } from 'react';



const defaultTool = {
  name: '',
  manufacturer: '',
  model_number: '',
  category: 'power_tools',
  subcategory: '',
  status: 'available',
  condition: 'good',
  purchase_date: '',
  purchase_price: '',
  purchase_location: '',
  invoice_number: '',
  location_id: '',
  location_name: '',
  assigned_to_email: '',
  assigned_to_name: '',
  notes: '',
  barcode: '',
  image_url: '',
  suggested_image_url: '',
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
  const [templateToolId, setTemplateToolId] = useState('');
  const [templateOpen, setTemplateOpen] = useState(false);
  const [searchingImage, setSearchingImage] = useState(false);

  const { data: allTools = [] } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list('-updated_date', 500),
    enabled: isOpen,
  });

  const availableCategories = useMemo(() => {
    return [...new Set(allTools.map(t => t.category).filter(Boolean))].sort();
  }, [allTools]);

  const availableSubcategories = useMemo(() => {
    if (!formData.category) return [];
    return [...new Set(
      allTools.filter(t => t.category === formData.category).map(t => t.subcategory).filter(Boolean)
    )].sort();
  }, [allTools, formData.category]);

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
      setTemplateToolId('');
    }
  }, [tool, isOpen]);

  const handleTemplateSelect = (toolId) => {
    setTemplateToolId(toolId);
    setTemplateOpen(false);
    if (toolId) {
      const templateTool = allTools.find(t => t.id === toolId);
      if (templateTool) {
        setFormData({
          ...defaultTool,
          category: templateTool.category,
          subcategory: templateTool.subcategory,
          condition: templateTool.condition,
          location_id: templateTool.location_id,
          location_name: templateTool.location_name,
        });
      }
    } else {
      setFormData(defaultTool);
    }
  };

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

  const handleSearchImage = async () => {
    setSearchingImage(true);
    try {
      await base44.functions.invoke('findToolImage', { tool_id: tool?.id });
      queryClient.invalidateQueries(['tools']);
    } catch (error) {
      console.error('Image search failed:', error);
    } finally {
      setSearchingImage(false);
    }
  };

  const handleApproveImage = async () => {
    if (formData.suggested_image_url) {
      setFormData(prev => ({
        ...prev,
        image_url: prev.suggested_image_url,
        suggested_image_url: ''
      }));

      // Ask if user wants to update all tools with same model
      if (formData.manufacturer && formData.model_number) {
        const shouldUpdateAll = window.confirm(
          `Vill du uppdatera alla maskiner av typ "${formData.manufacturer} ${formData.model_number}" med denna bild?`
        );

        if (shouldUpdateAll) {
          try {
            const matchingTools = allTools.filter(
              t => t.manufacturer === formData.manufacturer &&
                   t.model_number === formData.model_number &&
                   t.id !== tool?.id
            );

            // Update all matching tools in bulk
            await Promise.all(
              matchingTools.map(t =>
                base44.entities.Tool.update(t.id, { image_url: formData.suggested_image_url })
              )
            );

            queryClient.invalidateQueries(['tools']);
          } catch (error) {
            console.error('Bulk update failed:', error);
          }
        }
      }
    }
  };

  const handleRejectImage = async () => {
    setFormData(prev => ({
      ...prev,
      suggested_image_url: ''
    }));
    // Search for next image automatically
    setSearchingImage(true);
    try {
      await base44.functions.invoke('findToolImage', { tool_id: tool?.id });
      queryClient.invalidateQueries(['tools']);
    } catch (error) {
      console.error('Image search failed:', error);
    } finally {
      setSearchingImage(false);
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
    setTemplateToolId('');
    onClose();
  };

  const isEditing = !!tool?.id;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {isEditing ? 'Redigera verktyg' : 'Lägg till nytt verktyg'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Verktygsdetaljer</TabsTrigger>
              {isEditing && <TabsTrigger value="service">Servicehistorik</TabsTrigger>}
            </TabsList>

            <TabsContent value="details" className="space-y-6 py-4">
          {/* Template Selection - only show when adding new tool */}
          {!isEditing && (
            <div className="space-y-2 pb-4 border-b border-gray-200">
              <Label>Starta från mall (valfritt)</Label>
              <Popover open={templateOpen} onOpenChange={setTemplateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={templateOpen}
                    className="w-full justify-between"
                  >
                    {templateToolId
                      ? allTools?.find((t) => t.id === templateToolId)?.name + 
                        (allTools?.find((t) => t.id === templateToolId)?.model_number 
                          ? ` - ${allTools?.find((t) => t.id === templateToolId)?.model_number}` 
                          : '')
                      : "Start from scratch or search existing tool..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Sök verktyg..." />
                    <CommandEmpty>Inget verktyg hittades.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      <CommandItem
                        value="scratch"
                        onSelect={() => handleTemplateSelect('')}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            templateToolId === '' ? "opacity-100" : "opacity-0"
                          )}
                        />
                        Börja från grunden
                      </CommandItem>
                      {allTools?.map((t) => (
                        <CommandItem
                          key={t.id}
                          value={`${t.name} ${t.model_number || ''}`}
                          onSelect={() => handleTemplateSelect(t.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              templateToolId === t.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {t.name} {t.model_number ? `- ${t.model_number}` : ''}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {templateToolId && (
                <p className="text-xs text-gray-500">Kategori, underkategori, skick och plats kopierades från mallen</p>
              )}
            </div>
          )}

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Verktygsbild</Label>
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
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span>
                      {uploading ? 'Laddar upp...' : 'Ladda upp bild'}
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                {isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSearchImage}
                    disabled={searchingImage || !formData.name}
                  >
                    {searchingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Söker...
                      </>
                    ) : (
                      'Sök bild (AI)'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Suggested Image Approval */}
          {formData.suggested_image_url && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-blue-900">AI hittade en bild - godkänn eller avslå:</p>
              <div className="w-full h-48 bg-white rounded-lg overflow-hidden border border-blue-100">
                <img src={formData.suggested_image_url} alt="Suggested" className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleApproveImage}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Godkänn bild
                </Button>
                <Button
                  onClick={handleRejectImage}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Avslå
                </Button>
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Verktygsnamn *</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="t.ex. Slagskruvdragare"
              />
            </div>
            <div className="space-y-2">
              <Label>Tillverkare</Label>
              <Input
                value={formData.manufacturer}
                onChange={(e) => handleChange('manufacturer', e.target.value)}
                placeholder="t.ex. DeWalt, Milwaukee, Makita"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Modell / Serienummer</Label>
              <Input
                value={formData.model_number}
                onChange={(e) => handleChange('model_number', e.target.value)}
                placeholder="t.ex. 2857-20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kategori *</Label>
              <Input
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                placeholder="t.ex. Elmaskiner, Handverktyg, etc."
                list="category-suggestions"
              />
              <datalist id="category-suggestions">
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>Underkategori</Label>
              <Input
                value={formData.subcategory}
                onChange={(e) => handleChange('subcategory', e.target.value)}
                placeholder="t.ex. Husqvarna, Stihl, etc."
                list="subcategory-suggestions"
              />
              <datalist id="subcategory-suggestions">
                {availableSubcategories.map((sub) => (
                  <option key={sub} value={sub} />
                ))}
              </datalist>
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
                   <SelectItem value="available">Tillgänglig</SelectItem>
                   <SelectItem value="in_use">I bruk</SelectItem>
                   <SelectItem value="maintenance">Underhåll</SelectItem>
                   <SelectItem value="missing">Saknas</SelectItem>
                   <SelectItem value="retired">Kasserad</SelectItem>
                   <SelectItem value="sålda">Såld</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Skick</Label>
              <Select value={formData.condition} onValueChange={(v) => handleChange('condition', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Ny</SelectItem>
                  <SelectItem value="good">Bra</SelectItem>
                  <SelectItem value="fair">Okej</SelectItem>
                  <SelectItem value="poor">Dålig</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Streckkod / Tag-ID</Label>
              <Input
                value={formData.barcode}
                onChange={(e) => handleChange('barcode', e.target.value)}
                placeholder="Skanna eller ange streckkod"
              />
            </div>
          </div>

          {/* Purchase Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Inköpsdatum</Label>
              <Input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => handleChange('purchase_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Inköpspris (kr)</Label>
              <Input
                type="number"
                value={formData.purchase_price}
                onChange={(e) => handleChange('purchase_price', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Köpt från</Label>
              <Input
                value={formData.purchase_location}
                onChange={(e) => handleChange('purchase_location', e.target.value)}
                placeholder="t.ex. Bauhaus, Clas Ohlson, lokalt järnhandel"
              />
            </div>
            <div className="space-y-2">
              <Label>Fakturanummer</Label>
              <Input
                value={formData.invoice_number}
                onChange={(e) => handleChange('invoice_number', e.target.value)}
                placeholder="t.ex. FAK-12345"
              />
            </div>
          </div>

          {/* Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plats</Label>
              <Select value={formData.location_id} onValueChange={(v) => handleChange('location_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj plats" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Ej tilldelad</SelectItem>
                  {locations?.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Anteckningar</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Lägg till eventuella anteckningar..."
              rows={3}
            />
              </div>
            </TabsContent>

            {isEditing && (
              <TabsContent value="service" className="space-y-4 py-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Service- och reparationshistorik</h3>
                  <Button
                    onClick={() => setShowServiceModal(true)}
                    size="sm"
                    className="bg-[#8B1E1E] hover:bg-[#6B1515]"
                  >
                    <Wrench className="w-4 h-4 mr-2" />
                    Lägg till servicepost
                  </Button>
                </div>
                <ServiceHistoryPanel serviceRecords={serviceRecords} />
              </TabsContent>
            )}
          </Tabs>

          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={handleClose}>
              Avbryt
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.category || isLoading}
              className="bg-[#8B1E1E] hover:bg-[#6B1515]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sparar...
                </>
              ) : (
                isEditing ? 'Spara ändringar' : 'Lägg till verktyg'
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
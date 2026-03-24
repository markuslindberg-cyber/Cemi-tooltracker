import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const categories = [
  'Arbetskläder varsel',
  'Arbetskläder',
  'Skor',
  'Skyddsutrustning',
];

const subcategoriesByCategory = {
  'Arbetskläder varsel': [
    'Shorts',
    'Knäbyxor',
    'Stretchbyxor',
    'Snickarbyxor',
    'Termobyxor',
    'Piké-trojor',
    'Fleecejackor',
    'Västar',
    'Vinterjacka',
  ],
  'Arbetskläder': [
    'Termounderställ',
    'Mössor',
    'Sommarhandskar',
    'Vinterhandskar',
    'Kepsar',
    'Shorts',
    'Knäbyxor',
    'Stretchbyxor',
    'Snickarbyxor',
    'Piké-trojor',
    'Termobyxor',
    'Fleecejackor',
    'Skaljackor',
    'Regnkläder/varsel',
  ],
  'Skor': [
    'Skyddsskor',
    'Vinterskor',
    'Gummistövlar',
    'Sågstövlar',
  ],
  'Skyddsutrustning': [
    'Hörselskydd',
    'Skyddsglasogon',
    'Skyddshälmar',
    'Munskydd',
  ],
};

const handskeSizes = ['12', '11', '10', '9', '8', '7'];

const sizesByCategory = {
  'Arbetskläder varsel': ['XXL', 'XL', 'L', 'M', 'S', 'XS', 'XXS'],
  'Arbetskläder': ['XXL', 'XL', 'L', 'M', 'S', 'XS', 'XXS'],
  'Skor': ['47', '46', '45', '44', '43', '42', '41', '40', '39', '38', '37', '36', '35'],
  'Skyddsutrustning': ['XXL', 'XL', 'L', 'M', 'S', 'XS', 'XXS'],
  'Sommarhandskar': handskeSizes,
  'Vinterhandskar': handskeSizes,
};

const statuses = ['i_lager', 'i_bruk', 'saknas', 'kasserad'];
const conditions = ['ny', 'bra', 'okej', 'dålig'];

const statusLabels = {
  i_lager: 'I lager',
  i_bruk: 'I bruk',
  saknas: 'Saknas',
  kasserad: 'Kasserad',
};

const conditionLabels = {
  ny: 'Ny',
  bra: 'Bra',
  okej: 'Okej',
  dålig: 'Dålig',
};

export default function ArbetskläderUtrustningFormModal({
  isOpen,
  onClose,
  item,
  locations,
}) {
  const [formData, setFormData] = useState({
    name: '',
    manufacturer: '',
    category: '',
    subcategory: '',
    size: '',
    quantity: 0,
    status: 'i_lager',
    condition: 'bra',
    location_id: '',
    location_name: '',
    purchase_date: '',
    purchase_price: '',
    barcode: '',
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [customSubcategory, setCustomSubcategory] = useState('');
  const [showCustomSubcategory, setShowCustomSubcategory] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        manufacturer: item.manufacturer || '',
        category: item.category || '',
        subcategory: item.subcategory || '',
        size: item.size || '',
        quantity: item.quantity || 0,
        status: item.status || 'i_lager',
        condition: item.condition || 'bra',
        location_id: item.location_id || '',
        location_name: item.location_name || '',
        purchase_date: item.purchase_date || '',
        purchase_price: item.purchase_price || '',
        barcode: item.barcode || '',
        notes: item.notes || '',
      });
      setCustomSubcategory('');
      setShowCustomSubcategory(false);
    } else {
      setFormData({
        name: '',
        manufacturer: '',
        category: '',
        subcategory: '',
        size: '',
        quantity: 0,
        status: 'i_lager',
        condition: 'bra',
        location_id: '',
        location_name: '',
        purchase_date: '',
        purchase_price: '',
        barcode: '',
        notes: '',
      });
    }
  }, [item, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'location_id') {
        const selectedLocation = locations.find(l => l.id === value);
        updated.location_name = selectedLocation?.name || '';
      }
      if (field === 'category') {
        updated.subcategory = '';
        setShowCustomSubcategory(false);
        setCustomSubcategory('');
      }
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.category) {
      toast.error('Namn och kategori är obligatoriska');
      return;
    }

    setIsLoading(true);
    try {
      const dataToSubmit = {
        ...formData,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      };

      if (item) {
        await base44.entities.ArbetskläderUtrustning.update(item.id, dataToSubmit);
        toast.success('Artikel uppdaterad');
      } else {
        await base44.entities.ArbetskläderUtrustning.create(dataToSubmit);
        toast.success('Artikel tillagd');
      }
      onClose();
    } catch (error) {
      toast.error('Ett fel uppstod: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Redigera artikel' : 'Ny artikel'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Namn */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Namn *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="T.ex. Arbetskjorta"
            />
          </div>

          {/* Tillverkare */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tillverkare
            </label>
            <Input
              value={formData.manufacturer}
              onChange={(e) => handleChange('manufacturer', e.target.value)}
              placeholder="T.ex. Nike"
            />
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori *
            </label>
            <Select value={formData.category} onValueChange={(v) => handleChange('category', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Välj kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subcategory */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Typ av plagg
            </label>
            {!showCustomSubcategory ? (
              <Select value={formData.subcategory} onValueChange={(v) => {
                if (v === '__custom__') {
                  setShowCustomSubcategory(true);
                  setCustomSubcategory('');
                } else {
                  handleChange('subcategory', v);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj typ" />
                </SelectTrigger>
                <SelectContent>
                  {formData.category && subcategoriesByCategory[formData.category]?.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">+ Lägg till egen</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={customSubcategory}
                  onChange={(e) => setCustomSubcategory(e.target.value)}
                  placeholder="Ny underkategori"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (customSubcategory.trim()) {
                      handleChange('subcategory', customSubcategory.trim());
                      setShowCustomSubcategory(false);
                    }
                  }}
                  className="whitespace-nowrap"
                >
                  OK
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCustomSubcategory(false);
                    setCustomSubcategory('');
                  }}
                  className="whitespace-nowrap"
                >
                  Avbryt
                </Button>
              </div>
            )}
          </div>

          {/* Storlek */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Storlek
            </label>
            <Select value={formData.size} onValueChange={(v) => handleChange('size', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Välj storlek" />
              </SelectTrigger>
              <SelectContent>
                {(sizesByCategory[formData.subcategory] || sizesByCategory[formData.category] || sizesByCategory['Arbetskläder varsel']).map((size) => (
                  <SelectItem key={size} value={size}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Antal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Antal
            </label>
            <Input
              type="number"
              value={formData.quantity}
              onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 0)}
              placeholder="0"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Skick */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Skick
            </label>
            <Select value={formData.condition} onValueChange={(v) => handleChange('condition', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {conditions.map((cond) => (
                  <SelectItem key={cond} value={cond}>
                    {conditionLabels[cond]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Plats */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plats
            </label>
            <Select value={formData.location_id} onValueChange={(v) => handleChange('location_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Välj plats" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Köpdata */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Köpsdatum
              </label>
              <Input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => handleChange('purchase_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Köppris
              </label>
              <Input
                type="number"
                value={formData.purchase_price}
                onChange={(e) => handleChange('purchase_price', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Streckkod */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Streckkod
            </label>
            <Input
              value={formData.barcode}
              onChange={(e) => handleChange('barcode', e.target.value)}
              placeholder="Streckkod"
            />
          </div>

          {/* Anteckningar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anteckningar
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Lägg till anteckningar..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Sparar...' : 'Spara'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
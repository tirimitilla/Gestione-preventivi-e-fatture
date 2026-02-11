
import React, { useState, useEffect } from 'react';
import { Product, Category } from '../types';
import Modal from './Modal';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Omit<Product, 'id'>, productId?: string) => void;
  productToEdit?: Product | null;
  categories: Category[];
  selectedCategoryId: string;
}

const ProductForm: React.FC<ProductFormProps> = ({ isOpen, onClose, onSave, productToEdit, categories, selectedCategoryId }) => {
  const initialFormState: Omit<Product, 'id'> = {
    categoryId: selectedCategoryId || '',
    codiceProdotto: '',
    prodotto: '',
    quantita: 1,
    prezzoAcquisto: 0,
    prezzoVendita: 0,
  };

  const [formData, setFormData] = useState<Omit<Product, 'id'>>(initialFormState);
  const [profitPercentage, setProfitPercentage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (productToEdit) {
        setFormData({
          categoryId: productToEdit.categoryId,
          codiceProdotto: productToEdit.codiceProdotto,
          prodotto: productToEdit.prodotto,
          quantita: productToEdit.quantita,
          prezzoAcquisto: productToEdit.prezzoAcquisto,
          prezzoVendita: productToEdit.prezzoVendita,
        });
      } else {
        setFormData({
          ...initialFormState,
          categoryId: selectedCategoryId,
        });
      }
    }
  }, [productToEdit, isOpen, selectedCategoryId]);

  useEffect(() => {
    const { prezzoAcquisto, prezzoVendita } = formData;
    if (prezzoAcquisto > 0) {
      const margin = prezzoVendita - prezzoAcquisto;
      const percentage = (margin / prezzoAcquisto) * 100;
      setProfitPercentage(percentage.toFixed(0));
    } else {
      setProfitPercentage('');
    }
  }, [formData.prezzoAcquisto, formData.prezzoVendita]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumeric = ['quantita', 'prezzoAcquisto', 'prezzoVendita'].includes(name);
    
    const numericValue = isNumeric ? parseFloat(value.replace(',', '.')) || 0 : value;

    setFormData(prev => {
        let newFormData = { ...prev, [name]: numericValue };

        // Recalculate selling price if purchase price or category changes
        if (name === 'prezzoAcquisto' || name === 'categoryId') {
            const catId = name === 'categoryId' ? value : newFormData.categoryId;
            const purchasePrice = name === 'prezzoAcquisto' ? numericValue as number : newFormData.prezzoAcquisto;

            const category = categories.find(c => c.id === catId);
            if (category && typeof purchasePrice === 'number' && purchasePrice >= 0) {
                const calculatedPrice = purchasePrice * (1 + category.profitMargin / 100);
                newFormData.prezzoVendita = calculatedPrice;
            }
        }
        return newFormData;
    });
  };
  
  const handleProfitPercentageChange = (value: string) => {
    setProfitPercentage(value);
    const percentage = parseInt(value, 10);
    if (!isNaN(percentage) && formData.prezzoAcquisto >= 0) {
      const newSellingPrice = formData.prezzoAcquisto * (1 + percentage / 100);
      setFormData(prev => ({ ...prev, prezzoVendita: newSellingPrice }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) {
        alert("Per favore, seleziona una categoria.");
        return;
    }
    onSave(formData, productToEdit?.id);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={productToEdit ? 'Modifica Prodotto' : 'Nuovo Prodotto'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Prodotto</label>
          <input type="text" name="prodotto" value={formData.prodotto} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Codice Prodotto</label>
                <input type="text" name="codiceProdotto" value={formData.codiceProdotto} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Categoria</label>
                <select name="categoryId" value={formData.categoryId} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-white" required>
                    <option value="" disabled>Seleziona...</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
            </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div>
                <label className="block text-sm font-medium text-gray-700">Quantità</label>
                <input type="number" name="quantita" value={formData.quantita} onChange={handleChange} min="0" className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">P. Acquisto (€)</label>
                <input type="number" name="prezzoAcquisto" value={formData.prezzoAcquisto} onChange={handleChange} min="0" step="any" className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700">% Guadagno</label>
                <div className="relative">
                    <input 
                        type="number" 
                        value={profitPercentage} 
                        onChange={e => handleProfitPercentageChange(e.target.value)} 
                        min="0"
                        step="1"
                        className="mt-1 w-full p-2 border rounded-md"
                    />
                     <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">%</span>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">P. Vendita (€)</label>
                <input type="number" name="prezzoVendita" value={formData.prezzoVendita.toFixed(2)} onChange={handleChange} min="0" step="any" className="mt-1 w-full p-2 border rounded-md bg-indigo-50 font-bold" />
            </div>
        </div>
        <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Annulla</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Salva Prodotto</button>
        </div>
      </form>
    </Modal>
  );
};

export default ProductForm;
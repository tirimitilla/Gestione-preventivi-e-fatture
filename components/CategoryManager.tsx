
import React, { useState } from 'react';
import { Category } from '../types';

interface CategoryManagerProps {
  categories: Category[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  onAddCategory: (categoryName: string, profitMargin: number, vatRate: number) => Promise<any>;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, selectedCategoryId, onCategoryChange, onAddCategory }) => {
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryMargin, setNewCategoryMargin] = useState<number>(40);
  const [newCategoryVat, setNewCategoryVat] = useState<number>(22);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setIsAddingCategory(true);
    try {
        await onAddCategory(newCategoryName, newCategoryMargin, newCategoryVat);
        setNewCategoryName('');
        setNewCategoryMargin(40);
        setNewCategoryVat(22);
        setShowNewCategoryForm(false);
    } catch (error) {
        // Error is handled in the parent component
    } finally {
        setIsAddingCategory(false);
    }
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
          <label htmlFor="categorySelect" className="block text-sm font-medium text-gray-700 mb-1">Categoria Principale</label>
          <select
            id="categorySelect"
            value={selectedCategoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Seleziona una categoria...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div className="self-end">
            <button onClick={() => setShowNewCategoryForm(!showNewCategoryForm)} className="w-full md:w-auto px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition">
                + Nuova Categoria
            </button>
        </div>
      </div>

      {showNewCategoryForm && (
        <form onSubmit={handleAddCategory} className="mt-4 p-4 bg-gray-50 rounded-md border">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-grow">
              <label htmlFor="newCategory" className="block text-sm font-medium text-gray-700">Nome nuova categoria</label>
              <input
                type="text"
                id="newCategory"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Es: Materiale Idraulico"
                className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div className="w-full sm:w-32">
              <label htmlFor="newCategoryMargin" className="block text-sm font-medium text-gray-700">% Guadagno</label>
              <input
                    type="number"
                    id="newCategoryMargin"
                    value={newCategoryMargin}
                    onChange={e => setNewCategoryMargin(parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full p-2 border rounded-md"
                    required
                />
            </div>
             <div className="w-full sm:w-32">
              <label htmlFor="newCategoryVat" className="block text-sm font-medium text-gray-700">IVA (%)</label>
              <input
                    type="number"
                    id="newCategoryVat"
                    value={newCategoryVat}
                    onChange={e => setNewCategoryVat(parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full p-2 border rounded-md"
                    required
                />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <button type="submit" disabled={isAddingCategory} className="flex-1 sm:flex-none px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-green-300 transition">
                    {isAddingCategory ? '...' : 'Crea'}
                </button>
                <button type="button" onClick={() => setShowNewCategoryForm(false)} className="flex-1 sm:flex-none px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">
                    Annulla
                </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default CategoryManager;

import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import Modal from './Modal';
import { SearchIcon, PlusIcon } from './icons';

interface AddMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  allProducts: Product[];
  onAddProduct: (productId: string) => void;
  existingProductIds: Set<string>;
}

const AddMaterialModal: React.FC<AddMaterialModalProps> = ({ isOpen, onClose, allProducts, onAddProduct, existingProductIds }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = useMemo(() => {
    const availableProducts = allProducts.filter(p => !existingProductIds.has(p.id));
    if (!searchTerm) return availableProducts;
    return availableProducts.filter(p =>
      p.prodotto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codiceProdotto.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allProducts, searchTerm, existingProductIds]);

  const handleAdd = (productId: string) => {
    onAddProduct(productId);
    onClose(); // Close modal after adding a product
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Aggiungi Materiale al Cantiere" size="lg">
      <div className="relative mb-4">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cerca prodotto per nome o codice..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-md"
        />
      </div>
      <div className="max-h-96 overflow-y-auto">
        {filteredProducts.map(product => (
          <div key={product.id} className="flex justify-between items-center p-2 border-b hover:bg-gray-50">
            <div>
              <p className="font-semibold">{product.prodotto}</p>
              <p className="text-sm text-gray-500">Cod: {product.codiceProdotto} - Disp: {product.quantita}</p>
            </div>
            <button onClick={() => handleAdd(product.id)} className="p-2 text-primary-blue hover:opacity-80 rounded-full hover:bg-indigo-100">
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>
        ))}
        {filteredProducts.length === 0 && <p className="text-center text-gray-500 p-4">Nessun prodotto trovato o tutti i prodotti sono già stati aggiunti.</p>}
      </div>
    </Modal>
  );
};

export default AddMaterialModal;

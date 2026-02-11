
import React from 'react';
import { Product } from '../types';
import { EditIcon, TrashIcon } from './icons';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onDelete }) => {
  const margin = product.prezzoVendita - product.prezzoAcquisto;
  const percMargin = product.prezzoAcquisto > 0 ? (margin / product.prezzoAcquisto) * 100 : 0;
  const marginClass = margin >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <div className="bg-white rounded-lg shadow-md p-4 flex flex-col justify-between transition-shadow hover:shadow-lg">
      <div>
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-800">{product.prodotto}</h3>
            <p className="text-xs text-gray-500">Cod: {product.codiceProdotto}</p>
          </div>
          <div className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-3 py-1 rounded-full">
            x{product.quantita}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div className="bg-gray-50 p-2 rounded">
            <p className="text-gray-500 text-xs">Acquisto</p>
            <p className="font-semibold text-gray-700">€{product.prezzoAcquisto.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <p className="text-gray-500 text-xs">Vendita</p>
            <p className="font-semibold text-gray-700">€{product.prezzoVendita.toFixed(2)}</p>
          </div>
        </div>
        
        <div className="bg-blue-50 p-3 rounded-md text-center">
            <p className="text-blue-500 text-xs">Margine</p>
            <p className={`font-bold text-md ${marginClass}`}>
                €{margin.toFixed(2)} ({percMargin.toFixed(1)}%)
            </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button
          onClick={() => onEdit(product)}
          className="flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-center text-yellow-800 bg-yellow-100 rounded-lg hover:bg-yellow-200 focus:ring-4 focus:outline-none focus:ring-yellow-300 transition"
        >
          <EditIcon className="w-4 h-4 mr-2" />
          Modifica
        </button>
        <button
          onClick={() => onDelete(product.id)}
          className="flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-center text-red-800 bg-red-100 rounded-lg hover:bg-red-200 focus:ring-4 focus:outline-none focus:ring-red-300 transition"
        >
          <TrashIcon className="w-4 h-4 mr-2" />
          Elimina
        </button>
      </div>
    </div>
  );
};

export default ProductCard;

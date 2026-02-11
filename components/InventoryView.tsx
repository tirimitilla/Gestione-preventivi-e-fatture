import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, Category } from '../types';
import * as api from '../services/apiService';
import CategoryManager from './CategoryManager';
import ProductImportControls from './ProductImportControls';
import ProductList from './ProductList';
import SearchBar from './SearchBar';
import Spinner from './Spinner';
import ProductForm from './ProductForm';
import { PlusIcon } from './icons';
import PostImportReviewModal from './PostImportReviewModal';

interface InventoryViewProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  showAlert: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const InventoryView: React.FC<InventoryViewProps> = ({ categories, setCategories, showAlert }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [isPostImportModalOpen, setIsPostImportModalOpen] = useState(false);
  const [importData, setImportData] = useState<{ products: Omit<Product, 'id'>[], signature: string | null }>({ products: [], signature: null });
  
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const loadProducts = useCallback(async (categoryId: string) => {
    if (!categoryId) {
      setProducts([]);
      return;
    }
    setIsLoading(true);
    try {
      const prods = await api.getProducts(categoryId);
      setProducts(prods);
    } catch (error) {
      showAlert('Errore nel caricamento dei prodotti', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadProducts(selectedCategoryId);
  }, [selectedCategoryId, loadProducts]);
  
  const handleAddCategory = async (categoryName: string, profitMargin: number, vatRate: number) => {
    try {
      const newCategory = await api.createCategory(categoryName, profitMargin, vatRate);
      setCategories(prev => [...prev, newCategory]);
      showAlert('Categoria creata con successo', 'success');
      return newCategory;
    } catch (error) {
      showAlert('Errore: Categoria già esistente', 'error');
      throw error;
    }
  };

  const handleOpenFormModal = (product: Product | null) => {
    setProductToEdit(product);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setProductToEdit(null);
    setIsFormModalOpen(false);
  };

  const handleSaveProduct = async (productData: Omit<Product, 'id'>, productId?: string) => {
    try {
      if (productId) {
        await api.updateProduct(productId, productData);
        showAlert('Prodotto aggiornato con successo', 'success');
      } else {
        await api.addProduct(productData);
        showAlert('Prodotto aggiunto con successo', 'success');
      }
      handleCloseFormModal();
      if (productData.categoryId !== selectedCategoryId) {
        setSelectedCategoryId(productData.categoryId);
      } else {
        loadProducts(productData.categoryId);
      }
    } catch (error) {
       showAlert(error instanceof Error ? error.message : 'Errore nel salvataggio del prodotto', 'error');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo prodotto?')) {
      try {
        await api.deleteProduct(productId);
        showAlert('Prodotto eliminato', 'success');
        loadProducts(selectedCategoryId);
      } catch (error) {
        showAlert('Errore nell\'eliminazione del prodotto', 'error');
      }
    }
  };

  const handleImportSuccess = (stagedProducts: Omit<Product, 'id'>[], signature: string) => {
      if (stagedProducts.length > 0) {
          setImportData({ products: stagedProducts, signature });
          setIsPostImportModalOpen(true);
      } else {
        showAlert("Nessun prodotto valido trovato nel file.", 'warning');
      }
  };

  const handleReviewSave = async () => {
      setIsPostImportModalOpen(false);
      setImportData({ products: [], signature: null });
      // Data has changed, so we need a full refresh
      setIsLoading(true);
      try {
          const cats = await api.getCategories();
          setCategories(cats);
          
          const currentCategoryStillExists = cats.some(c => c.id === selectedCategoryId);
          if (currentCategoryStillExists) {
              await loadProducts(selectedCategoryId);
          } else if (cats.length > 0) {
              setSelectedCategoryId(cats[0].id);
          } else {
              setProducts([]);
          }
      } catch (e) {
          showAlert("Errore durante l'aggiornamento dei dati.", 'error');
      } finally {
          setIsLoading(false);
      }
      showAlert("Inventario aggiornato!", "success");
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.prodotto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codiceProdotto.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  return (
    <div>
      <ProductImportControls 
        categories={categories}
        onImportSuccess={handleImportSuccess}
        showAlert={showAlert}
      />
      <CategoryManager 
        categories={categories} 
        selectedCategoryId={selectedCategoryId} 
        onCategoryChange={setSelectedCategoryId}
        onAddCategory={handleAddCategory}
      />
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            <h2 className="text-xl font-bold text-gray-800 flex-shrink-0">Lista Prodotti</h2>
            <div className="flex-grow sm:flex-grow-0 sm:w-auto md:w-72">
                <SearchBar onSearch={setSearchTerm} />
            </div>
            <button 
                onClick={() => handleOpenFormModal(null)}
                className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={!selectedCategoryId}
                title={!selectedCategoryId ? 'Seleziona prima una categoria' : 'Aggiungi un nuovo prodotto'}
            >
                <PlusIcon className="w-5 h-5 mr-2" />
                Nuovo Prodotto
            </button>
        </div>
        {isLoading ? (
          <Spinner />
        ) : (
          <ProductList 
            products={filteredProducts} 
            onEdit={handleOpenFormModal} 
            onDelete={handleDeleteProduct} 
          />
        )}
      </div>
      <ProductForm 
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        onSave={handleSaveProduct}
        productToEdit={productToEdit}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
      />
      <PostImportReviewModal
          isOpen={isPostImportModalOpen}
          onClose={handleReviewSave}
          products={importData.products}
          categories={categories}
          onSave={handleReviewSave}
          showAlert={showAlert}
          signature={importData.signature}
      />
    </div>
  );
};

export default InventoryView;
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Category } from '../types';
import * as api from '../services/apiService';
import Modal from './Modal';
import Spinner from './Spinner';
import { PlusIcon } from './icons';

type StagedProduct = Omit<Product, 'id'>;

interface PostImportReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: StagedProduct[];
  categories: Category[];
  onSave: () => void;
  showAlert: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  signature: string | null;
}

const PostImportReviewModal: React.FC<PostImportReviewModalProps> = ({ isOpen, onClose, products, categories, onSave, showAlert, signature }) => {
  const [editableProducts, setEditableProducts] = useState<StagedProduct[]>([]);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);
  const [profitPercentage, setProfitPercentage] = useState<number | string>('');
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [isSingleSaving, setIsSingleSaving] = useState(false);

  const [localCategories, setLocalCategories] = useState<Category[]>([]);

  const [showNewCatForm, setShowNewCatForm] = useState(false);
  const [newCatData, setNewCatData] = useState({ name: '', profitMargin: 40, vatRate: 22 });

  useEffect(() => {
    if (isOpen) {
      setLocalCategories(categories);
      if (products.length > 0) {
        setEditableProducts(products.map(p => ({...p})));
        setSelectedProductIndex(0);
      }
    } else {
      setEditableProducts([]);
      setSelectedProductIndex(null);
      setShowNewCatForm(false);
    }
  }, [isOpen, products, categories]);

  const selectedProduct = useMemo(() => {
    if (selectedProductIndex === null) return null;
    return editableProducts[selectedProductIndex];
  }, [selectedProductIndex, editableProducts]);

  useEffect(() => {
    if (selectedProduct) {
        const margin = selectedProduct.prezzoVendita - selectedProduct.prezzoAcquisto;
        const percentage = selectedProduct.prezzoAcquisto > 0 ? (margin / selectedProduct.prezzoAcquisto) * 100 : 0;
        setProfitPercentage(percentage > 0 ? Math.round(percentage) : '');
    } else {
        setProfitPercentage('');
    }
  }, [selectedProduct]);

  const updateSelectedProduct = (updatedProduct: StagedProduct) => {
    if (selectedProductIndex === null) return;
    setEditableProducts(prev => {
      const newProducts = [...prev];
      newProducts[selectedProductIndex] = updatedProduct;
      return newProducts;
    });
  };
  
  const handleFieldChange = (field: keyof StagedProduct, value: string | number) => {
    if (!selectedProduct) return;
    let updatedProduct = { ...selectedProduct, [field]: value };
    updateSelectedProduct(updatedProduct);
  };

  const handlePriceChange = (field: 'prezzoAcquisto' | 'prezzoVendita', value: number) => {
    if (!selectedProduct) return;
    updateSelectedProduct({ ...selectedProduct, [field]: value });
  }

  const handleProfitPercentageChange = (value: string) => {
    setProfitPercentage(value);
    if (!selectedProduct) return;
    const percentage = parseFloat(value);
    if (!isNaN(percentage) && selectedProduct.prezzoAcquisto >= 0) {
        const newSellingPrice = selectedProduct.prezzoAcquisto * (1 + percentage / 100);
        updateSelectedProduct({ ...selectedProduct, prezzoVendita: newSellingPrice });
    }
  }

  const handleAddNewCategory = async () => {
    const { name, profitMargin, vatRate } = newCatData;
    if (!name) {
        showAlert("Inserisci un nome per la nuova categoria", 'warning');
        return;
    }
    
    try {
        const newCat = await api.createCategory(name, profitMargin, vatRate);
        const refreshedCats = await api.getCategories();
        setLocalCategories(refreshedCats);
        handleFieldChange('categoryId', newCat.id);
        
        setShowNewCatForm(false);
        setNewCatData({ name: '', profitMargin: 40, vatRate: 22 });
        showAlert("Categoria creata!", 'success');
    } catch (error) {
        showAlert(error instanceof Error ? error.message : "Errore nella creazione", 'error');
    }
  };
  
  const handleSaveSingleProduct = async () => {
    if (selectedProductIndex === null || !selectedProduct) return;

    if (!selectedProduct.prodotto || !selectedProduct.codiceProdotto || !selectedProduct.categoryId) {
        showAlert("Prodotto, codice e categoria sono obbligatori per salvare.", 'warning');
        return;
    }
    setIsSingleSaving(true);
    try {
        await api.addProduct(selectedProduct);
        showAlert(`'${selectedProduct.prodotto}' è stato salvato.`, 'success');

        const newList = editableProducts.filter((_, index) => index !== selectedProductIndex);
        setEditableProducts(newList);
        
        if (newList.length === 0) {
            setSelectedProductIndex(null);
            if (signature) await api.recordDocumentUpload(signature); // Record when last product is saved
        } else {
            const newIndex = Math.min(selectedProductIndex, newList.length - 1);
            setSelectedProductIndex(newIndex);
        }

    } catch (error) {
        showAlert(error instanceof Error ? error.message : "Errore nel salvataggio.", 'error');
    } finally {
        setIsSingleSaving(false);
    }
  };

  const handleSaveAllRemaining = async () => {
    setIsBatchSaving(true);
    const validProducts = editableProducts.filter(p => p.prodotto && p.codiceProdotto && p.categoryId);
    if (validProducts.length < editableProducts.length) {
        showAlert("Alcuni prodotti non hanno una categoria e non verranno salvati.", 'warning');
    }
     if (validProducts.length === 0) {
        showAlert("Nessun prodotto valido da salvare.", 'info');
        setIsBatchSaving(false);
        return;
    }
    
    const results = await Promise.allSettled(validProducts.map(p => api.addProduct(p)));
    
    const successfulCount = results.filter(r => r.status === 'fulfilled').length;
    const failedCount = results.length - successfulCount;

    if (signature && successfulCount > 0) {
        await api.recordDocumentUpload(signature);
    }

    setIsBatchSaving(false);
    
    if (failedCount > 0) {
        showAlert(`${failedCount} prodotti non sono stati salvati a causa di un errore.`, 'error');
    }
    
    if (successfulCount > 0) {
      onSave(); // This closes the modal and refreshes the parent view
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;
  
  return (
    <Modal isOpen={isOpen} onClose={onSave} title="Revisione e Salvataggio Prodotti Importati" size="xl">
        <div className="flex flex-col md:flex-row gap-6 min-h-[60vh]">
            <div className="w-full md:w-1/3 border-r pr-4 max-h-[60vh] overflow-y-auto">
                <h3 className="font-semibold text-gray-700 mb-2 sticky top-0 bg-white pb-2">Prodotti da Salvare ({editableProducts.length})</h3>
                <div className="space-y-2">
                    {editableProducts.map((p, i) => (
                        <button key={i} onClick={() => setSelectedProductIndex(i)} className={`w-full text-left p-3 rounded-md transition ${selectedProductIndex === i ? 'bg-indigo-100 text-indigo-800' : 'hover:bg-gray-100'}`}>
                            <p className="font-semibold truncate">{p.prodotto || "Prodotto senza nome"}</p>
                            <p className="text-sm text-gray-600">Cod: {p.codiceProdotto || "N/D"}</p>
                        </button>
                    ))}
                    {editableProducts.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            Tutti i prodotti sono stati salvati!
                        </div>
                    )}
                </div>
            </div>
            
            <div className="w-full md:w-2/3">
                {isBatchSaving ? <Spinner /> : selectedProduct ? (
                    <div className="flex flex-col justify-between h-full">
                      <div className="space-y-4 pr-2 overflow-y-auto">
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Prodotto</label>
                              <input type="text" value={selectedProduct.prodotto} onChange={e => handleFieldChange('prodotto', e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div><label className="block text-sm font-medium text-gray-700">Codice Prodotto</label><input type="text" value={selectedProduct.codiceProdotto} onChange={e => handleFieldChange('codiceProdotto', e.target.value)} className="mt-1 w-full p-2 border rounded-md" /></div>
                              <div><label className="block text-sm font-medium text-gray-700">Quantità</label><input type="number" value={selectedProduct.quantita} onChange={e => handleFieldChange('quantita', parseInt(e.target.value) || 0)} min="0" className="mt-1 w-full p-2 border rounded-md" /></div>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Categoria</label>
                              {showNewCatForm ? (
                                  <div className="p-3 border rounded-md bg-gray-50 space-y-3 mt-1">
                                      <div className="grid grid-cols-3 gap-3">
                                        <input type="text" placeholder="Nome Categoria" value={newCatData.name} onChange={e => setNewCatData({...newCatData, name: e.target.value})} className="col-span-2 w-full p-2 border rounded-md" />
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="number" placeholder="Margine %" value={newCatData.profitMargin} onChange={e => setNewCatData({...newCatData, profitMargin: Number(e.target.value)})} className="w-full p-2 border rounded-md" />
                                            <input type="number" placeholder="IVA %" value={newCatData.vatRate} onChange={e => setNewCatData({...newCatData, vatRate: Number(e.target.value)})} className="w-full p-2 border rounded-md" />
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <button onClick={handleAddNewCategory} className="px-3 py-1 bg-green-500 text-white rounded">Salva</button>
                                        <button onClick={() => setShowNewCatForm(false)} className="px-3 py-1 bg-gray-200 rounded">Annulla</button>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="flex items-center gap-2">
                                      <select value={selectedProduct.categoryId} onChange={e => handleFieldChange('categoryId', e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white" required>
                                        <option value="">Assegna Categoria...</option>
                                        {localCategories.filter(c => c.id !== api.UNCATEGORIZED_CAT_ID).map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                                      </select>
                                      <button onClick={() => setShowNewCatForm(true)} className="mt-1 p-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"><PlusIcon className="w-5 h-5"/></button>
                                  </div>
                              )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg border">
                              <div><label className="block text-sm font-medium text-gray-700">P. Acquisto (€)</label><input type="number" value={selectedProduct.prezzoAcquisto} onChange={e => handlePriceChange('prezzoAcquisto', parseFloat(e.target.value) || 0)} min="0" step="any" className="mt-1 w-full p-2 border rounded-md" /></div>
                              <div><label className="block text-sm font-medium text-gray-700">% Guadagno</label><div className="relative"><input type="number" value={profitPercentage} onChange={e => handleProfitPercentageChange(e.target.value)} min="0" step="1" className="mt-1 w-full p-2 border rounded-md" /><span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">%</span></div></div>
                              <div className="col-span-2 md:col-span-1"><label className="block text-sm font-medium text-gray-700">P. Vendita (€)</label><input type="number" value={selectedProduct.prezzoVendita.toFixed(2)} onChange={e => handlePriceChange('prezzoVendita', parseFloat(e.target.value) || 0)} min="0" step="any" className="mt-1 w-full p-2 border rounded-md bg-indigo-50 font-bold" /></div>
                          </div>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                          <button onClick={handleSaveSingleProduct} disabled={isSingleSaving} className="w-full flex justify-center items-center px-4 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition disabled:bg-green-400">
                              {isSingleSaving ? <><Spinner/> Salvataggio...</> : 'Salva Questo Prodotto e Continua'}
                          </button>
                      </div>
                    </div>
                ) : <div className="flex justify-center items-center h-full text-gray-500">Seleziona un prodotto per modificarlo o completarlo.</div>}
            </div>
        </div>
        <div className="flex justify-end pt-4 space-x-2 border-t mt-4">
            <button onClick={onSave} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Termina Revisione</button>
            <button onClick={handleSaveAllRemaining} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50" disabled={isBatchSaving || editableProducts.length === 0}>{isBatchSaving ? 'Salvataggio...' : `Salva i ${editableProducts.length} Restanti`}</button>
        </div>
    </Modal>
  );
};

export default PostImportReviewModal;
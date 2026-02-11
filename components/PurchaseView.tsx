
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, PurchaseItem, Customer, ConstructionSite, Purchase } from '../types';
import * as api from '../services/apiService';
import { PlusIcon, SearchIcon, TrashIcon } from './icons';
import Spinner from './Spinner';

interface PurchaseViewProps {
  showAlert: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const PurchaseView: React.FC<PurchaseViewProps> = ({ showAlert }) => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [customerSites, setCustomerSites] = useState<ConstructionSite[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');

  const [currentItems, setCurrentItems] = useState<PurchaseItem[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<Purchase[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
        const [products, customers] = await Promise.all([
            api.getAllProducts(),
            api.getCustomers()
        ]);
        setAllProducts(products);
        setAllCustomers(customers);
        if (customers.length > 0) {
            setSelectedCustomerId(customers[0].id);
        }
    } catch (error) {
        showAlert('Errore nel caricamento dati', 'error');
    } finally {
        setIsLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    const fetchSites = async () => {
        if (!selectedCustomerId) {
            setCustomerSites([]);
            setSelectedSiteId('');
            return;
        }
        try {
            const sites = await api.getConstructionSites(selectedCustomerId);
            setCustomerSites(sites);
            if (sites.length > 0) {
                setSelectedSiteId(sites[0].id);
            } else {
                setSelectedSiteId('');
            }
        } catch (e) {
            showAlert('Errore caricamento cantieri', 'error');
        }
    };
    fetchSites();
  }, [selectedCustomerId, showAlert]);

  useEffect(() => {
    const fetchHistory = async () => {
        if (!selectedSiteId) {
            setPurchaseHistory([]);
            return;
        }
        setIsLoadingHistory(true);
        try {
            const history = await api.getPurchasesForSite(selectedSiteId);
            setPurchaseHistory(history);
        } catch (e) {
            showAlert('Errore caricamento storico acquisti', 'error');
        } finally {
            setIsLoadingHistory(false);
        }
    };
    fetchHistory();
  }, [selectedSiteId, showAlert]);

  const handleAddItem = (product: Product) => {
    setCurrentItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevItems, { product, quantity: 1 }];
      }
    });
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    setCurrentItems(prevItems =>
      prevItems.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, newQuantity) }
          : item
      )
    );
  };
  
  const handleRemoveItem = (productId: string) => {
    setCurrentItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return allProducts;
    return allProducts.filter(p =>
      p.prodotto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codiceProdotto.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allProducts, searchTerm]);

  const currentTotal = useMemo(() => {
    return currentItems.reduce((acc, item) => acc + item.product.prezzoAcquisto * item.quantity, 0);
  }, [currentItems]);

  const historyTotal = useMemo(() => {
    return purchaseHistory.reduce((acc, purchase) => acc + purchase.total, 0);
  }, [purchaseHistory]);

  const handleSavePurchase = async () => {
    if (!selectedCustomerId || !selectedSiteId || currentItems.length === 0) {
        showAlert('Seleziona un cantiere e aggiungi almeno un prodotto.', 'warning');
        return;
    }
    const purchaseData = {
        customerId: selectedCustomerId,
        siteId: selectedSiteId,
        date: new Date().toISOString().slice(0, 10),
        items: currentItems,
        total: currentTotal,
    };

    try {
        await api.addPurchase(purchaseData);
        showAlert('Acquisto salvato con successo!', 'success');
        setCurrentItems([]);
        // Reload history
        const history = await api.getPurchasesForSite(selectedSiteId);
        setPurchaseHistory(history);
    } catch(e) {
        showAlert('Errore nel salvataggio acquisto', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Aggiungi Materiali</h2>
            <div className="relative mb-4">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Cerca prodotto..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-md"
                />
            </div>
            {isLoading ? <Spinner /> : (
                <div className="max-h-[70vh] overflow-y-auto">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="flex justify-between items-center p-2 border-b hover:bg-gray-50">
                            <div>
                                <p className="font-semibold">{product.prodotto}</p>
                                <p className="text-sm text-gray-500">P. Acquisto: €{product.prezzoAcquisto.toFixed(2)}</p>
                            </div>
                            <button onClick={() => handleAddItem(product)} className="p-2 text-indigo-600 hover:text-indigo-800 rounded-full hover:bg-indigo-100">
                                <PlusIcon className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="lg:col-span-3 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Registra Acquisto Materiali</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Cliente</label>
                        <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white">
                            <option value="">Seleziona Cliente</option>
                            {allCustomers.map(c => <option key={c.id} value={c.id}>{c.ragioneSociale}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Cantiere</label>
                        <select value={selectedSiteId} onChange={e => setSelectedSiteId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white" disabled={!selectedCustomerId || customerSites.length === 0}>
                            <option value="">Seleziona Cantiere</option>
                            {customerSites.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                        </select>
                    </div>
                </div>

                <div className="mt-6">
                    {/* Desktop Header */}
                    <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-2 bg-gray-50 rounded-t-lg border-b border-gray-200">
                        <div className="col-span-5 text-left text-xs font-medium text-gray-500 uppercase">Prodotto</div>
                        <div className="col-span-2 text-center text-xs font-medium text-gray-500 uppercase">Qtà</div>
                        <div className="col-span-2 text-right text-xs font-medium text-gray-500 uppercase">P. Acquisto</div>
                        <div className="col-span-2 text-right text-xs font-medium text-gray-500 uppercase">Totale</div>
                        <div className="col-span-1"></div>
                    </div>

                    {/* Items */}
                    <div className="border border-gray-200 rounded-b-lg sm:border-t-0 sm:rounded-t-none">
                        {currentItems.length === 0 && (
                            <div className="text-center py-8 text-gray-500 bg-white sm:rounded-b-lg">Aggiungi materiali dalla lista a sinistra.</div>
                        )}
                        {currentItems.map(item => (
                            <div key={item.product.id} className="bg-white p-4 border-b last:border-b-0 sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center sm:p-3">
                                {/* Mobile View */}
                                <div className="sm:hidden">
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-gray-800 flex-1 pr-2">{item.product.prodotto}</p>
                                        <button onClick={() => handleRemoveItem(item.product.id)} className="text-red-500 hover:text-red-700 -mt-1 -mr-1 p-1">
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <div className="mt-3 grid grid-cols-3 gap-2 items-center text-center">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Qtà</label>
                                            <input 
                                                type="number" 
                                                value={item.quantity} 
                                                onChange={e => handleQuantityChange(item.product.id, parseInt(e.target.value))}
                                                className="w-full text-center border rounded-md p-1"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">P. Acquisto</p>
                                            <p className="font-medium text-gray-700 mt-1">€{item.product.prezzoAcquisto.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Totale</p>
                                            <p className="font-bold text-gray-900 mt-1">€{(item.product.prezzoAcquisto * item.quantity).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Desktop View */}
                                <div className="hidden sm:col-span-5 sm:block font-medium text-gray-900">{item.product.prodotto}</div>
                                <div className="hidden sm:col-span-2 sm:flex sm:justify-center">
                                    <input 
                                        type="number" 
                                        value={item.quantity} 
                                        onChange={e => handleQuantityChange(item.product.id, parseInt(e.target.value))}
                                        className="w-16 text-center border rounded-md p-1"
                                    />
                                </div>
                                <div className="hidden sm:col-span-2 sm:block text-right text-gray-700">€{item.product.prezzoAcquisto.toFixed(2)}</div>
                                <div className="hidden sm:col-span-2 sm:block text-right font-semibold text-gray-900">€{(item.product.prezzoAcquisto * item.quantity).toFixed(2)}</div>
                                <div className="hidden sm:col-span-1 sm:flex sm:items-center sm:justify-end">
                                    <button onClick={() => handleRemoveItem(item.product.id)} className="text-red-500 hover:text-red-700 p-1">
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                     {/* Total Footer */}
                    <div className="bg-gray-50 p-3 rounded-b-lg border border-t-0 border-gray-200 text-right">
                        <span className="font-bold text-gray-700">Totale Acquisto Corrente:</span>
                        <span className="font-bold text-lg text-gray-900 ml-4">€{currentTotal.toFixed(2)}</span>
                    </div>
                </div>

                <div className="mt-8 text-right">
                    <button onClick={handleSavePurchase} className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition" disabled={currentItems.length === 0}>
                        Salva Acquisto
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                 <h3 className="text-xl font-bold text-gray-800 mb-4">Storico Acquisti Cantiere</h3>
                 {isLoadingHistory ? <Spinner /> : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {purchaseHistory.length === 0 && selectedSiteId && <p className="text-gray-500">Nessun acquisto registrato per questo cantiere.</p>}
                        {!selectedSiteId && <p className="text-gray-500">Seleziona un cantiere per vedere lo storico.</p>}
                        {purchaseHistory.map(purchase => (
                             <details key={purchase.id} className="p-4 border rounded-lg bg-gray-50 group">
                                <summary className="flex justify-between items-center cursor-pointer">
                                    <div className="font-semibold text-gray-700">Data: {new Date(purchase.date).toLocaleDateString('it-IT')}</div>
                                    <div className="font-bold text-gray-800">Totale: €{purchase.total.toFixed(2)}</div>
                                    <span className="text-gray-500 group-open:rotate-90 transform transition-transform">▶</span>
                                </summary>
                                <div className="mt-4 pt-4 border-t space-y-3">
                                    {purchase.items.map(item => (
                                        <div key={item.product.id} className="p-3 bg-white rounded-md border text-sm">
                                            <p className="font-semibold text-gray-800">{item.product.prodotto}</p>
                                            <div className="flex justify-between items-center mt-1 text-gray-600">
                                                <span>Quantità: {item.quantity}</span>
                                                <span className="font-medium text-gray-800">€{(item.product.prezzoAcquisto * item.quantity).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             </details>
                        ))}
                    </div>
                 )}
                 {purchaseHistory.length > 0 && (
                    <div className="mt-6 pt-4 border-t text-right">
                        <span className="text-gray-600 font-bold">Spesa Totale Cantiere:</span>
                        <span className="text-2xl font-bold text-indigo-700 ml-4">€{historyTotal.toFixed(2)}</span>
                    </div>
                 )}
            </div>
        </div>
    </div>
  );
};

export default PurchaseView;

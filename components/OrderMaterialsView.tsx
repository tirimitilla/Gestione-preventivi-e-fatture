
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, PurchaseItem, Customer, ConstructionSite, ShopInfo, Order } from '../types';
import * as api from '../services/apiService';
import { PlusIcon, SearchIcon, TrashIcon, DownloadIcon } from './icons';
import Spinner from './Spinner';
import Modal from './Modal';
import { generateOrderPdf } from '../services/pdfGenerator';

interface OrderMaterialsViewProps {
  orderItems: PurchaseItem[];
  setOrderItems: React.Dispatch<React.SetStateAction<PurchaseItem[]>>;
  showAlert: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const OrderMaterialsView: React.FC<OrderMaterialsViewProps> = ({ orderItems, setOrderItems, showAlert }) => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [customerSites, setCustomerSites] = useState<ConstructionSite[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');

  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
        const [products, customers, info] = await Promise.all([
            api.getAllProducts(),
            api.getCustomers(),
            api.getHeaderInfo()
        ]);
        setAllProducts(products);
        setAllCustomers(customers);
        setShopInfo(info);
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
            setSelectedSiteId(sites[0]?.id || ''); 
        } catch (e) {
            showAlert('Errore caricamento cantieri del cliente', 'error');
        }
    };
    fetchSites();
  }, [selectedCustomerId, showAlert]);

  const selectedCustomer = useMemo(() => allCustomers.find(c => c.id === selectedCustomerId), [allCustomers, selectedCustomerId]);
  const selectedSite = useMemo(() => customerSites.find(s => s.id === selectedSiteId), [customerSites, selectedSiteId]);

  const handleAddToOrder = (product: Product) => {
    setOrderItems(prevItems => {
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
    setOrderItems(prevItems =>
      prevItems.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, newQuantity) }
          : item
      )
    );
  };
  
  const handleRemoveFromOrder = (productId: string) => {
    setOrderItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return allProducts;
    return allProducts.filter(p =>
      p.prodotto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codiceProdotto.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allProducts, searchTerm]);

  const orderTotal = useMemo(() => {
    return orderItems.reduce((acc, item) => acc + item.product.prezzoAcquisto * item.quantity, 0);
  }, [orderItems]);
  
  const handleGeneratePdf = () => {
    if (!selectedCustomerId || !selectedCustomer) {
        showAlert('Seleziona un cliente prima di continuare.', 'warning');
        return;
    }
    if (orderItems.length === 0) {
        showAlert('Aggiungi almeno un prodotto all\'ordine.', 'warning');
        return;
    }
    if (!shopInfo) {
        showAlert('Informazioni del negozio non caricate.', 'error');
        return;
    }

    const orderData: Order = {
        customerId: selectedCustomerId,
        siteId: selectedSiteId || undefined,
        date: orderDate,
        items: orderItems,
        total: orderTotal
    };
    
    try {
        const pdfDataUri = generateOrderPdf(orderData, selectedCustomer, selectedSite, shopInfo);
        setPdfPreviewUrl(pdfDataUri);
        setIsPdfPreviewOpen(true);
    } catch (error) {
        showAlert('Errore nella generazione del PDF.', 'error');
    }
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Aggiungi Prodotti all'Ordine</h2>
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
                <div className="max-h-96 overflow-y-auto">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="flex justify-between items-center p-2 border-b hover:bg-gray-50">
                            <div>
                                <p className="font-semibold">{product.prodotto}</p>
                                <p className="text-sm text-gray-500">€{product.prezzoAcquisto.toFixed(2)}</p>
                            </div>
                            <button onClick={() => handleAddToOrder(product)} className="p-2 text-primary-blue hover:opacity-80 rounded-full hover:bg-indigo-100">
                                <PlusIcon className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="lg:col-span-3">
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Dettagli Ordine Materiali</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Cliente</label>
                        <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white">
                            <option value="">Seleziona Cliente</option>
                            {allCustomers.map(c => <option key={c.id} value={c.id}>{c.ragioneSociale}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Cantiere (Destinazione)</label>
                        <select value={selectedSiteId} onChange={e => setSelectedSiteId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white" disabled={!selectedCustomerId || customerSites.length === 0}>
                            <option value="">Seleziona Cantiere</option>
                            {customerSites.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Data Ordine</label>
                        <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
                    </div>
                </div>

                <div className="mt-6">
                    <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-2 bg-gray-600 text-white rounded-t-lg">
                        <div className="col-span-5 text-left text-xs font-medium uppercase">Prodotto</div>
                        <div className="col-span-2 text-center text-xs font-medium uppercase">Qtà</div>
                        <div className="col-span-2 text-right text-xs font-medium uppercase">P. Acquisto</div>
                        <div className="col-span-2 text-right text-xs font-medium uppercase">Totale</div>
                        <div className="col-span-1"></div>
                    </div>

                    <div className="border-x border-b border-gray-200 rounded-b-lg sm:border-t-0 sm:border-none sm:rounded-none">
                        {orderItems.length === 0 && (
                            <div className="text-center py-8 text-gray-500 bg-white sm:rounded-b-lg">Nessun prodotto nell'ordine.</div>
                        )}
                        {orderItems.map(item => (
                            <div key={item.product.id} className="bg-white p-4 border-b last:border-b-0 sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center sm:p-3 sm:border-t sm:first:border-t-0">
                                <div className="sm:hidden">
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-gray-800 flex-1 pr-2">{item.product.prodotto}</p>
                                        <button onClick={() => handleRemoveFromOrder(item.product.id)} className="text-red-500 hover:text-red-700 -mt-1 -mr-1 p-1"><TrashIcon className="h-5 w-5" /></button>
                                    </div>
                                    <div className="mt-3 grid grid-cols-3 gap-2 items-center text-center">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Qtà</label>
                                            <input type="number" value={item.quantity} onChange={e => handleQuantityChange(item.product.id, parseInt(e.target.value))} className="w-full text-center border rounded-md p-1" />
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
                                <div className="hidden sm:col-span-5 sm:block font-medium text-gray-900">{item.product.prodotto}</div>
                                <div className="hidden sm:col-span-2 sm:flex sm:justify-center"><input type="number" value={item.quantity} onChange={e => handleQuantityChange(item.product.id, parseInt(e.target.value))} className="w-16 text-center border rounded-md p-1"/></div>
                                <div className="hidden sm:col-span-2 sm:block text-right text-gray-700">€{item.product.prezzoAcquisto.toFixed(2)}</div>
                                <div className="hidden sm:col-span-2 sm:block text-right font-semibold text-gray-900">€{(item.product.prezzoAcquisto * item.quantity).toFixed(2)}</div>
                                <div className="hidden sm:col-span-1 sm:flex sm:items-center sm:justify-end"><button onClick={() => handleRemoveFromOrder(item.product.id)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon className="h-5 w-5" /></button></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <div className="w-full max-w-sm bg-gray-100 border rounded-lg p-4">
                        <div className="flex justify-between text-lg font-bold text-gray-800">
                            <span>Totale Ordine:</span>
                            <span>€{orderTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                <button onClick={handleGeneratePdf} className="inline-flex items-center px-4 py-2 bg-gray-700 text-white font-semibold rounded-md hover:bg-gray-800 transition">
                    <DownloadIcon className="h-5 w-5 mr-2" />
                    Genera PDF Ordine
                </button>
            </div>
        </div>
    </div>
    <Modal isOpen={isPdfPreviewOpen} onClose={() => setIsPdfPreviewOpen(false)} title="Anteprima Ordine Materiali" size="xl">
        <iframe src={pdfPreviewUrl} className="w-full h-[65vh] border rounded-md" title="Anteprima PDF Ordine"></iframe>
        <div className="flex justify-end mt-4 space-x-2">
            <button onClick={() => setIsPdfPreviewOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Chiudi</button>
        </div>
    </Modal>
    </>
  );
};

export default OrderMaterialsView;

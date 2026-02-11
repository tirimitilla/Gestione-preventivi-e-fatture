import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, QuoteItem, Customer, ConstructionSite, ShopInfo, Quote, Category } from '../types';
import * as api from '../services/apiService';
import { PlusIcon, SearchIcon, TrashIcon, DownloadIcon, EyeIcon } from './icons';
import Spinner from './Spinner';
import Modal from './Modal';
import { generateQuotePdf } from '../services/pdfGenerator';

interface QuoteBuilderViewProps {
  categories: Category[];
  quoteItems: QuoteItem[];
  setQuoteItems: React.Dispatch<React.SetStateAction<QuoteItem[]>>;
  showAlert: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const QuoteBuilderView: React.FC<QuoteBuilderViewProps> = ({ categories, quoteItems, setQuoteItems, showAlert }) => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [customerSites, setCustomerSites] = useState<ConstructionSite[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');

  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [savedQuoteNumber, setSavedQuoteNumber] = useState<string | null>(null);
  
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  const [lastSavedQuote, setLastSavedQuote] = useState<Quote | null>(null);

  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  const loadInitialQuoteData = useCallback(async () => {
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
        showAlert('Errore nel caricamento dati per il preventivo', 'error');
    } finally {
        setIsLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadInitialQuoteData();
  }, [loadInitialQuoteData]);

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

  const handleAddToQuote = (product: Product) => {
    setQuoteItems(prevItems => {
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
    setQuoteItems(prevItems =>
      prevItems.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, newQuantity) }
          : item
      )
    );
  };
  
  const handleRemoveFromQuote = (productId: string) => {
    setQuoteItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return allProducts;
    return allProducts.filter(p =>
      p.prodotto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codiceProdotto.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allProducts, searchTerm]);

  const { subtotal, tax, total } = useMemo(() => {
    const newSubtotal = quoteItems.reduce((acc, item) => acc + item.product.prezzoVendita * item.quantity, 0);
    const newTax = quoteItems.reduce((acc, item) => {
        const category = categoryMap.get(item.product.categoryId);
        const vatRate = category ? category.vatRate : (shopInfo?.vatRate || 22);
        const itemTotal = item.product.prezzoVendita * item.quantity;
        return acc + (itemTotal * (vatRate / 100));
    }, 0);
    const newTotal = newSubtotal + newTax;
    return { subtotal: newSubtotal, tax: newTax, total: newTotal };
  }, [quoteItems, categoryMap, shopInfo]);
  
  const handleSaveAndPreview = async () => {
    if (!selectedCustomerId || !selectedCustomer) {
        showAlert('Seleziona un cliente prima di salvare.', 'warning');
        return;
    }
    if (quoteItems.length === 0) {
        showAlert('Aggiungi almeno un prodotto al preventivo.', 'warning');
        return;
    }
    if (!shopInfo) {
        showAlert('Informazioni del negozio non caricate.', 'error');
        return;
    }

    const effectiveVatRate = subtotal > 0 ? (tax / subtotal) * 100 : 0;

    const quoteData: Omit<Quote, 'id' | 'quoteNumber'> = {
        customerId: selectedCustomerId,
        siteId: selectedSiteId || undefined,
        date: quoteDate,
        items: quoteItems,
        notes,
        subtotal,
        tax,
        total,
        vatRate: effectiveVatRate
    };
    
    try {
        const savedQuote = await api.saveQuote(quoteData);
        setSavedQuoteNumber(savedQuote.quoteNumber);
        setLastSavedQuote(savedQuote);
        showAlert('Preventivo salvato! Anteprima pronta.', 'success');
        
        const pdfDataUri = generateQuotePdf(savedQuote, selectedCustomer, selectedSite, shopInfo);
        setPdfPreviewUrl(pdfDataUri);
        setIsPdfPreviewOpen(true);

    } catch (error) {
        showAlert('Errore nel salvataggio del preventivo.', 'error');
    }
  };
  
  const handleActualDownload = () => {
      if (!pdfPreviewUrl || !lastSavedQuote) return;
      const link = document.createElement('a');
      link.href = pdfPreviewUrl;
      link.download = `Preventivo-${lastSavedQuote.quoteNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsPdfPreviewOpen(false); // Close modal after download
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Product Selection */}
        <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Aggiungi Prodotti al Preventivo</h2>
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
                                <p className="text-sm text-gray-500">€{product.prezzoVendita.toFixed(2)}</p>
                            </div>
                            <button onClick={() => handleAddToQuote(product)} className="p-2 text-primary-blue hover:opacity-80 rounded-full hover:bg-indigo-100">
                                <PlusIcon className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Quote Preview */}
        <div className="lg:col-span-3">
            <div id="quote-preview" className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Preventivo Proforma</h2>
                      {selectedCustomer && (
                        <div className="mt-2 text-sm text-gray-600">
                          <p className="font-bold text-base text-gray-800">{selectedCustomer.ragioneSociale}</p>
                          <p>{selectedCustomer.indirizzo}</p>
                          <p>P.IVA: {selectedCustomer.piva}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                        <p className="font-semibold">N. Preventivo:</p>
                        <p className="text-gray-600">{savedQuoteNumber || `PREV-NUOVO`}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Data</label>
                        <input type="date" value={quoteDate} onChange={e => setQuoteDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
                    </div>
                </div>

                <div className="mt-6">
                    {/* Desktop Header */}
                    <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-2 bg-primary-blue text-white rounded-t-lg">
                        <div className="col-span-5 text-left text-xs font-medium uppercase">Prodotto</div>
                        <div className="col-span-2 text-center text-xs font-medium uppercase">Qtà</div>
                        <div className="col-span-2 text-right text-xs font-medium uppercase">Prezzo Unit.</div>
                        <div className="col-span-2 text-right text-xs font-medium uppercase">Totale</div>
                        <div className="col-span-1"></div>
                    </div>

                    {/* Items */}
                    <div className="border-x border-b border-gray-200 rounded-b-lg sm:border-t-0 sm:border-none sm:rounded-none">
                        {quoteItems.length === 0 && (
                            <div className="text-center py-8 text-gray-500 bg-white sm:rounded-b-lg">Nessun prodotto nel preventivo.</div>
                        )}
                        {quoteItems.map(item => (
                            <div key={item.product.id} className="bg-white p-4 border-b last:border-b-0 sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center sm:p-3 sm:border-t sm:first:border-t-0">
                                {/* Mobile View */}
                                <div className="sm:hidden">
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-gray-800 flex-1 pr-2">{item.product.prodotto}</p>
                                        <button onClick={() => handleRemoveFromQuote(item.product.id)} className="text-red-500 hover:text-red-700 -mt-1 -mr-1 p-1">
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
                                            <p className="text-xs text-gray-500">Prezzo Unit.</p>
                                            <p className="font-medium text-gray-700 mt-1">€{item.product.prezzoVendita.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Totale</p>
                                            <p className="font-bold text-gray-900 mt-1">€{(item.product.prezzoVendita * item.quantity).toFixed(2)}</p>
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
                                <div className="hidden sm:col-span-2 sm:block text-right text-gray-700">€{item.product.prezzoVendita.toFixed(2)}</div>
                                <div className="hidden sm:col-span-2 sm:block text-right font-semibold text-gray-900">€{(item.product.prezzoVendita * item.quantity).toFixed(2)}</div>
                                <div className="hidden sm:col-span-1 sm:flex sm:items-center sm:justify-end">
                                    <button onClick={() => handleRemoveFromQuote(item.product.id)} className="text-red-500 hover:text-red-700 p-1">
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6">
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Note</label>
                    <textarea
                        id="notes"
                        rows={3}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="mt-1 w-full p-2 border rounded-md"
                        placeholder="Aggiungi note aggiuntive, termini o condizioni..."
                    />
                </div>

                <div className="mt-6 flex justify-end">
                    <div className="w-full max-w-sm bg-primary-orange text-gray-800 rounded-lg p-4">
                        <div className="flex justify-between text-sm py-1">
                            <span>Imponibile:</span>
                            <span className="font-semibold">€{subtotal.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm py-1">
                            <span>Totale I.V.A.:</span>
                            <span className="font-semibold">€{tax.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between text-lg font-bold py-2 border-t border-gray-700/50 mt-2">
                            <span>Totale:</span>
                            <span>€{total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                <button onClick={handleSaveAndPreview} className="inline-flex items-center px-4 py-2 bg-primary-blue text-white font-semibold rounded-md hover:opacity-90 transition">
                    <EyeIcon className="h-5 w-5 mr-2" />
                    Salva e Crea Anteprima
                </button>
            </div>
        </div>
    </div>
    <Modal isOpen={isPdfPreviewOpen} onClose={() => setIsPdfPreviewOpen(false)} title={`Anteprima Preventivo - ${lastSavedQuote?.quoteNumber || ''}`} size="xl">
        <iframe src={pdfPreviewUrl} className="w-full h-[65vh] border rounded-md" title="Anteprima PDF"></iframe>
        <div className="flex justify-end mt-4 space-x-2">
            <button onClick={() => setIsPdfPreviewOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">
                Chiudi
            </button>
            <button onClick={handleActualDownload} className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition">
                <DownloadIcon className="h-5 w-5 mr-2"/>
                Scarica PDF
            </button>
        </div>
    </Modal>
    </>
  );
};

export default QuoteBuilderView;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShopInfo, Category, Product, QuoteItem, PurchaseItem, Quote, Customer } from './types';
import * as api from './services/apiService';
import Header from './components/Header';
import InventoryView from './components/InventoryView';
import QuoteBuilderView from './components/QuoteBuilderView';
import { AlertTriangle, CheckCircle, Info, XCircle, ChevronDown } from './components/icons';
import Alert from './components/Alert';
import CustomerView from './components/CustomerView';
import PurchaseView from './components/PurchaseView';
import OrderMaterialsView from './components/OrderMaterialsView';

enum Tab {
  Inventory,
  QuoteBuilder,
  ProformaInvoice,
  Customers,
  Purchases,
  OrderMaterials,
}

const tabNames = {
  [Tab.Inventory]: 'Inventario',
  [Tab.QuoteBuilder]: 'Crea Preventivo',
  [Tab.ProformaInvoice]: 'Crea Fattura Proforma',
  [Tab.Customers]: 'Clienti e Cantieri',
  [Tab.Purchases]: 'Registra Acquisti',
  [Tab.OrderMaterials]: 'Crea Ordine Materiali',
};

const App: React.FC = () => {
  const [shopInfo, setShopInfo] = useState<ShopInfo>({
    name: 'Gestione Preventivi',
    companyName: '',
    description: '',
    codiceFiscale: '',
    iban: '',
    paymentConditions: '',
    vatRate: 22
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [orderItems, setOrderItems] = useState<PurchaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Inventory);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleEditQuote = (quote: Quote) => {
    setEditingQuote(quote);
    if (quote.documentType === 'proforma' || quote.quoteNumber.startsWith('PROF')) {
      setActiveTab(Tab.ProformaInvoice);
    } else {
      setActiveTab(Tab.QuoteBuilder);
    }
  };

  const loadInitialData = useCallback(async (retryCount = 0) => {
    if (retryCount === 0) setIsLoading(true);
    
    try {
      const [cats, info, products, customers] = await Promise.all([
        api.getCategories(),
        api.getHeaderInfo(),
        api.getAllProducts(),
        api.getCustomers()
      ]);
      
      setCategories(cats);
      setShopInfo(info);
      setAllProducts(products);
      setAllCustomers(customers);
      setIsLoading(false);
    } catch (error: any) {
      console.error(`Error loading initial data (attempt ${retryCount + 1}):`, error);
      
      let errorMessage = error.message || 'Errore di connessione';
      
      // Specific check for missing tables (common when moving to a new project)
      if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
        errorMessage = "Le tabelle non esistono nel nuovo database. Devi eseguire lo script SQL in Supabase.";
      } else if (errorMessage.includes('401') || errorMessage.includes('Invalid API key')) {
        errorMessage = "Chiave API Supabase non valida. Controlla le variabili d'ambiente su Vercel.";
      }

      if (retryCount < 2) {
        // Silent retry for the first few attempts to handle Supabase cold start
        setTimeout(() => loadInitialData(retryCount + 1), 2000);
      } else {
        showAlert(`Errore: ${errorMessage}`, 'error');
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      showAlert('Configurazione Supabase mancante. Verifica le impostazioni (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).', 'warning');
    }
    loadInitialData();
  }, [loadInitialData]);

  const handleShopInfoSave = async (newInfo: Omit<ShopInfo, 'name'>) => {
    try {
      await api.saveHeaderInfo(newInfo);
      setShopInfo(prev => ({ ...prev, ...newInfo }));
      showAlert('Intestazione salvata con successo', 'success');
    } catch (error) {
      showAlert('Errore nel salvaggio dell\'intestazione', 'error');
    }
  };

  const renderAlert = () => {
    if (!alert) return null;
    const icons = {
      success: <CheckCircle className="h-5 w-5" />,
      error: <XCircle className="h-5 w-5" />,
      warning: <AlertTriangle className="h-5 w-5" />,
      info: <Info className="h-5 w-5" />,
    };
    return <Alert message={alert.message} type={alert.type} icon={icons[alert.type]} />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header shopInfo={shopInfo} onSave={handleShopInfoSave} />
      
      {renderAlert()}

      <main className="p-4 mx-auto max-w-7xl">
        <div className="mb-6">
            <div ref={menuRef} className="relative inline-block text-left w-full sm:w-auto">
              <div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="inline-flex justify-between w-full sm:w-64 rounded-md border border-gray-300 shadow-sm px-4 py-3 bg-white text-lg font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  id="menu-button"
                  aria-expanded="true"
                  aria-haspopup="true"
                >
                  {tabNames[activeTab]}
                  <ChevronDown className="-mr-1 ml-2 h-5 w-5 mt-1" aria-hidden="true" />
                </button>
              </div>

              {isMenuOpen && (
                <div
                  className="origin-top-left absolute left-0 mt-2 w-full sm:w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-20"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="menu-button"
                >
                  <div className="py-1" role="none">
                    {(Object.keys(tabNames) as Array<string>).map((tabKey) => {
                      const tabIndex = parseInt(tabKey, 10) as Tab;
                      return (
                      <button
                        key={tabKey}
                        onClick={() => {
                          setActiveTab(tabIndex);
                          setIsMenuOpen(false);
                        }}
                        className={`${
                          activeTab === tabIndex ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                        } block w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-100 hover:text-gray-900`}
                        role="menuitem"
                      >
                        {tabNames[tabIndex]}
                      </button>
                    )})}
                  </div>
                </div>
              )}
            </div>
        </div>

        <div>
          {activeTab === Tab.Inventory && (
            <InventoryView 
              categories={categories}
              setCategories={setCategories}
              showAlert={showAlert}
              onProductsChange={() => loadInitialData()}
              allCustomers={allCustomers}
            />
          )}
          {activeTab === Tab.QuoteBuilder && (
            <QuoteBuilderView 
              categories={categories}
              allProducts={allProducts}
              allCustomers={allCustomers}
              shopInfo={shopInfo}
              quoteItems={quoteItems}
              setQuoteItems={setQuoteItems}
              showAlert={showAlert}
              editingQuote={editingQuote}
              documentType="quote"
              onCancelEdit={() => {
                setEditingQuote(null);
                setActiveTab(Tab.Customers);
              }}
              onQuoteSaved={() => {
                setEditingQuote(null);
                loadInitialData();
              }}
            />
          )}
          {activeTab === Tab.ProformaInvoice && (
            <QuoteBuilderView 
              categories={categories}
              allProducts={allProducts}
              allCustomers={allCustomers}
              shopInfo={shopInfo}
              quoteItems={quoteItems}
              setQuoteItems={setQuoteItems}
              showAlert={showAlert}
              editingQuote={editingQuote}
              documentType="proforma"
              onCancelEdit={() => {
                setEditingQuote(null);
                setActiveTab(Tab.Customers);
              }}
              onQuoteSaved={() => {
                setEditingQuote(null);
                loadInitialData();
              }}
            />
          )}
          {activeTab === Tab.Customers && (
            <CustomerView 
              showAlert={showAlert} 
              onEditQuote={handleEditQuote} 
              allCustomers={allCustomers}
              allProducts={allProducts}
              onDataChange={() => loadInitialData()}
            />
          )}
          {activeTab === Tab.Purchases && (
            <PurchaseView 
              showAlert={showAlert} 
              allProducts={allProducts}
              allCustomers={allCustomers}
            />
          )}
          {activeTab === Tab.OrderMaterials && (
            <OrderMaterialsView
              orderItems={orderItems}
              setOrderItems={setOrderItems}
              showAlert={showAlert}
              allProducts={allProducts}
              allCustomers={allCustomers}
              shopInfo={shopInfo}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;

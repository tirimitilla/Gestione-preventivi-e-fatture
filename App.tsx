
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShopInfo, Category, Product, QuoteItem, PurchaseItem, Quote, Customer } from './types';
import * as api from './services/apiService';
import { auth, googleProvider } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import Header from './components/Header';
import InventoryView from './components/InventoryView';
import QuoteBuilderView from './components/QuoteBuilderView';
import { AlertTriangle, CheckCircle, Info, XCircle, ChevronDown } from './components/icons';
import Alert from './components/Alert';
import Spinner from './components/Spinner';
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
    name: 'Ritrovo da Rocco',
    companyName: 'Ritrovo da Rocco di Pizzolante Antonella',
    description: 'Gestione magazzino e preventivi.',
    codiceFiscale: '',
    iban: '',
    paymentConditions: 'Contanti / Bonifico',
    vatRate: 22
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [orderItems, setOrderItems] = useState<PurchaseItem[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Inventory);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showAlert('App installata correttamente!', 'success');
      }
      setDeferredPrompt(null);
    } else {
      // Logic for iOS or already installed
      showAlert('Per installare su iOS: clicca l\'icona Condividi e seleziona "Aggiungi alla schermata Home"', 'info');
    }
  };

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setIsMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

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

  const loadInitialData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const info = await api.getHeaderInfo();
      setShopInfo(info);
      setIsLoading(false);
    } catch (error: any) {
      console.error(`Error loading header info:`, error);
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthReady && user) {
      loadInitialData();
      
      // Real-time subscriptions
      const unsubCats = api.subscribeCategories(setCategories);
      const unsubProducts = api.subscribeAllProducts(setAllProducts);
      const unsubCustomers = api.subscribeCustomers(setAllCustomers);
      
      return () => {
        unsubCats();
        unsubProducts();
        unsubCustomers();
      };
    } else if (isAuthReady && !user) {
      setIsLoading(false);
    }
  }, [isAuthReady, user, loadInitialData]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      showAlert('Errore durante il login con Google', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setAllCustomers([]);
      setAllProducts([]);
      setCategories([]);
    } catch (error) {
      showAlert('Errore durante il logout', 'error');
    }
  };

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
    <>
      {!isAuthReady ? (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white">
          <Spinner />
          <p className="mt-4 text-gray-500 font-medium animate-pulse">Inizializzazione...</p>
        </div>
      ) : !user ? (
        <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-blue-500 to-indigo-600">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="mb-8">
              <div className="inline-flex p-4 bg-blue-100 rounded-full mb-4">
                <CheckCircle className="h-12 w-12 text-blue-600" />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900">Gestione Aziendale</h1>
              <p className="text-gray-500 mt-2">Accedi per gestire i tuoi dati</p>
            </div>
            <button 
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-gray-700 font-bold rounded-xl transition-all shadow-sm active:scale-95"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
              Accedi con Google
            </button>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white">
          <Spinner />
          <p className="mt-4 text-gray-500 font-medium animate-pulse">Caricamento dati...</p>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50">
          <Header 
            shopInfo={shopInfo} 
            onSave={handleShopInfoSave} 
            onLogout={handleLogout} 
            user={user} 
            onInstall={handleInstallApp}
            isInstallable={!!deferredPrompt}
          />
          
          {renderAlert()}

          <main className="p-4 mx-auto max-w-7xl">
            <div className="mb-6">
                <div ref={menuRef} className="relative inline-block text-left w-full sm:w-auto">
              <div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="inline-flex justify-between w-full sm:w-64 rounded-md border border-gray-300 shadow-sm px-4 py-3 bg-white text-lg font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                          activeTab === tabIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
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
    )}
    </>
  );
};

export default App;

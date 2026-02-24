
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Customer, ConstructionSite, Quote, Purchase, Product, SiteMaterial } from '../types';
import * as api from '../services/apiService';
import Spinner from './Spinner';
import Modal from './Modal';
import { PlusIcon, ChevronRight, SparklesIcon, DownloadIcon, CalendarIcon, AlertTriangle, TrashIcon } from './icons';
import { GoogleGenAI, Type } from '@google/genai';
import { generateChecklistPdf } from '../services/pdfGenerator';
import AddMaterialModal from './AddMaterialModal';

interface CustomerViewProps {
  showAlert: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const CustomerView: React.FC<CustomerViewProps> = ({ showAlert }) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [sites, setSites] = useState<ConstructionSite[]>([]);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
    const [isLoadingSites, setIsLoadingSites] = useState(false);

    const [siteQuotes, setSiteQuotes] = useState<Record<string, Quote[]>>({});
    const [sitePurchases, setSitePurchases] = useState<Record<string, Purchase[]>>({});
    const [isLoadingSiteDetails, setIsLoadingSiteDetails] = useState(false);

    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
    
    const [newCustomer, setNewCustomer] = useState<Omit<Customer, 'id'>>({ ragioneSociale: '', piva: '', codiceFiscale: '', indirizzo: '', citta: '', cap: '', provincia: '', email: '', telefono: '' });
    const [newSiteForm, setNewSiteForm] = useState({ nome: '', indirizzo: '' });
    const [isAutofilling, setIsAutofilling] = useState(false);

    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const productMap = useMemo(() => new Map(allProducts.map(p => [p.id, p])), [allProducts]);
    
    const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
    const [siteToEdit, setSiteToEdit] = useState<ConstructionSite | null>(null);

    const loadInitialData = useCallback(async () => {
        setIsLoadingCustomers(true);
        try {
            const [customersData, productsData] = await Promise.all([
                api.getCustomers(),
                api.getAllProducts()
            ]);
            setCustomers(customersData);
            setAllProducts(productsData);
            if (customersData.length > 0 && !selectedCustomer) {
                setSelectedCustomer(customersData[0]);
            }
        } catch (error) {
            showAlert('Errore nel caricamento dei dati iniziali', 'error');
        } finally {
            setIsLoadingCustomers(false);
        }
    }, [showAlert, selectedCustomer]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    useEffect(() => {
        if (selectedCustomer) {
            const loadSiteDetails = async () => {
                setIsLoadingSites(true);
                setIsLoadingSiteDetails(true);
                try {
                    const siteData = await api.getConstructionSites(selectedCustomer.id);
                    setSites(siteData);

                    const quotesPromises = siteData.map(site => api.getQuotesForSite(site.id));
                    const purchasesPromises = siteData.map(site => api.getPurchasesForSite(site.id));
                    
                    const quotesResults = await Promise.all(quotesPromises);
                    const purchasesResults = await Promise.all(purchasesPromises);
                    
                    const quotesMap: Record<string, Quote[]> = {};
                    const purchasesMap: Record<string, Purchase[]> = {};

                    siteData.forEach((site, index) => {
                        quotesMap[site.id] = quotesResults[index];
                        purchasesMap[site.id] = purchasesResults[index];
                    });

                    setSiteQuotes(quotesMap);
                    setSitePurchases(purchasesMap);

                } catch (error) {
                    showAlert('Errore nel caricamento dei dettagli del cantiere', 'error');
                } finally {
                    setIsLoadingSites(false);
                    setIsLoadingSiteDetails(false);
                }
            };
            loadSiteDetails();
        } else {
            setSites([]);
            setSiteQuotes({});
            setSitePurchases({});
        }
    }, [selectedCustomer, showAlert]);


    const handleCustomerFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewCustomer({ ...newCustomer, [e.target.name]: e.target.value });
    };

    const handleSiteFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setNewSiteForm({ ...newSiteForm, [e.target.name]: e.target.value });
    };
    
    const handleAddCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const addedCustomer = await api.addCustomer(newCustomer);
            showAlert('Cliente aggiunto con successo!', 'success');
            setIsCustomerModalOpen(false);
            setNewCustomer({ ragioneSociale: '', piva: '', codiceFiscale: '', indirizzo: '', citta: '', cap: '', provincia: '', email: '', telefono: '' });
            const updatedCustomers = await api.getCustomers();
            setCustomers(updatedCustomers);
            setSelectedCustomer(addedCustomer);
        } catch (error) {
            showAlert(error instanceof Error ? error.message : 'Errore sconosciuto', 'error');
        }
    };

    const handleDownloadChecklist = async (site: ConstructionSite, customer: Customer) => {
        if (!customer) {
            showAlert("Cliente non trovato per generare il PDF.", "error"); return;
        }
        try {
            showAlert("Generazione PDF checklist in corso...", "info");
            const shopInfo = await api.getHeaderInfo();
            const pdfDataUri = generateChecklistPdf(site, customer, shopInfo, allProducts);

            const link = document.createElement('a');
            link.href = pdfDataUri;
            link.download = `ListaMateriali-${site.nome.replace(/\s/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            showAlert("Errore durante la generazione del PDF.", "error");
        }
    };

    const handleAddSite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer) return;

        const siteData: Omit<ConstructionSite, 'id'> = {
            nome: newSiteForm.nome,
            indirizzo: newSiteForm.indirizzo,
            materialeDaAcquistare: [],
            customerId: selectedCustomer.id
        };

        try {
            const newSite = await api.addConstructionSite(siteData);
            showAlert('Cantiere aggiunto con successo!', 'success');
            setIsSiteModalOpen(false);
            setNewSiteForm({ nome: '', indirizzo: '' });
            setSites(prev => [...prev, newSite]);
            setSiteQuotes(prev => ({ ...prev, [newSite.id]: [] }));
            setSitePurchases(prev => ({ ...prev, [newSite.id]: [] }));
        } catch (error) {
            showAlert(error instanceof Error ? error.message : 'Errore sconosciuto', 'error');
        }
    };
    
    const updateSiteInState = (siteId: string, updatedMaterials: SiteMaterial[]) => {
        const updatedSites = sites.map(s => s.id === siteId ? { ...s, materialeDaAcquistare: updatedMaterials } : s);
        setSites(updatedSites);
        return updatedSites;
    };

    const handleUpdateMaterials = async (siteId: string, updatedMaterials: SiteMaterial[], originalSites: ConstructionSite[]) => {
        try {
            await api.updateSiteMaterials(siteId, updatedMaterials);
        } catch (e) {
            showAlert('Errore: impossibile salvare la modifica', 'error');
            setSites(originalSites);
        }
    };
    
    const handleMaterialUpdate = (siteId: string, itemIndex: number, newValues: Partial<SiteMaterial>) => {
        const siteToUpdate = sites.find(s => s.id === siteId);
        if (!siteToUpdate) return;

        const originalSites = [...sites];
        const newMaterials = [...siteToUpdate.materialeDaAcquistare];
        newMaterials[itemIndex] = { ...newMaterials[itemIndex], ...newValues };

        updateSiteInState(siteId, newMaterials);
        handleUpdateMaterials(siteId, newMaterials, originalSites);
    };

    const handleRemoveMaterial = (siteId: string, itemIndex: number) => {
        const siteToUpdate = sites.find(s => s.id === siteId);
        if (!siteToUpdate) return;

        const originalSites = [...sites];
        const newMaterials = siteToUpdate.materialeDaAcquistare.filter((_, index) => index !== itemIndex);
        updateSiteInState(siteId, newMaterials);
        handleUpdateMaterials(siteId, newMaterials, originalSites);
    };
    
    const handleAddProductToSite = (productId: string) => {
        if (!siteToEdit) return;
        
        const newMaterial: SiteMaterial = { productId, quantity: 1, purchased: false };
        const originalSites = [...sites];
        const updatedMaterials = [...siteToEdit.materialeDaAcquistare, newMaterial];

        updateSiteInState(siteToEdit.id, updatedMaterials);
        handleUpdateMaterials(siteToEdit.id, updatedMaterials, originalSites);
    };


    const handleAutoFillCustomerData = async () => {
        if (!newCustomer.ragioneSociale.trim()) {
            showAlert('Inserisci prima la Ragione Sociale.', 'warning'); return;
        }
        setIsAutofilling(true);
        showAlert('Ricerca dati in corso...', 'info');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const prompt = `Trova la Partita IVA e il Codice Fiscale per l'azienda italiana "${newCustomer.ragioneSociale}". Se non trovi uno dei due valori, lascialo come stringa vuota.`;
            
            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt,
                config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json",
                    responseSchema: { type: Type.OBJECT, properties: { piva: { type: Type.STRING }, codiceFiscale: { type: Type.STRING } }, required: ['piva', 'codiceFiscale'] }
                }
            });

            if (response.text) {
                const data = JSON.parse(response.text.trim());
                setNewCustomer(prev => ({...prev, piva: data.piva || prev.piva, codiceFiscale: data.codiceFiscale || prev.codiceFiscale}));
                showAlert('Dati trovati e compilati!', 'success');
            } else {
                 showAlert('Nessun dato trovato per questa azienda.', 'warning');
            }
        } catch (error: any) {
            console.error("Autofill error:", error);
            const errorMsg = error?.message || "";
            if (errorMsg.includes('GEMINI_API_KEY') || errorMsg.includes('401') || errorMsg.includes('403')) {
                showAlert("Errore: Chiave API non valida o mancante nelle impostazioni.", 'error');
            } else {
                showAlert("Errore durante la ricerca automatica.", 'error');
            }
        } finally {
            setIsAutofilling(false);
        }
    };
    
    if (isLoadingCustomers) return <Spinner />;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Clienti</h2>
                    <button onClick={() => setIsCustomerModalOpen(true)} className="flex items-center text-sm bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600">
                        <PlusIcon className="w-4 h-4 mr-1" />
                        Aggiungi
                    </button>
                </div>
                <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {customers.map(customer => (
                        <li key={customer.id}><button onClick={() => setSelectedCustomer(customer)} className={`w-full text-left p-3 rounded-md transition ${selectedCustomer?.id === customer.id ? 'bg-indigo-100 text-indigo-800' : 'hover:bg-gray-100'}`}><p className="font-semibold">{customer.ragioneSociale}</p><p className="text-sm text-gray-600">P.IVA: {customer.piva}</p></button></li>
                    ))}
                </ul>
            </div>

            <div className="md:col-span-2 bg-white p-4 rounded-lg shadow">
                 {selectedCustomer ? (
                    <>
                        <div className="flex justify-between items-center mb-4 border-b pb-4">
                            <div><h2 className="text-xl font-bold text-gray-800">Cantieri di {selectedCustomer.ragioneSociale}</h2><p className="text-sm text-gray-500">{selectedCustomer.indirizzo}, {selectedCustomer.citta}</p></div>
                            <button onClick={() => setIsSiteModalOpen(true)} className="flex items-center text-sm bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 whitespace-nowrap"><PlusIcon className="w-4 h-4 mr-1" />Nuovo Cantiere</button>
                        </div>
                        {isLoadingSites ? <Spinner /> : (
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                {sites.length > 0 ? sites.map(site => (
                                    <details key={site.id} className="p-4 border rounded-lg bg-gray-50 group transition-all duration-300 open:bg-white open:shadow-md">
                                        <summary className="flex justify-between items-center cursor-pointer list-none">
                                            <div><h3 className="font-bold text-lg text-gray-800">{site.nome}</h3><p className="text-sm text-gray-600 mb-2">{site.indirizzo}</p></div>
                                            <span className="text-gray-500 group-open:rotate-90 transform transition-transform"><ChevronRight className="w-5 h-5" /></span>
                                        </summary>
                                        <div className="mt-4 pt-4 border-t space-y-6">
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="text-sm font-semibold text-gray-600 uppercase">Lista Materiali da Ordinare</h4>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => { setSiteToEdit(site); setIsAddMaterialModalOpen(true); }} className="flex items-center text-xs bg-indigo-500 text-white px-2 py-1 rounded-md hover:bg-indigo-600"><PlusIcon className="w-3 h-3 mr-1" />Aggiungi</button>
                                                        <button onClick={() => selectedCustomer && handleDownloadChecklist(site, selectedCustomer)} className="flex items-center text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-md hover:bg-gray-300"><DownloadIcon className="w-3 h-3 mr-1.5" />Stampa Lista</button>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    {site.materialeDaAcquistare.length > 0 ? site.materialeDaAcquistare.map((item, index) => {
                                                        const product = productMap.get(item.productId);
                                                        if (!product) return <div key={index} className="text-red-500 text-sm italic">Prodotto non trovato ID: {item.productId}</div>;
                                                        const isOverdue = item.dueDate && !item.purchased && new Date(item.dueDate) < today;
                                                        return (
                                                        <div key={index} className="grid grid-cols-12 gap-2 items-center p-1 rounded-md hover:bg-gray-100">
                                                            <div className="col-span-1"><input type="checkbox" checked={item.purchased} onChange={(e) => handleMaterialUpdate(site.id, index, { purchased: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"/></div>
                                                            <div className={`col-span-5 ${item.purchased ? 'line-through text-gray-500' : ''}`}><p className="text-sm font-medium">{product.prodotto}</p><p className="text-xs text-gray-500">Cod: {product.codiceProdotto}</p></div>
                                                            <div className="col-span-2"><input type="number" value={item.quantity} onChange={(e) => handleMaterialUpdate(site.id, index, { quantity: parseInt(e.target.value) || 1 })} className="w-16 text-sm p-1 border rounded-md"/></div>
                                                            <div className="col-span-3 flex items-center gap-1">
                                                                {isOverdue && <AlertTriangle className="w-4 h-4 text-red-500" />}
                                                                <div className="relative group"><CalendarIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" /><input type="date" value={item.dueDate || ''} onChange={(e) => handleMaterialUpdate(site.id, index, { dueDate: e.target.value })} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Imposta scadenza"/></div>
                                                                {item.dueDate && <span className="text-xs text-gray-500 hidden sm:inline">{new Date(item.dueDate).toLocaleDateString('it-IT')}</span>}
                                                            </div>
                                                            <div className="col-span-1 text-right"><button onClick={() => handleRemoveMaterial(site.id, index)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button></div>
                                                        </div>
                                                    )}) : <p className="text-sm text-gray-500 italic">Nessun materiale in lista.</p>}
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-600 uppercase mb-2">Preventivi Associati</h4>
                                                {isLoadingSiteDetails ? <Spinner text="Carico..." /> : (
                                                    <div className="space-y-2">
                                                        {(siteQuotes[site.id] && siteQuotes[site.id].length > 0) ? siteQuotes[site.id].map(quote => (<div key={quote.id} className="flex justify-between items-center p-2 bg-blue-50 rounded-md text-sm"><span className="font-semibold text-blue-800">{quote.quoteNumber}</span><span className="text-blue-700">{new Date(quote.date).toLocaleDateString('it-IT')}</span><span className="font-bold text-blue-900">€{quote.total.toFixed(2)}</span></div>)) : <p className="text-sm text-gray-500 italic">Nessun preventivo trovato.</p>}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-600 uppercase mb-2">Acquisti Registrati</h4>
                                                {isLoadingSiteDetails ? <Spinner text="Carico..." /> : (
                                                     <div className="space-y-2">
                                                        {(sitePurchases[site.id] && sitePurchases[site.id].length > 0) ? sitePurchases[site.id].map(purchase => (<details key={purchase.id} className="p-2 bg-green-50 rounded-md text-sm group/purchase"><summary className="flex justify-between items-center cursor-pointer list-none"><span className="font-semibold text-green-800">Acquisto del {new Date(purchase.date).toLocaleDateString('it-IT')}</span><span className="font-bold text-green-900">€{purchase.total.toFixed(2)}</span><span className="text-gray-500 group-open/purchase:rotate-90 transform transition-transform"><ChevronRight className="w-4 h-4" /></span></summary><div className="mt-2 pt-2 border-t border-green-200">{purchase.items.map((item, idx) => (<div key={idx} className="flex justify-between text-xs py-1"><span>{item.quantity}x {item.product.prodotto}</span><span className="font-mono">€{(item.quantity * item.product.prezzoAcquisto).toFixed(2)}</span></div>))}</div></details>)) : <p className="text-sm text-gray-500 italic">Nessun acquisto registrato.</p>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </details>
                                )) : <p className="text-gray-500 text-center pt-8">Nessun cantiere per questo cliente.</p>}
                            </div>
                        )}
                    </>
                 ) : (
                    <div className="flex justify-center items-center h-full"><p className="text-gray-500">Seleziona un cliente per vedere i suoi cantieri.</p></div>
                 )}
            </div>

            <Modal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} title="Nuovo Cliente" size="lg">
                <form onSubmit={handleAddCustomer} className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700">Ragione Sociale</label><div className="relative"><input type="text" name="ragioneSociale" value={newCustomer.ragioneSociale} onChange={handleCustomerFormChange} className="mt-1 w-full p-2 border rounded-md pr-28" required /><button type="button" onClick={handleAutoFillCustomerData} disabled={isAutofilling} className="absolute inset-y-0 right-0 my-1 mr-1 flex items-center bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 rounded-md hover:bg-indigo-200 disabled:opacity-50">{isAutofilling ? (<div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>) : (<><SparklesIcon className="w-4 h-4 mr-1" />Trova Dati</>)}</button></div></div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700">P.IVA</label><input type="text" name="piva" value={newCustomer.piva} onChange={handleCustomerFormChange} className="mt-1 w-full p-2 border rounded-md" required /></div><div><label className="block text-sm font-medium text-gray-700">Codice Fiscale</label><input type="text" name="codiceFiscale" value={newCustomer.codiceFiscale} onChange={handleCustomerFormChange} className="mt-1 w-full p-2 border rounded-md" required /></div></div>
                    <div><label className="block text-sm font-medium text-gray-700">Indirizzo</label><input type="text" name="indirizzo" value={newCustomer.indirizzo} onChange={handleCustomerFormChange} className="mt-1 w-full p-2 border rounded-md" /></div>
                    <div className="grid grid-cols-3 gap-4"><div><label className="block text-sm font-medium text-gray-700">Città</label><input type="text" name="citta" value={newCustomer.citta} onChange={handleCustomerFormChange} className="mt-1 w-full p-2 border rounded-md" /></div><div><label className="block text-sm font-medium text-gray-700">CAP</label><input type="text" name="cap" value={newCustomer.cap} onChange={handleCustomerFormChange} className="mt-1 w-full p-2 border rounded-md" /></div><div><label className="block text-sm font-medium text-gray-700">Prov.</label><input type="text" name="provincia" value={newCustomer.provincia} onChange={handleCustomerFormChange} className="mt-1 w-full p-2 border rounded-md" /></div></div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700">Email</label><input type="email" name="email" value={newCustomer.email} onChange={handleCustomerFormChange} className="mt-1 w-full p-2 border rounded-md" /></div><div><label className="block text-sm font-medium text-gray-700">Telefono</label><input type="tel" name="telefono" value={newCustomer.telefono} onChange={handleCustomerFormChange} className="mt-1 w-full p-2 border rounded-md" /></div></div>
                    <div className="flex justify-end pt-2 space-x-2"><button type="button" onClick={() => setIsCustomerModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md">Annulla</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Salva Cliente</button></div>
                </form>
            </Modal>

            <Modal isOpen={isSiteModalOpen} onClose={() => setIsSiteModalOpen(false)} title={`Nuovo Cantiere per ${selectedCustomer?.ragioneSociale}`}>
                 <form onSubmit={handleAddSite} className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700">Nome Cantiere</label><input type="text" name="nome" value={newSiteForm.nome} onChange={handleSiteFormChange} className="mt-1 w-full p-2 border rounded-md" required placeholder="Es. Ristrutturazione Bagno"/></div>
                    <div><label className="block text-sm font-medium text-gray-700">Indirizzo Cantiere</label><input type="text" name="indirizzo" value={newSiteForm.indirizzo} onChange={handleSiteFormChange} className="mt-1 w-full p-2 border rounded-md" required placeholder="Via, Città, CAP"/></div>
                    <div className="flex justify-end pt-2 space-x-2"><button type="button" onClick={() => setIsSiteModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md">Annulla</button><button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md">Salva Cantiere</button></div>
                 </form>
            </Modal>
            
            {siteToEdit && <AddMaterialModal isOpen={isAddMaterialModalOpen} onClose={() => { setIsAddMaterialModalOpen(false); setSiteToEdit(null); }} allProducts={allProducts} onAddProduct={handleAddProductToSite} existingProductIds={new Set(siteToEdit.materialeDaAcquistare.map(m => m.productId))} />}
        </div>
    );
}

export default CustomerView;

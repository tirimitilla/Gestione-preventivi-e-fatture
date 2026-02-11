import { ShopInfo, Category, Product, Customer, ConstructionSite, Purchase, PurchaseItem, Quote, QuoteItem } from '../types';

export const UNCATEGORIZED_CAT_ID = 'cat-uncategorized';

// --- MOCK DATABASE ---
let mockShopInfo: ShopInfo = { name: 'ELETTRO-CALORE IMPIANTI', description: 'VIA ELETTRICA 123, ROMA', vatRate: 22 };

let mockCategories: Category[] = [
  { id: 'cat-1', name: 'Abbigliamento', profitMargin: 50, vatRate: 22 },
  { id: 'cat-2', name: 'Elettronica', profitMargin: 30, vatRate: 22 },
  { id: 'cat-3', name: 'Materiale Elettrico', profitMargin: 60, vatRate: 10 },
  { id: UNCATEGORIZED_CAT_ID, name: 'Da Assegnare', profitMargin: 0, vatRate: 22 },
];

let mockProducts: Product[] = [
  { id: 'prod-1', categoryId: 'cat-1', codiceProdotto: 'TSH-001', prodotto: 'Maglietta Nera', quantita: 50, prezzoAcquisto: 8.50, prezzoVendita: 12.75 },
  { id: 'prod-2', categoryId: 'cat-1', codiceProdotto: 'JNS-004', prodotto: 'Jeans Slim Fit', quantita: 30, prezzoAcquisto: 25.00, prezzoVendita: 37.50 },
  { id: 'prod-3', categoryId: 'cat-2', codiceProdotto: 'HDP-002', prodotto: 'Cuffie Bluetooth', quantita: 20, prezzoAcquisto: 45.00, prezzoVendita: 58.50 },
  { id: 'prod-4', categoryId: 'cat-2', codiceProdotto: 'MSE-007', prodotto: 'Mouse Wireless', quantita: 100, prezzoAcquisto: 12.00, prezzoVendita: 15.60 },
  { id: 'prod-5', categoryId: 'cat-3', codiceProdotto: 'CAV-01', prodotto: 'Cavo HDMI 2m', quantita: 80, prezzoAcquisto: 5.50, prezzoVendita: 8.80 },
];

let mockCustomers: Customer[] = [
  { id: 'cust-1', ragioneSociale: 'Mario Rossi SRL', piva: '12345678901', codiceFiscale: 'RSSMRA80A01H501Y', indirizzo: 'Via Roma 1', citta: 'Milano', cap: '20121', provincia: 'MI', email: 'mario@rossi.it', telefono: '021234567' },
  { id: 'cust-2', ragioneSociale: 'Bianchi Costruzioni', piva: '09876543210', codiceFiscale: 'BNCFRC75B02F205Z', indirizzo: 'Corso Vittorio Emanuele 10', citta: 'Torino', cap: '10121', provincia: 'TO', email: 'info@bianchi.com', telefono: '011987654' },
];

let mockConstructionSites: ConstructionSite[] = [
  { id: 'site-1', customerId: 'cust-1', nome: 'Ristrutturazione Appartamento', indirizzo: 'Via Garibaldi 5, Milano', materialeDaAcquistare: [
      { text: 'Piastrelle bagno', purchased: true },
      { text: 'Sanitari', purchased: false },
      { text: 'Pittura bianca', purchased: false },
  ]},
  { id: 'site-2', customerId: 'cust-1', nome: 'Ufficio Direzionale', indirizzo: 'Piazza Duomo 1, Milano', materialeDaAcquistare: [
      { text: 'Cartongesso', purchased: false },
      { text: 'Faretti LED', purchased: false },
  ]},
  { id: 'site-3', customerId: 'cust-2', nome: 'Nuova Villetta', indirizzo: 'Strada del Pino 15, Pecetto Torinese', materialeDaAcquistare: [
      { text: 'Cemento', purchased: true },
      { text: 'Mattoni', purchased: true },
      { text: 'Tegole', purchased: false },
  ]},
];

let mockPurchases: Purchase[] = [
    { id: 'purch-1', customerId: 'cust-1', siteId: 'site-1', date: '2023-10-15', items: [
        { product: mockProducts.find(p => p.id === 'prod-5')!, quantity: 20 },
    ], total: 110.00 },
    { id: 'purch-2', customerId: 'cust-1', siteId: 'site-1', date: '2023-10-18', items: [
        { product: mockProducts.find(p => p.id === 'prod-1')!, quantity: 5 },
    ], total: 42.50 },
];

let mockQuotes: Quote[] = [
    {
        id: 'quote-seed-1',
        quoteNumber: 'PREV-2024-001',
        customerId: 'cust-1',
        siteId: 'site-1',
        date: '2024-05-10',
        items: [
            { product: mockProducts.find(p => p.id === 'prod-5')!, quantity: 15 },
            { product: mockProducts.find(p => p.id === 'prod-3')!, quantity: 1 },
        ],
        notes: 'Lavori di ristrutturazione impianto elettrico.',
        subtotal: 190.5,
        tax: 24.9, // Mixed VAT
        total: 215.4,
        vatRate: 13.07
    },
    {
        id: 'quote-seed-2',
        quoteNumber: 'PREV-2024-002',
        customerId: 'cust-2',
        siteId: 'site-3',
        date: '2024-06-01',
        items: [
            { product: mockProducts.find(p => p.id === 'prod-1')!, quantity: 10 },
        ],
        notes: 'Fornitura abbigliamento da lavoro.',
        subtotal: 127.5,
        tax: 28.05,
        total: 155.55,
        vatRate: 22
    }
];
let quoteCounter = 2;
let mockDocumentHistory: string[] = [];
// ---------------------

const simulateDelay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const getHeaderInfo = async (): Promise<ShopInfo> => {
  await simulateDelay(300);
  return { ...mockShopInfo };
};

export const saveHeaderInfo = async (name: string, description: string, vatRate: number): Promise<string> => {
  await simulateDelay(500);
  mockShopInfo = { name, description, vatRate };
  return "Intestazione salvata con successo";
};

export const getCategories = async (): Promise<Category[]> => {
  await simulateDelay(400);
  return [...mockCategories];
};

export const createCategory = async (categoryName: string, profitMargin: number, vatRate: number): Promise<Category> => {
  await simulateDelay(600);
  if (mockCategories.some(c => c.name.toLowerCase() === categoryName.toLowerCase())) {
    throw new Error('Categoria già esistente');
  }
  const newCategory: Category = { id: `cat-${Date.now()}`, name: categoryName, profitMargin, vatRate };
  mockCategories.push(newCategory);
  return newCategory;
};

export const getProducts = async (categoryId: string): Promise<Product[]> => {
  await simulateDelay(700);
  return mockProducts.filter(p => p.categoryId === categoryId);
};

export const getAllProducts = async (): Promise<Product[]> => {
  await simulateDelay(500);
  return [...mockProducts];
}

export const addProduct = async (productData: Omit<Product, 'id'>): Promise<Product> => {
  await simulateDelay(500);
  
  const existingProductIndex = mockProducts.findIndex(p => p.codiceProdotto.toLowerCase() === productData.codiceProdotto.toLowerCase());

  if (existingProductIndex !== -1) {
    // Product exists, UPDATE it (UPSERT logic)
    const existingProduct = mockProducts[existingProductIndex];
    
    const updatedProduct: Product = {
      ...existingProduct,
      prodotto: productData.prodotto,
      prezzoAcquisto: productData.prezzoAcquisto,
      prezzoVendita: productData.prezzoVendita,
      quantita: existingProduct.quantita + productData.quantita,
    };

    if (productData.categoryId && productData.categoryId !== UNCATEGORIZED_CAT_ID) {
      updatedProduct.categoryId = productData.categoryId;
    }
    
    mockProducts[existingProductIndex] = updatedProduct;
    return updatedProduct;

  } else {
    // Product does NOT exist, CREATE it
    const finalProductData = { ...productData };
    if (!finalProductData.categoryId) {
        finalProductData.categoryId = UNCATEGORIZED_CAT_ID;
    }

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      ...finalProductData,
    };
    mockProducts.push(newProduct);
    return newProduct;
  }
};

export const updateProduct = async (productId: string, productData: Omit<Product, 'id'>): Promise<Product> => {
  await simulateDelay(800);
  const productIndex = mockProducts.findIndex(p => p.id === productId);
  if (productIndex === -1) {
    throw new Error('Prodotto non trovato');
  }
  const updatedProduct = { id: productId, ...productData };
  mockProducts[productIndex] = updatedProduct;
  return updatedProduct;
};

export const deleteProduct = async (productId: string): Promise<string> => {
  await simulateDelay(500);
  const initialLength = mockProducts.length;
  mockProducts = mockProducts.filter(p => p.id !== productId);
  if (mockProducts.length === initialLength) {
    throw new Error('Prodotto non trovato');
  }
  return "Prodotto eliminato con successo";
};

// --- Customer Functions ---
export const getCustomers = async (): Promise<Customer[]> => {
  await simulateDelay(500);
  return [...mockCustomers];
};

export const addCustomer = async (customerData: Omit<Customer, 'id'>): Promise<Customer> => {
    await simulateDelay(600);
    if (mockCustomers.some(c => c.piva === customerData.piva || c.codiceFiscale === customerData.codiceFiscale)) {
        throw new Error('Cliente con questa P.IVA o Codice Fiscale già esistente.');
    }
    const newCustomer: Customer = { id: `cust-${Date.now()}`, ...customerData };
    mockCustomers.push(newCustomer);
    return newCustomer;
}

// --- Construction Site Functions ---
export const getConstructionSites = async (customerId: string): Promise<ConstructionSite[]> => {
    await simulateDelay(400);
    return mockConstructionSites.filter(site => site.customerId === customerId);
};

export const addConstructionSite = async (siteData: Omit<ConstructionSite, 'id' | 'materialeDaAcquistare'> & { materialeDaAcquistare: { text: string; purchased: boolean }[] }): Promise<ConstructionSite> => {
    await simulateDelay(500);
    const newSite: ConstructionSite = { id: `site-${Date.now()}`, ...siteData };
    mockConstructionSites.push(newSite);
    return newSite;
}

export const updateSiteMaterials = async (siteId: string, materials: { text: string; purchased: boolean }[]): Promise<ConstructionSite> => {
    await simulateDelay(400);
    const siteIndex = mockConstructionSites.findIndex(s => s.id === siteId);
    if (siteIndex === -1) {
      throw new Error('Cantiere non trovato');
    }
    mockConstructionSites[siteIndex].materialeDaAcquistare = materials;
    return { ...mockConstructionSites[siteIndex] };
};

// --- Purchase Functions ---
export const getPurchasesForSite = async (siteId: string): Promise<Purchase[]> => {
    await simulateDelay(600);
    return mockPurchases.filter(p => p.siteId === siteId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const addPurchase = async (purchaseData: Omit<Purchase, 'id'>): Promise<Purchase> => {
    await simulateDelay(700);
    const newPurchase: Purchase = {
        id: `purch-${Date.now()}`,
        ...purchaseData,
    };
    mockPurchases.push(newPurchase);
    return newPurchase;
};

// --- Quote Functions ---
export const getQuotesForSite = async (siteId: string): Promise<Quote[]> => {
    await simulateDelay(500);
    return mockQuotes.filter(q => q.siteId === siteId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const saveQuote = async (quoteData: Omit<Quote, 'id' | 'quoteNumber'>): Promise<Quote> => {
    await simulateDelay(700);
    quoteCounter++;
    const year = new Date().getFullYear();
    const newQuote: Quote = {
        id: `quote-${Date.now()}`,
        quoteNumber: `PREV-${year}-${String(quoteCounter).padStart(3, '0')}`,
        ...quoteData,
    };
    mockQuotes.push(newQuote);
    console.log("Saved Quotes:", mockQuotes); // For debugging
    return newQuote;
};


// --- Document Import Duplication Check ---

export const createDocumentSignature = (
    supplier: string, 
    date: string, 
    products: { codiceProdotto?: string; quantita: number }[]
): string => {
    const normalizedSupplier = supplier.toLowerCase().trim();
    const productString = products
        .map(p => `${p.codiceProdotto || 'N/A'}:${p.quantita}`)
        .sort()
        .join(';');
    return `${normalizedSupplier}|${date}|${productString}`;
};

export const checkDocumentExists = async (signature: string): Promise<boolean> => {
    await simulateDelay(200);
    return mockDocumentHistory.includes(signature);
};

export const recordDocumentUpload = async (signature: string): Promise<void> => {
    await simulateDelay(200);
    if (!mockDocumentHistory.includes(signature)) {
        mockDocumentHistory.push(signature);
    }
    console.log("Document History:", mockDocumentHistory); // For debugging
};
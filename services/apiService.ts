
import { ShopInfo, Category, Product, Customer, ConstructionSite, Purchase, PurchaseItem, Quote, QuoteItem, SiteMaterial } from '../types';
import { supabase } from './supabase';

export const UNCATEGORIZED_CAT_ID = 'da-assegnare-id'; // Will be updated dynamically if needed, or we use the name

// --- HELPERS ---
const mapProduct = (p: any): Product => ({
  id: p.id,
  categoryId: p.category_id || p.categoryId,
  codiceProdotto: p.codice_prodotto || p.codiceProdotto || 'N/A',
  prodotto: p.prodotto || p.Prodotto || 'Senza Nome',
  quantita: Number(p.quantita || p.Quantita || 0),
  prezzoAcquisto: Number(p.prezzo_acquisto || p.prezzoAcquisto || 0),
  prezzoVendita: Number(p.prezzo_vendita || p.prezzoVendita || 0),
});

const mapCustomer = (c: any): Customer => ({
  id: c.id,
  ragioneSociale: c.ragione_sociale || c.ragioneSociale || 'Senza Nome',
  piva: c.piva || c.pIva || '',
  codiceFiscale: c.codice_fiscale || c.codiceFiscale || '',
  indirizzo: c.indirizzo || c.Indirizzo || '',
  citta: c.citta || c.Citta || '',
  cap: c.cap || c.Cap || '',
  provincia: c.provincia || c.Provincia || '',
  email: c.email || c.Email || '',
  telefono: c.telefono || c.Telefono || '',
});

const mapSite = (s: any): ConstructionSite => ({
  id: s.id,
  customerId: s.customer_id || s.customerId,
  nome: s.nome || s.Nome || 'Senza Nome',
  indirizzo: s.indirizzo || s.Indirizzo || '',
  materialeDaAcquistare: s.materiale_da_acquistare || s.materialeDaAcquistare || [],
});

// --- API FUNCTIONS ---

export const getHeaderInfo = async (): Promise<ShopInfo> => {
  const { data, error } = await supabase
    .from('shop_info')
    .select('*')
    .eq('id', 1)
    .single();
  
  if (error) throw error;
  return {
    name: data.name,
    companyName: data.company_name,
    description: data.description,
    codiceFiscale: data.codice_fiscale,
    iban: data.iban,
    paymentConditions: data.payment_conditions,
    vatRate: Number(data.vat_rate),
  };
};

export const saveHeaderInfo = async (newInfo: Omit<ShopInfo, 'name'>): Promise<string> => {
  const { error } = await supabase
    .from('shop_info')
    .update({
      company_name: newInfo.companyName,
      description: newInfo.description,
      codice_fiscale: newInfo.codiceFiscale,
      iban: newInfo.iban,
      payment_conditions: newInfo.paymentConditions,
      vat_rate: newInfo.vatRate,
    })
    .eq('id', 1);
  
  if (error) throw error;
  return "Intestazione salvata con successo";
};

export const getCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data.map(c => ({
    id: c.id,
    name: c.name,
    profitMargin: Number(c.profit_margin),
    vatRate: Number(c.vat_rate),
  }));
};

export const createCategory = async (categoryName: string, profitMargin: number, vatRate: number): Promise<Category> => {
  const { data, error } = await supabase
    .from('categories')
    .insert([{ name: categoryName, profit_margin: profitMargin, vat_rate: vatRate }])
    .select()
    .single();
  
  if (error) {
    if (error.code === '23505') throw new Error('Categoria già esistente');
    throw error;
  }
  return {
    id: data.id,
    name: data.name,
    profitMargin: Number(data.profit_margin),
    vatRate: Number(data.vat_rate),
  };
};

export const getProducts = async (categoryId: string): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('category_id', categoryId);
  
  if (error) throw error;
  return data.map(mapProduct);
};

export const getAllProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*');
  
  if (error) throw error;
  return data.map(mapProduct);
};

export const addProduct = async (productData: Omit<Product, 'id'>): Promise<Product> => {
  // Check if product exists by code
  const { data: existing } = await supabase
    .from('products')
    .select('*')
    .eq('codice_prodotto', productData.codiceProdotto)
    .single();

  if (existing) {
    // Update existing
    const { data: updated, error } = await supabase
      .from('products')
      .update({
        prodotto: productData.prodotto,
        prezzo_acquisto: productData.prezzoAcquisto,
        prezzo_vendita: productData.prezzoVendita,
        quantita: Number(existing.quantita) + productData.quantita,
        category_id: (productData.categoryId && productData.categoryId !== UNCATEGORIZED_CAT_ID) ? productData.categoryId : existing.category_id
      })
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) throw error;
    return mapProduct(updated);
  } else {
    // Insert new
    let catId = productData.categoryId;
    if (!catId || catId === UNCATEGORIZED_CAT_ID) {
      const { data: uncategorized } = await supabase
        .from('categories')
        .select('id')
        .eq('name', 'Da Assegnare')
        .single();
      catId = uncategorized?.id;
    }

    const { data: inserted, error } = await supabase
      .from('products')
      .insert([{
        category_id: catId,
        codice_prodotto: productData.codiceProdotto,
        prodotto: productData.prodotto,
        quantita: productData.quantita,
        prezzo_acquisto: productData.prezzoAcquisto,
        prezzo_vendita: productData.prezzoVendita,
      }])
      .select()
      .single();
    
    if (error) throw error;
    return mapProduct(inserted);
  }
};

export const updateProduct = async (productId: string, productData: Omit<Product, 'id'>): Promise<Product> => {
  const { data, error } = await supabase
    .from('products')
    .update({
      category_id: productData.categoryId,
      codice_prodotto: productData.codiceProdotto,
      prodotto: productData.prodotto,
      quantita: productData.quantita,
      prezzo_acquisto: productData.prezzoAcquisto,
      prezzo_vendita: productData.prezzoVendita,
    })
    .eq('id', productId)
    .select()
    .single();
  
  if (error) throw error;
  return mapProduct(data);
};

export const deleteProduct = async (productId: string): Promise<string> => {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);
  
  if (error) throw error;
  return "Prodotto eliminato con successo";
};

// --- Customer Functions ---
export const getCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('ragione_sociale');
  
  if (error) throw error;
  return data.map(mapCustomer);
};

export const addCustomer = async (customerData: Omit<Customer, 'id'>): Promise<Customer> => {
  const { data, error } = await supabase
    .from('customers')
    .insert([{
      ragione_sociale: customerData.ragioneSociale,
      piva: customerData.piva,
      codice_fiscale: customerData.codiceFiscale,
      indirizzo: customerData.indirizzo,
      citta: customerData.citta,
      cap: customerData.cap,
      provincia: customerData.provincia,
      email: customerData.email,
      telefono: customerData.telefono,
    }])
    .select()
    .single();
  
  if (error) {
    if (error.code === '23505') throw new Error('Cliente con questa P.IVA o Codice Fiscale già esistente.');
    throw error;
  }
  return mapCustomer(data);
};

// --- Construction Site Functions ---
export const getConstructionSites = async (customerId: string): Promise<ConstructionSite[]> => {
  const { data, error } = await supabase
    .from('construction_sites')
    .select('*')
    .eq('customer_id', customerId);
  
  if (error) throw error;
  return data.map(mapSite);
};

export const addConstructionSite = async (siteData: Omit<ConstructionSite, 'id'>): Promise<ConstructionSite> => {
  const { data, error } = await supabase
    .from('construction_sites')
    .insert([{
      customer_id: siteData.customerId,
      nome: siteData.nome,
      indirizzo: siteData.indirizzo,
      materiale_da_acquistare: siteData.materialeDaAcquistare,
    }])
    .select()
    .single();
  
  if (error) throw error;
  return mapSite(data);
};

export const updateSiteMaterials = async (siteId: string, materials: SiteMaterial[]): Promise<ConstructionSite> => {
  const { data, error } = await supabase
    .from('construction_sites')
    .update({ materiale_da_acquistare: materials })
    .eq('id', siteId)
    .select()
    .single();
  
  if (error) throw error;
  return mapSite(data);
};

// --- Purchase Functions ---
export const getPurchasesForSite = async (siteId: string): Promise<Purchase[]> => {
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .eq('site_id', siteId)
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data.map(p => ({
    id: p.id,
    customerId: p.customer_id,
    siteId: p.site_id,
    date: p.date,
    items: p.items,
    total: Number(p.total),
  }));
};

export const addPurchase = async (purchaseData: Omit<Purchase, 'id'>): Promise<Purchase> => {
  const { data, error } = await supabase
    .from('purchases')
    .insert([{
      customer_id: purchaseData.customerId,
      site_id: purchaseData.siteId,
      date: purchaseData.date,
      items: purchaseData.items,
      total: purchaseData.total,
    }])
    .select()
    .single();
  
  if (error) throw error;
  return {
    id: data.id,
    customerId: data.customer_id,
    siteId: data.site_id,
    date: data.date,
    items: data.items,
    total: Number(data.total),
  };
};

// --- Quote Functions ---
export const getQuotesForSite = async (siteId: string): Promise<Quote[]> => {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('site_id', siteId)
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data.map(q => ({
    id: q.id,
    quoteNumber: q.quote_number,
    customerId: q.customer_id,
    siteId: q.site_id,
    date: q.date,
    items: q.items,
    notes: q.notes || '',
    subtotal: Number(q.subtotal),
    tax: Number(q.tax),
    total: Number(q.total),
    vatRate: Number(q.vat_rate),
    includeVat: q.include_vat,
  }));
};

export const saveQuote = async (quoteData: Omit<Quote, 'id' | 'quoteNumber'>): Promise<Quote> => {
  const documentType = quoteData.documentType || 'quote';
  const prefix = documentType === 'quote' ? 'PREV' : 'PROF';
  
  // Get next quote number
  const year = new Date().getFullYear();
  const { data: lastQuote } = await supabase
    .from('quotes')
    .select('quote_number')
    .like('quote_number', `${prefix}-${year}-%`)
    .order('quote_number', { ascending: false })
    .limit(1)
    .single();
  
  let nextNum = 1;
  if (lastQuote) {
    const parts = lastQuote.quote_number.split('-');
    nextNum = parseInt(parts[parts.length - 1]) + 1;
  }
  
  const quoteNumber = `${prefix}-${year}-${String(nextNum).padStart(3, '0')}`;

  const { data, error } = await supabase
    .from('quotes')
    .insert([{
      quote_number: quoteNumber,
      customer_id: quoteData.customerId,
      site_id: quoteData.siteId,
      date: quoteData.date,
      items: quoteData.items,
      notes: quoteData.notes,
      subtotal: quoteData.subtotal,
      tax: quoteData.tax,
      total: quoteData.total,
      vat_rate: quoteData.vatRate,
      include_vat: quoteData.includeVat,
      document_type: documentType, // Attempt to save, if column doesn't exist it might fail or be ignored
    }])
    .select()
    .single();
  
  if (error) {
    // If document_type column doesn't exist, try without it
    if (error.code === 'PGRST204' || error.message.includes('column "document_type" does not exist')) {
        const { data: data2, error: error2 } = await supabase
            .from('quotes')
            .insert([{
                quote_number: quoteNumber,
                customer_id: quoteData.customerId,
                site_id: quoteData.siteId,
                date: quoteData.date,
                items: quoteData.items,
                notes: quoteData.notes,
                subtotal: quoteData.subtotal,
                tax: quoteData.tax,
                total: quoteData.total,
                vat_rate: quoteData.vatRate,
                include_vat: quoteData.includeVat,
            }])
            .select()
            .single();
        if (error2) throw error2;
        return {
            id: data2.id,
            quoteNumber: data2.quote_number,
            customerId: data2.customer_id,
            siteId: data2.site_id,
            date: data2.date,
            items: data2.items,
            notes: data2.notes || '',
            subtotal: Number(data2.subtotal),
            tax: Number(data2.tax),
            total: Number(data2.total),
            vatRate: Number(data2.vat_rate),
            includeVat: data2.include_vat,
            documentType: data2.quote_number.startsWith('PROF') ? 'proforma' : 'quote'
        };
    }
    throw error;
  }
  return {
    id: data.id,
    quoteNumber: data.quote_number,
    customerId: data.customer_id,
    siteId: data.site_id,
    date: data.date,
    items: data.items,
    notes: data.notes || '',
    subtotal: Number(data.subtotal),
    tax: Number(data.tax),
    total: Number(data.total),
    vatRate: Number(data.vat_rate),
    includeVat: data.include_vat,
    documentType: data.document_type || (data.quote_number.startsWith('PROF') ? 'proforma' : 'quote')
  };
};

export const updateQuote = async (quoteId: string, quoteData: Omit<Quote, 'id' | 'quoteNumber'>): Promise<Quote> => {
  const documentType = quoteData.documentType || 'quote';
  
  const { data, error } = await supabase
    .from('quotes')
    .update({
      customer_id: quoteData.customerId,
      site_id: quoteData.siteId,
      date: quoteData.date,
      items: quoteData.items,
      notes: quoteData.notes,
      subtotal: quoteData.subtotal,
      tax: quoteData.tax,
      total: quoteData.total,
      vat_rate: quoteData.vatRate,
      include_vat: quoteData.includeVat,
      document_type: documentType,
    })
    .eq('id', quoteId)
    .select()
    .single();
  
  if (error) {
    if (error.code === 'PGRST204' || error.message.includes('column "document_type" does not exist')) {
        const { data: data2, error: error2 } = await supabase
            .from('quotes')
            .update({
                customer_id: quoteData.customerId,
                site_id: quoteData.siteId,
                date: quoteData.date,
                items: quoteData.items,
                notes: quoteData.notes,
                subtotal: quoteData.subtotal,
                tax: quoteData.tax,
                total: quoteData.total,
                vat_rate: quoteData.vatRate,
                include_vat: quoteData.includeVat,
            })
            .eq('id', quoteId)
            .select()
            .single();
        if (error2) throw error2;
        return {
            id: data2.id,
            quoteNumber: data2.quote_number,
            customerId: data2.customer_id,
            siteId: data2.site_id,
            date: data2.date,
            items: data2.items,
            notes: data2.notes || '',
            subtotal: Number(data2.subtotal),
            tax: Number(data2.tax),
            total: Number(data2.total),
            vatRate: Number(data2.vat_rate),
            includeVat: data2.include_vat,
            documentType: data2.quote_number.startsWith('PROF') ? 'proforma' : 'quote'
        };
    }
    throw error;
  }
  return {
    id: data.id,
    quoteNumber: data.quote_number,
    customerId: data.customer_id,
    siteId: data.site_id,
    date: data.date,
    items: data.items,
    notes: data.notes || '',
    subtotal: Number(data.subtotal),
    tax: Number(data.tax),
    total: Number(data.total),
    vatRate: Number(data.vat_rate),
    includeVat: data.include_vat,
    documentType: data.document_type || (data.quote_number.startsWith('PROF') ? 'proforma' : 'quote')
  };
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
  const { data, error } = await supabase
    .from('document_history')
    .select('id')
    .eq('signature', signature)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
  return !!data;
};

export const recordDocumentUpload = async (signature: string): Promise<void> => {
  const { error } = await supabase
    .from('document_history')
    .insert([{ signature }]);
  
  if (error && error.code !== '23505') throw error; // Ignore duplicate signature error
};

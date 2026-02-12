
export interface ShopInfo {
  name: string;
  description: string;
  vatRate: number;
}

export interface Category {
  id: string;
  name: string;
  profitMargin: number;
  vatRate: number;
}

export interface Product {
  id: string;
  categoryId: string;
  codiceProdotto: string;
  prodotto: string;
  quantita: number;
  prezzoAcquisto: number;
  prezzoVendita: number;
}

export interface QuoteItem {
  product: Product;
  quantity: number;
}

export interface Customer {
  id: string;
  ragioneSociale: string;
  piva: string;
  codiceFiscale: string;
  indirizzo: string;
  citta: string;
  cap: string;
  provincia: string;
  email: string;
  telefono: string;
}

export interface SiteMaterial {
  productId: string;
  quantity: number;
  purchased: boolean;
  dueDate?: string;
}

export interface ConstructionSite {
  id: string;
  customerId: string;
  nome: string;
  indirizzo: string;
  materialeDaAcquistare: SiteMaterial[];
}

export interface PurchaseItem {
  product: Product;
  quantity: number;
}

export interface Purchase {
  id: string;
  customerId: string;
  siteId: string;
  date: string; // YYYY-MM-DD
  items: PurchaseItem[];
  total: number;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  customerId: string;
  siteId?: string;
  date: string; // YYYY-MM-DD
  items: QuoteItem[];
  notes: string;
  subtotal: number;
  tax: number;
  total: number;
  vatRate: number; // Represents the effective VAT rate for the whole quote
}

export interface Order {
  customerId: string;
  siteId?: string;
  date: string;
  items: PurchaseItem[];
  total: number;
}

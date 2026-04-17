
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  increment,
  onSnapshot
} from 'firebase/firestore';

import { db, auth } from '../firebase';
import { ShopInfo, Category, Product, Customer, ConstructionSite, Purchase, Quote, SiteMaterial } from '../types';

// --- SUBSCRIPTIONS ---

export const subscribeCategories = (onUpdate: (cats: Category[]) => void) => {
  const path = 'categories';
  const q = query(collection(db, path), orderBy('name'));
  return onSnapshot(q, (snapshot) => {
    onUpdate(snapshot.docs.map(mapDoc) as Category[]);
  }, (error) => handleFirestoreError(error, OperationType.GET, path));
};

export const subscribeAllProducts = (onUpdate: (prods: Product[]) => void) => {
  const path = 'products';
  const q = collection(db, path);
  return onSnapshot(q, (snapshot) => {
    onUpdate(snapshot.docs.map(mapDoc) as Product[]);
  }, (error) => handleFirestoreError(error, OperationType.GET, path));
};

export const subscribeCustomers = (onUpdate: (customers: Customer[]) => void) => {
  const path = 'customers';
  const q = query(collection(db, path), orderBy('ragioneSociale'));
  return onSnapshot(q, (snapshot) => {
    onUpdate(snapshot.docs.map(mapDoc) as Customer[]);
  }, (error) => handleFirestoreError(error, OperationType.GET, path));
};

export const UNCATEGORIZED_CAT_ID = 'da-assegnare-id';

// --- ERROR HANDLING ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- HELPERS ---

const mapDoc = (doc: any) => ({
  id: doc.id,
  ...doc.data()
});

// --- API FUNCTIONS ---

export const getHeaderInfo = async (): Promise<ShopInfo> => {
  const path = 'shop_info';
  try {
    const docRef = doc(db, path, 'settings');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as ShopInfo;
    } else {
      // Default info if not exists
      return {
        name: 'Ritrovo da Rocco',
        companyName: 'Ritrovo da Rocco di Pizzolante Antonella',
        description: 'Gestione magazzino e preventivi.',
        codiceFiscale: '',
        iban: '',
        paymentConditions: 'Visto fattura',
        vatRate: 22,
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    throw error;
  }
};

export const saveHeaderInfo = async (newInfo: Omit<ShopInfo, 'name'>): Promise<string> => {
  const path = 'shop_info';
  try {
    const docRef = doc(db, path, 'settings');
    await setDoc(docRef, { ...newInfo, name: 'Ritrovo da Rocco' }, { merge: true });
    return "Intestazione salvata con successo";
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  const path = 'categories';
  try {
    const q = query(collection(db, path), orderBy('name'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapDoc) as Category[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
};

export const createCategory = async (categoryName: string, profitMargin: number, vatRate: number): Promise<Category> => {
  const path = 'categories';
  try {
    const docRef = await addDoc(collection(db, path), {
      name: categoryName,
      profitMargin,
      vatRate,
      createdAt: serverTimestamp()
    });
    const docSnap = await getDoc(docRef);
    return mapDoc(docSnap) as Category;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
};

export const getProducts = async (categoryId: string): Promise<Product[]> => {
  const path = 'products';
  try {
    const q = query(collection(db, path), where('categoryId', '==', categoryId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapDoc) as Product[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
};

export const getAllProducts = async (): Promise<Product[]> => {
  const path = 'products';
  try {
    const querySnapshot = await getDocs(collection(db, path));
    return querySnapshot.docs.map(mapDoc) as Product[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
};

export const addProduct = async (productData: Omit<Product, 'id'>): Promise<Product> => {
  const path = 'products';
  try {
    // Check if product exists by code
    const q = query(collection(db, path), where('codiceProdotto', '==', productData.codiceProdotto), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const existingDoc = querySnapshot.docs[0];
      const existingData = existingDoc.data();
      
      const updatedData = {
        prodotto: productData.prodotto,
        prezzoAcquisto: productData.prezzoAcquisto,
        prezzoVendita: productData.prezzoVendita,
        quantita: increment(productData.quantita),
        categoryId: (productData.categoryId && productData.categoryId !== UNCATEGORIZED_CAT_ID) ? productData.categoryId : existingData.categoryId
      };
      
      await updateDoc(existingDoc.ref, updatedData);
      const updatedSnap = await getDoc(existingDoc.ref);
      return mapDoc(updatedSnap) as Product;
    } else {
      let catId = productData.categoryId;
      if (!catId || catId === UNCATEGORIZED_CAT_ID) {
        const catQ = query(collection(db, 'categories'), where('name', '==', 'Da Assegnare'), limit(1));
        const catSnap = await getDocs(catQ);
        if (!catSnap.empty) {
          catId = catSnap.docs[0].id;
        }
      }

      const docRef = await addDoc(collection(db, path), {
        ...productData,
        categoryId: catId || UNCATEGORIZED_CAT_ID,
        createdAt: serverTimestamp()
      });
      const insertedSnap = await getDoc(docRef);
      return mapDoc(insertedSnap) as Product;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
};

export const updateProduct = async (productId: string, productData: Omit<Product, 'id'>): Promise<Product> => {
  const path = `products/${productId}`;
  try {
    const docRef = doc(db, 'products', productId);
    await updateDoc(docRef, { ...productData });
    const updatedSnap = await getDoc(docRef);
    return mapDoc(updatedSnap) as Product;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
};

export const deleteProduct = async (productId: string): Promise<string> => {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
    return "Prodotto eliminato con successo";
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
};

export const getCustomers = async (): Promise<Customer[]> => {
  const path = 'customers';
  try {
    const q = query(collection(db, path), orderBy('ragioneSociale'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapDoc) as Customer[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
};

export const addCustomer = async (customerData: Omit<Customer, 'id'>): Promise<Customer> => {
  const path = 'customers';
  try {
    const docRef = await addDoc(collection(db, path), {
      ...customerData,
      createdAt: serverTimestamp()
    });
    const docSnap = await getDoc(docRef);
    return mapDoc(docSnap) as Customer;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
};

export const getConstructionSites = async (customerId: string): Promise<ConstructionSite[]> => {
  const path = 'construction_sites';
  try {
    const q = query(collection(db, path), where('customerId', '==', customerId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapDoc) as ConstructionSite[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
};

export const addConstructionSite = async (siteData: Omit<ConstructionSite, 'id'>): Promise<ConstructionSite> => {
  const path = 'construction_sites';
  try {
    const docRef = await addDoc(collection(db, path), {
      ...siteData,
      createdAt: serverTimestamp()
    });
    const docSnap = await getDoc(docRef);
    return mapDoc(docSnap) as ConstructionSite;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
};

export const updateSiteMaterials = async (siteId: string, materials: SiteMaterial[]): Promise<ConstructionSite> => {
  const path = `construction_sites/${siteId}`;
  try {
    const docRef = doc(db, 'construction_sites', siteId);
    await updateDoc(docRef, { materialeDaAcquistare: materials });
    const docSnap = await getDoc(docRef);
    return mapDoc(docSnap) as ConstructionSite;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
};

export const getPurchasesForSite = async (siteId: string): Promise<Purchase[]> => {
  const path = 'purchases';
  try {
    const q = query(collection(db, path), where('siteId', '==', siteId), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapDoc) as Purchase[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
};

export const addPurchase = async (purchaseData: Omit<Purchase, 'id'>): Promise<Purchase> => {
  const path = 'purchases';
  try {
    const docRef = await addDoc(collection(db, path), {
      ...purchaseData,
      createdAt: serverTimestamp()
    });
    const docSnap = await getDoc(docRef);
    return mapDoc(docSnap) as Purchase;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
};

export const getQuotesForSite = async (siteId: string): Promise<Quote[]> => {
  const path = 'quotes';
  try {
    const q = query(collection(db, path), where('siteId', '==', siteId), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapDoc) as Quote[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
};

export const saveQuote = async (quoteData: Omit<Quote, 'id' | 'quoteNumber'>): Promise<Quote> => {
  const path = 'quotes';
  try {
    const documentType = quoteData.documentType || 'quote';
    const prefix = documentType === 'quote' ? 'PREV' : 'PROF';
    const year = new Date().getFullYear();
    
    // Get next quote number
    const q = query(
      collection(db, path), 
      where('quoteNumber', '>=', `${prefix}-${year}-`),
      where('quoteNumber', '<=', `${prefix}-${year}-\uf8ff`),
      orderBy('quoteNumber', 'desc'),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    let nextNum = 1;
    if (!querySnapshot.empty) {
      const lastQuoteNumber = querySnapshot.docs[0].data().quoteNumber;
      const parts = lastQuoteNumber.split('-');
      nextNum = parseInt(parts[parts.length - 1]) + 1;
    }
    
    const quoteNumber = `${prefix}-${year}-${String(nextNum).padStart(3, '0')}`;

    const docRef = await addDoc(collection(db, path), {
      ...quoteData,
      quoteNumber,
      documentType,
      createdAt: serverTimestamp()
    });
    const docSnap = await getDoc(docRef);
    return mapDoc(docSnap) as Quote;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
};

export const updateQuote = async (quoteId: string, quoteData: Omit<Quote, 'id' | 'quoteNumber'>): Promise<Quote> => {
  const path = `quotes/${quoteId}`;
  try {
    const docRef = doc(db, 'quotes', quoteId);
    await updateDoc(docRef, { ...quoteData });
    const docSnap = await getDoc(docRef);
    return mapDoc(docSnap) as Quote;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
};

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
  const path = 'document_history';
  try {
    const q = query(collection(db, path), where('signature', '==', signature), limit(1));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    throw error;
  }
};

export const recordDocumentUpload = async (signature: string): Promise<void> => {
  const path = 'document_history';
  try {
    await addDoc(collection(db, path), { 
      signature,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
};

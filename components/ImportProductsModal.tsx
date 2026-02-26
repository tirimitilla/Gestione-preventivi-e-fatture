import React from 'react';
import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import Modal from './Modal';
import { Category, Product } from '../types';
import Spinner from './Spinner';
import * as api from '../services/apiService';

type StagedProduct = Omit<Product, 'id'>;

type UncategorizedProduct = Omit<Product, 'id' | 'categoryId' | 'codiceProdotto'> & {
    codiceProdotto?: string;
};

type ExtractedDocumentData = {
    fornitore: string;
    dataDocumento: string; // YYYY-MM-DD
    prodotti: (Omit<UncategorizedProduct, 'prezzoVendita'>)[];
};

interface ImportProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  importType: 'file' | 'camera' | null;
  onImportSuccess: (stagedProducts: StagedProduct[], signature: string) => void;
  showAlert: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  categories: Category[];
}

const fileToBase64 = (file: File): Promise<{ data: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({
            data: (reader.result as string).split(',')[1],
            mimeType: file.type
        });
        reader.onerror = error => reject(error);
    });
};

const ImportProductsModal: React.FC<ImportProductsModalProps> = ({ isOpen, onClose, importType, onImportSuccess, showAlert, categories }) => {
  type View = 'upload_file' | 'scanning';
  const [view, setView] = useState<View | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen) {
        if (importType === 'camera') {
            startCamera();
        } else if (importType === 'file') {
            setView('upload_file');
        }
    } else {
        stopCamera();
        setView(null);
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [isOpen, importType]);

  const runCategorizationAndFinalize = async (products: UncategorizedProduct[], signature: string) => {
      if (products.length === 0) {
          onImportSuccess([], signature);
          onClose();
          return;
      }

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
          showAlert("Errore di sistema: Chiave API non configurata su Vercel. Fai Redeploy.", "error");
          setIsLoading(false);
          return;
      }

      setLoadingMessage('Categorizzazione automatica in corso...');
      showAlert('Categorizzazione automatica in corso...', 'info');

      try {
          const ai = new GoogleGenAI({ apiKey });
          const availableCategories = categories.filter(c => c.id !== api.UNCATEGORIZED_CAT_ID);

          if (availableCategories.length === 0) {
              const finalProducts: StagedProduct[] = products.map(p => ({
                  prodotto: p.prodotto,
                  quantita: p.quantita,
                  prezzoAcquisto: p.prezzoAcquisto,
                  prezzoVendita: p.prezzoVendita,
                  categoryId: api.UNCATEGORIZED_CAT_ID,
                  codiceProdotto: p.codiceProdotto || `N/D-${Date.now()}`
              }));
              onImportSuccess(finalProducts, signature);
              showAlert('Nessuna categoria disponibile. I prodotti sono "Da Assegnare".', 'warning');
              return;
          }

          const categoryNames = availableCategories.map(c => c.name);
          const productNames = products.map(p => p.prodotto);
          const prompt = `Date le seguenti categorie: ${JSON.stringify(categoryNames)}. Per ciascuno dei seguenti prodotti, assegna la categoria più appropriata: ${JSON.stringify(productNames)}. Se nessuna è adatta, assegna 'Da Assegnare'. Rispondi con un array di oggetti JSON, con chiavi "prodotto" e "categoria".`;
          
          const response = await ai.models.generateContent({
              model: 'gemini-1.5-flash-latest', contents: prompt,
              config: { 
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { prodotto: { type: Type.STRING }, categoria: { type: Type.STRING } }, required: ['prodotto', 'categoria'] } }
              }
          });
          
          if (!response.text) throw new Error("La risposta AI per la categorizzazione era vuota.");
          
          const cleanJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
          const categorizationResult = JSON.parse(cleanJson) as {prodotto: string, categoria: string}[];
          const categorizationMap = new Map(categorizationResult.map(item => [item.prodotto, item.categoria]));
          const categoryNameToIdMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

          const productsWithCategories: StagedProduct[] = products.map(p => {
              const assignedCategoryName = categorizationMap.get(p.prodotto) || 'Da Assegnare';
              const categoryId = categoryNameToIdMap.get(assignedCategoryName.toLowerCase()) || api.UNCATEGORIZED_CAT_ID;
              return { 
                  prodotto: p.prodotto,
                  quantita: p.quantita,
                  prezzoAcquisto: p.prezzoAcquisto,
                  prezzoVendita: p.prezzoVendita,
                  categoryId: categoryId as string, 
                  codiceProdotto: p.codiceProdotto || `N/D-${Date.now()}` 
              };
          });

          onImportSuccess(productsWithCategories, signature);
      } catch (error: any) {
          console.error("Categorization error:", error);
          showAlert('Categorizzazione fallita. Assegna le categorie manualmente.', 'warning');
          const productsWithDefaults: StagedProduct[] = products.map(p => ({
              prodotto: p.prodotto,
              quantita: p.quantita,
              prezzoAcquisto: p.prezzoAcquisto,
              prezzoVendita: p.prezzoVendita,
              categoryId: api.UNCATEGORIZED_CAT_ID,
              codiceProdotto: p.codiceProdotto || `N/D-${Date.now()}`
          }));
          onImportSuccess(productsWithDefaults, signature);
      } finally {
          setLoadingMessage('');
          setIsLoading(false);
          onClose();
      }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setLoadingMessage('Analisi del documento...');
    
    try {
        let extractedData: ExtractedDocumentData;

        if (file.type === 'text/xml' || file.name.toLowerCase().endsWith('.xml')) {
            const text = await file.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "application/xml");
            if (xmlDoc.querySelector("parsererror")) throw new Error("Errore nel parsing del file XML.");
            
            const supplierNode = xmlDoc.querySelector("CedentePrestatore Denominazione");
            const dateNode = xmlDoc.querySelector("DatiGeneraliDocumento Data");
            const lines = xmlDoc.querySelectorAll("DettaglioLinee");

            if (!supplierNode || !dateNode || lines.length === 0) {
                 showAlert("XML non valido o mancante di dati essenziali.", 'error');
                 setIsLoading(false); return;
            }

            extractedData = {
                fornitore: supplierNode.textContent?.trim() || 'Sconosciuto',
                dataDocumento: dateNode.textContent?.trim() || new Date().toISOString().slice(0,10),
                prodotti: Array.from(lines).map(line => ({
                    prodotto: line.querySelector("Descrizione")?.textContent?.trim() || '',
                    codiceProdotto: line.querySelector("CodiceArticolo > CodiceValore")?.textContent?.trim() || undefined,
                    quantita: parseFloat(line.querySelector("Quantita")?.textContent?.trim() || '1'),
                    prezzoAcquisto: parseFloat(line.querySelector("PrezzoUnitario")?.textContent?.trim() || '0'),
                }))
            };
        } else {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
            if (!apiKey) {
                showAlert("Chiave API non trovata. Verifica VITE_GEMINI_API_KEY su Vercel e fai Redeploy.", "error");
                setIsLoading(false); return;
            }
            const { data: base64Data, mimeType } = await fileToBase64(file);
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash-latest',
                contents: { parts: [ { inlineData: { mimeType, data: base64Data } }, { text: 'Estrai fornitore, data (YYYY-MM-DD), e prodotti (nome, quantità, prezzo acquisto, codice). Restituisci JSON puro.' } ] },
                config: { responseMimeType: "application/json", responseSchema: {
                    type: Type.OBJECT, properties: {
                        fornitore: { type: Type.STRING }, dataDocumento: { type: Type.STRING },
                        prodotti: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { codiceProdotto: { type: Type.STRING }, prodotto: { type: Type.STRING }, quantita: { type: Type.NUMBER }, prezzoAcquisto: { type: Type.NUMBER } }, required: ['prodotto', 'quantita', 'prezzoAcquisto'] } }
                    }, required: ['fornitore', 'dataDocumento', 'prodotti']
                }}
            });
            if (!response.text) throw new Error("L'intelligenza artificiale non ha restituito dati dal documento.");
            
            const cleanJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
            extractedData = JSON.parse(cleanJson) as ExtractedDocumentData;
        }

        const productsWithPrice = extractedData.prodotti.map(p => ({...p, prezzoVendita: 0}));
        const signature = api.createDocumentSignature(extractedData.fornitore, extractedData.dataDocumento, productsWithPrice);
        
        const isDuplicate = await api.checkDocumentExists(signature);
        if (isDuplicate) {
            showAlert('Documento già caricato.', 'warning');
            setIsLoading(false);
            onClose();
            return;
        }

        await runCategorizationAndFinalize(productsWithPrice, signature);
    } catch (error: any) {
        console.error("Import error:", error);
        const errorMsg = error?.message || "Errore sconosciuto";
        showAlert(`Errore durante l'elaborazione del file: ${errorMsg}`, 'error');
        setIsLoading(false);
        onClose();
    }
  };

  const startCamera = async () => {
        setView('scanning');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            showAlert('Errore fotocamera.', 'error');
            onClose();
        }
    };

  const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    // MODIFICATO: Uso di import.meta.env per Vite
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
        showAlert("Chiave API mancante su Vercel.", "error"); return;
    }
    setIsLoading(true);
    setLoadingMessage('Analisi immagine...');
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    const base64Data = canvas.toDataURL('image/jpeg').split(',')[1];
    
    stopCamera();

    try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            throw new Error("Chiave API non trovata. Verifica di aver impostato VITE_GEMINI_API_KEY su Vercel e di aver fatto il Redeploy.");
        }

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash-latest', // Usiamo un modello più stabile per compatibilità
            contents: { parts: [ { inlineData: { mimeType: 'image/jpeg', data: base64Data } }, { text: 'Estrai fornitore, data (YYYY-MM-DD), e prodotti (nome, quantità, prezzo acquisto, codice). Restituisci JSON puro.' } ] },
            config: { responseMimeType: "application/json", responseSchema: {
                    type: Type.OBJECT, properties: {
                        fornitore: { type: Type.STRING }, dataDocumento: { type: Type.STRING },
                        prodotti: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { codiceProdotto: { type: Type.STRING }, prodotto: { type: Type.STRING }, quantita: { type: Type.NUMBER }, prezzoAcquisto: { type: Type.NUMBER } }, required: ['prodotto', 'quantita', 'prezzoAcquisto'] } }
                    }, required: ['fornitore', 'dataDocumento', 'prodotti']
            }}
        });
        
        if (!response.text) throw new Error("L'intelligenza artificiale non ha restituito dati dal documento.");
        const cleanJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const extractedData = JSON.parse(cleanJson) as ExtractedDocumentData;
        const productsWithPrice = extractedData.prodotti.map(p => ({...p, prezzoVendita: 0}));
        
        const signature = api.createDocumentSignature(extractedData.fornitore, extractedData.dataDocumento, productsWithPrice);
        
        const isDuplicate = await api.checkDocumentExists(signature);
        if (isDuplicate) {
            showAlert('Documento già caricato precedentemente.', 'warning');
            setIsLoading(false);
            onClose();
            return;
        }
        
        await runCategorizationAndFinalize(productsWithPrice, signature);
    } catch (error: any) {
        console.error("Capture error:", error);
        let errorMsg = error?.message || "Errore sconosciuto";
        
        // Messaggio più amichevole per errori comuni
        if (errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("403") || errorMsg.includes("401")) {
            errorMsg = "La chiave API non è valida o non ha i permessi necessari. Controlla la console di Google AI Studio.";
        }
        
        showAlert(`Errore analisi: ${errorMsg}`, 'error');
        setIsLoading(false);
        onClose();
    }
  };

  const renderContent = () => {
    if (isLoading) return <Spinner text={loadingMessage || 'Caricamento...'} />;
    if (!view) return <Spinner />;

    switch (view) {
        case 'upload_file': return (<div><label className="block w-full text-center p-8 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50"><span className="text-blue-600 font-semibold">Clicca per selezionare un file</span><input type="file" className="hidden" accept="image/*,application/pdf,.xml" onChange={handleFileChange} /></label></div>);
        case 'scanning': return ( <div className="flex flex-col" style={{ height: 'calc(80vh - 150px)' }}><p className="text-center text-sm text-gray-600 mb-2 flex-shrink-0">Inquadra il documento.</p><div className="flex-grow min-h-0 relative bg-gray-900 rounded-md overflow-hidden"><video ref={videoRef} autoPlay playsInline className="absolute top-0 left-0 w-full h-full object-contain"></video></div><canvas ref={canvasRef} className="hidden"></canvas><div className="flex justify-center mt-4 flex-shrink-0"><button onClick={handleCapture} className="w-full max-w-xs px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg">Cattura</button></div></div>);
        default: return <Spinner />;
    }
  };

  return (<Modal isOpen={isOpen} onClose={onClose} title={importType === 'camera' ? "Scansiona" : "Importa"} size="lg">{renderContent()}</Modal>);
};

export default ImportProductsModal;

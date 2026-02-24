
import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { Quote, Customer, ConstructionSite, ShopInfo, Product, Order } from '../types';

export const generateQuotePdf = (
    quote: Quote, 
    customer: Customer, 
    site: ConstructionSite | undefined, 
    shopInfo: ShopInfo
): string => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    const margin = 15;

    // --- Color Palette (RGB Tuple) ---
    const primaryBlue: [number, number, number] = [13, 71, 161];
    const primaryOrange: [number, number, number] = [245, 124, 0];
    const darkText: [number, number, number] = [31, 41, 55]; // gray-800
    
    // --- Header ---
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.text(shopInfo.companyName.toUpperCase(), margin, 20);
    
    doc.setTextColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
    

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text(shopInfo.description, margin, 27);
    doc.text(`Codice Fiscale: ${shopInfo.codiceFiscale}`, margin, 32);

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('PREVENTIVO', pageWidth - margin, 25, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Numero: ${quote.quoteNumber}`, pageWidth - margin, 32, { align: 'right' });
    doc.text(`Data: ${new Date(quote.date).toLocaleDateString('it-IT')}`, pageWidth - margin, 37, { align: 'right' });

    doc.setLineWidth(0.5);
    doc.line(margin, 45, pageWidth - margin, 45);

    // --- Customer Info ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE', margin, 55);
    
    doc.setFont('helvetica', 'normal');
    doc.text(customer.ragioneSociale, margin, 60);
    doc.text(customer.indirizzo, margin, 65);
    doc.text(`${customer.cap} ${customer.citta} (${customer.provincia})`, margin, 70);
    doc.text(`P.IVA / CF: ${customer.piva} / ${customer.codiceFiscale}`, margin, 75);

    if (site) {
        doc.setFont('helvetica', 'italic');
        doc.text(`Cantiere: ${site.nome}, ${site.indirizzo}`, margin, 82);
    }
    
    // --- Table ---
    const tableData: RowInput[] = quote.items.map(item => [
        { content: item.product.prodotto, styles: { fontStyle: 'bold' as const } },
        item.quantity.toString(),
        `€${item.product.prezzoVendita.toFixed(2)}`,
        `€${(item.product.prezzoVendita * item.quantity).toFixed(2)}`
    ]);

    autoTable(doc, {
        startY: 90,
        head: [['Descrizione', 'Coll.', 'Prezzo Unit', 'Totali']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: primaryBlue,
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: {
            fontSize: 9,
            cellPadding: 2.5,
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 30, halign: 'right' },
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    // --- Totals ---
    const totalsWidth = 80;
    const totalsX = pageWidth - margin - totalsWidth;
    const valueX = pageWidth - margin;
    const totalsStartY = finalY + 10;
    const rowHeight = 7;

    doc.setFillColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
    doc.rect(totalsX, totalsStartY, totalsWidth, quote.includeVat ? rowHeight * 3 : rowHeight * 2, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    
    doc.text('Totale Imponibile', totalsX + 5, totalsStartY + 5);
    doc.text(`€${quote.subtotal.toFixed(2)}`, valueX, totalsStartY + 5, { align: 'right' });
    
    if (quote.includeVat) {
      doc.text('Totale I.V.A.', totalsX + 5, totalsStartY + rowHeight + 5);
      doc.text(`€${quote.tax.toFixed(2)}`, valueX, totalsStartY + rowHeight + 5, { align: 'right' });
    }

    doc.setFont('helvetica', 'bold');
    const totalY = quote.includeVat ? totalsStartY + rowHeight * 2 + 5 : totalsStartY + rowHeight + 5;
    doc.text('Totale Preventivo', totalsX + 5, totalY);
    doc.text(`€${quote.total.toFixed(2)}`, valueX, totalY, { align: 'right' });

    // --- Notes ---
    if (quote.notes) {
        const notesY = Math.max(finalY, totalsStartY + rowHeight * 3) + 20;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        doc.text('Note:', margin, notesY);
        doc.setFont('helvetica', 'normal');
        doc.text(quote.notes, margin, notesY + 5, { maxWidth: pageWidth - (margin * 2) });
    }

    // --- Footer ---
    const footerY = pageHeight - 25;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Condizioni di pagamento: ${shopInfo.paymentConditions}`, margin, footerY);
    doc.text(`IBAN: ${shopInfo.iban} - ${shopInfo.companyName}`, margin, footerY + 4);
    doc.text('Grazie per la vostra fiducia.', margin, footerY + 10);
    doc.setLineWidth(0.2);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    return doc.output('datauristring');
};

export const generateChecklistPdf = (
    site: ConstructionSite,
    customer: Customer,
    shopInfo: ShopInfo,
    allProducts: Product[]
): string => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    const margin = 15;

    const productMap = new Map(allProducts.map(p => [p.id, p]));

    // --- Color Palette (RGB Tuple) ---
    const primaryBlue: [number, number, number] = [13, 71, 161];

    // --- Header ---
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.text(shopInfo.name, margin, 20);

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('LISTA MATERIALI CANTIERE', pageWidth - margin, 25, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${new Date().toLocaleDateString('it-IT')}`, pageWidth - margin, 32, { align: 'right' });

    doc.setLineWidth(0.5);
    doc.line(margin, 45, pageWidth - margin, 45);

    // --- Customer & Site Info ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE:', margin, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(customer.ragioneSociale, margin + 20, 55);
    
    doc.setFont('helvetica', 'bold');
    doc.text('CANTIERE:', margin, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(`${site.nome}`, margin + 22, 62);
    doc.text(`${site.indirizzo}`, margin, 68);

    // --- Table ---
    const tableData: RowInput[] = site.materialeDaAcquistare.map(item => {
        const product = productMap.get(item.productId);
        return [
            item.purchased ? '☑' : '☐',
            product?.codiceProdotto || 'N/D',
            product?.prodotto || 'Prodotto non trovato',
            item.quantity.toString(),
            '' 
        ];
    });
    
    if (tableData.length === 0) {
        tableData.push([
            { content: 'Nessun materiale da ordinare specificato.', colSpan: 5, styles: { halign: 'center', fontStyle: 'italic' as const } }
        ]);
    }

    autoTable(doc, {
        startY: 80,
        head: [['Stato', 'Codice', 'Prodotto', 'Qtà', 'Note']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: primaryBlue,
            textColor: 255,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 10,
            cellPadding: 3,
            font: 'helvetica',
        },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center', fontSize: 14 },
            1: { cellWidth: 30 },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 15, halign: 'center' },
            4: { cellWidth: 40 },
        }
    });

    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Lista d'ordine generata da ${shopInfo.name}`, margin, footerY);
    doc.setLineWidth(0.2);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    return doc.output('datauristring');
};

export const generateOrderPdf = (
    order: Order,
    customer: Customer,
    site: ConstructionSite | undefined,
    shopInfo: ShopInfo
): string => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    const margin = 15;

    const primaryBlue: [number, number, number] = [13, 71, 161];
    const darkText: [number, number, number] = [31, 41, 55];

    // --- Header ---
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.text(shopInfo.name, margin, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text(shopInfo.description, margin, 27);

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('ORDINE MATERIALI', pageWidth - margin, 25, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${new Date(order.date).toLocaleDateString('it-IT')}`, pageWidth - margin, 32, { align: 'right' });

    doc.setLineWidth(0.5);
    doc.line(margin, 45, pageWidth - margin, 45);

    // --- Destination Info ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DESTINAZIONE MERCE', margin, 55);
    
    doc.setFont('helvetica', 'normal');
    if (site) {
        doc.text(`Cantiere: ${site.nome}`, margin, 60);
        doc.text(site.indirizzo, margin, 65);
    } else {
        doc.text(`Cliente: ${customer.ragioneSociale}`, margin, 60);
        doc.text(customer.indirizzo, margin, 65);
    }
    
    // --- Table ---
    const tableData: RowInput[] = order.items.map(item => [
        item.product.codiceProdotto,
        item.product.prodotto,
        item.quantity.toString(),
        `€${item.product.prezzoAcquisto.toFixed(2)}`,
        `€${(item.product.prezzoAcquisto * item.quantity).toFixed(2)}`
    ]);

    autoTable(doc, {
        startY: 80,
        head: [['Codice', 'Descrizione', 'Qtà', 'Prezzo Unit.', 'Totale']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: primaryBlue,
            textColor: 255,
            fontStyle: 'bold',
        },
        styles: {
            fontSize: 9,
            cellPadding: 2.5,
        },
        columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 15, halign: 'center' },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 30, halign: 'right' },
        }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY;

    // --- Totals ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Totale Ordine:', pageWidth - margin - 50, finalY + 15);
    doc.text(`€${order.total.toFixed(2)}`, pageWidth - margin, finalY + 15, { align: 'right' });

    return doc.output('datauristring');
};

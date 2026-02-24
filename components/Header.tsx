
import React, { useState } from 'react';
import { ShopInfo } from '../types';
import Modal from './Modal';
import { EditIcon, FolderIcon } from './icons';

interface HeaderProps {
  shopInfo: ShopInfo;
  onSave: (newInfo: Omit<ShopInfo, 'name'>) => void;
}

const Header: React.FC<HeaderProps> = ({ shopInfo, onSave }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState(shopInfo.companyName);
  const [description, setDescription] = useState(shopInfo.description);
  const [codiceFiscale, setCodiceFiscale] = useState(shopInfo.codiceFiscale);
  const [iban, setIban] = useState(shopInfo.iban);
  const [paymentConditions, setPaymentConditions] = useState(shopInfo.paymentConditions);
  const [vatRate, setVatRate] = useState(shopInfo.vatRate);

  const handleOpen = () => {
    setCompanyName(shopInfo.companyName);
    setDescription(shopInfo.description);
    setCodiceFiscale(shopInfo.codiceFiscale);
    setIban(shopInfo.iban);
    setPaymentConditions(shopInfo.paymentConditions);
    setVatRate(shopInfo.vatRate);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    onSave({
      companyName,
      description,
      codiceFiscale,
      iban,
      paymentConditions,
      vatRate,
    });
    setIsModalOpen(false);
  };

  return (
    <>
      <header className="bg-primary-blue text-white p-4 shadow-md sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center">
            <FolderIcon className="h-8 w-8 mr-3 opacity-80" />
            <div>
                <h1 className="text-xl font-bold">{shopInfo.name}</h1>
                <p className="text-sm opacity-90">{shopInfo.description}</p>
            </div>
        </div>
        <button
          onClick={handleOpen}
          className="flex items-center bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-4 border border-white/30 rounded-lg shadow-sm transition-all duration-200"
        >
          <EditIcon className="h-4 w-4 mr-2" />
          Modifica
        </button>
      </header>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Modifica Intestazione">
        <div className="space-y-4">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Nome Azienda (per documenti)</label>
            <input
              type="text"
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="shopDescription" className="block text-sm font-medium text-gray-700">Indirizzo / Altre Info</label>
            <textarea
              id="shopDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="codiceFiscale" className="block text-sm font-medium text-gray-700">Codice Fiscale / P.IVA</label>
            <input
              type="text"
              id="codiceFiscale"
              value={codiceFiscale}
              onChange={(e) => setCodiceFiscale(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="iban" className="block text-sm font-medium text-gray-700">IBAN</label>
            <input
              type="text"
              id="iban"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="paymentConditions" className="block text-sm font-medium text-gray-700">Condizioni di Pagamento</label>
            <input
              type="text"
              id="paymentConditions"
              value={paymentConditions}
              onChange={(e) => setPaymentConditions(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="vatRate" className="block text-sm font-medium text-gray-700">Aliquota IVA (%)</label>
            <input
              type="number"
              id="vatRate"
              value={vatRate}
              onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              step="0.1"
              min="0"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary-blue text-white rounded-md hover:opacity-90 transition"
            >
              Salva
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Header;
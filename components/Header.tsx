
import React, { useState } from 'react';
import { ShopInfo } from '../types';
import { User } from 'firebase/auth';
import Modal from './Modal';
import { EditIcon, FolderIcon, LogOutIcon, DownloadIcon } from './icons';

interface HeaderProps {
  shopInfo: ShopInfo;
  onSave: (newInfo: Omit<ShopInfo, 'name'>) => void;
  onLogout: () => void;
  user: User;
  onInstall: () => void;
  isInstallable: boolean;
}

const Header: React.FC<HeaderProps> = ({ shopInfo, onSave, onLogout, user, onInstall, isInstallable }) => {
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
      <header className="bg-white p-4 shadow-md sticky top-0 z-40 flex justify-between items-center border-b border-gray-100">
        <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white mr-3">G</div>
            <div>
                <h1 className="text-xl font-bold text-gray-800">{shopInfo.name}</h1>
                <p className="text-xs text-gray-500 font-medium">{shopInfo.description}</p>
            </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="hidden lg:flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="h-6 w-6 rounded-full" />
            ) : (
              <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
                {user.displayName?.charAt(0) || user.email?.charAt(0)}
              </div>
            )}
            <span className="text-xs font-semibold truncate max-w-[100px] text-gray-700">{user.displayName || user.email}</span>
          </div>

          <button
            onClick={onInstall}
            className={`flex items-center ${isInstallable ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'} font-semibold py-2 px-3 border rounded-lg shadow-sm transition-all duration-200`}
            title={isInstallable ? "Installa App" : "Come installare"}
          >
            <DownloadIcon className={`h-4 w-4 ${isInstallable ? 'animate-bounce' : ''}`} />
            <span className="hidden md:inline ml-2 text-sm">{isInstallable ? 'Scarica App' : 'Installa'}</span>
          </button>
          
          <button
            onClick={handleOpen}
            className="flex items-center bg-white text-gray-700 font-semibold py-2 px-4 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200"
          >
            <EditIcon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Modifica</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center bg-red-50 text-red-600 font-semibold py-2 px-3 border border-red-200 rounded-lg shadow-sm hover:bg-red-100 transition-all duration-200"
            title="Esci"
          >
            <LogOutIcon className="h-4 w-4" />
          </button>
        </div>
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-semibold"
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
import React, { useState } from 'react';
import { CameraIcon, UploadIcon } from './icons';
import ImportProductsModal from './ImportProductsModal';
import { Product, Category } from '../types';

interface ProductImportControlsProps {
    categories: Category[];
    showAlert: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    onImportSuccess: (stagedProducts: Omit<Product, 'id'>[], signature: string) => void;
}

const ProductImportControls: React.FC<ProductImportControlsProps> = ({ categories, showAlert, onImportSuccess }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [importType, setImportType] = useState<'file' | 'camera' | null>(null);

    const openModal = (type: 'file' | 'camera') => {
        setImportType(type);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setImportType(null);
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Aggiungi Prodotti</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                        onClick={() => openModal('file')}
                        className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 transition"
                    >
                        <UploadIcon className="w-5 h-5 mr-2" />
                        Importa da File
                    </button>
                    <button
                        onClick={() => openModal('camera')}
                        className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-center text-white bg-teal-600 rounded-lg hover:bg-teal-700 focus:ring-4 focus:outline-none focus:ring-teal-300 transition"
                    >
                        <CameraIcon className="w-5 h-5 mr-2" />
                        Scansiona con Fotocamera
                    </button>
                </div>
            </div>
            <ImportProductsModal
                categories={categories}
                isOpen={isModalOpen}
                onClose={closeModal}
                importType={importType}
                onImportSuccess={onImportSuccess}
                showAlert={showAlert}
            />
        </>
    );
};

export default ProductImportControls;
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Edit2, AlertTriangle, RefreshCw, 
  Trash, Save, ArrowDownLeft, X, Filter, Sparkles 
} from 'lucide-react';
import { Product, InventoryLog, SystemSettings, PurchaseOrder } from '../types';

interface InventoryManagerProps {
  products: Product[];
  logs: InventoryLog[];
  settings: SystemSettings;
  currency: string;
  onAddProduct: (newProduct: Product) => Promise<void>;
  onUpdateProduct: (updatedProduct: Product) => Promise<void>;
  onLogAdjustment: (log: InventoryLog) => Promise<void>;
  isSyncing: boolean;
}

export default function InventoryManager({
  products,
  logs,
  settings,
  currency = 'USD',
  onAddProduct,
  onUpdateProduct,
  onLogAdjustment,
  isSyncing
}: InventoryManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('All'); // All, Low Stock, Active, Inactive

  // Editor states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Single adjustment modal state
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState('1');
  const [adjustType, setAdjustType] = useState<'Restock' | 'Adjustment' | 'Damage' | 'Return'>('Restock');
  const [adjustReason, setAdjustReason] = useState('');

  // Form states for new/edited product
  const [formData, setFormData] = useState<Partial<Product>>({
    sku: '',
    name: '',
    category: '',
    variant: '',
    cost: 0,
    retailPrice: 0,
    quantity: 0,
    reorderLevel: 5,
    vendor: '',
    barcode: '',
    active: true,
    imageUrl: ''
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(val);
  };

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return ['All', ...Array.from(cats)];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.vendor.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
      
      let matchStock = true;
      if (stockFilter === 'Low Stock') {
        matchStock = p.quantity <= p.reorderLevel;
      } else if (stockFilter === 'Active') {
        matchStock = p.active;
      } else if (stockFilter === 'Inactive') {
        matchStock = !p.active;
      }

      return matchSearch && matchCat && matchStock;
    });
  }, [products, searchTerm, categoryFilter, stockFilter]);

  // Handle Save (Add or Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku || !formData.name) {
      alert('SKU and Name are required fields.');
      return;
    }

    if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        ...formData
      } as Product;
      
      try {
        await onUpdateProduct(updated);
        setEditingProduct(null);
        setShowAddForm(false);
      } catch (err) {
        alert('Failed to update product in sheet.');
      }
    } else {
      const newId = (products.length + 1).toString();
      const newProd: Product = {
        ...formData,
        id: newId,
        cost: Number(formData.cost) || 0,
        retailPrice: Number(formData.retailPrice) || 0,
        quantity: Number(formData.quantity) || 0,
        reorderLevel: Number(formData.reorderLevel) || 5,
      } as Product;

      try {
        await onAddProduct(newProd);
        setShowAddForm(false);
        // Reset
        setFormData({
          sku: '',
          name: '',
          category: settings.productCategories[0] || '',
          variant: '',
          cost: 0,
          retailPrice: 0,
          quantity: 0,
          reorderLevel: 5,
          vendor: '',
          barcode: '',
          active: true,
          imageUrl: ''
        });
      } catch (err) {
        alert('Failed to save product to Google Sheets.');
      }
    }
  };

  // Open Edit form
  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormData(prod);
    setShowAddForm(true);
  };

  // Log manual quantity adjustments (restocks, damages, adjustments, returns)
  const handleLogAdjustmentSubmit = async () => {
    if (!adjustingProduct) return;
    const delta = Number(adjustQty) || 0;
    if (delta <= 0) {
      alert('Please provide a quantity greater than 0.');
      return;
    }

    // Determine quantity change
    let change = delta;
    if (adjustType === 'Damage') {
      change = -delta;
    } else if (adjustType === 'Adjustment' && delta > 0) {
      // Prompt user whether they want to add or deduct
      const deduct = window.confirm('Deduct from inventory instead of adding?');
      if (deduct) change = -delta;
    }

    const beforeQty = adjustingProduct.quantity;
    const afterQty = beforeQty + change;

    const log: InventoryLog = {
      id: `LOG-${Date.now().toString().slice(-4)}-ADJ`,
      date: new Date().toISOString(),
      productId: adjustingProduct.id,
      productName: adjustingProduct.name,
      type: adjustType as any,
      qtyChange: change,
      beforeQty,
      afterQty,
      reason: adjustReason || `Manual ${adjustType}`,
      user: settings.email || 'Admin'
    };

    try {
      await onLogAdjustment(log);
      setAdjustingProduct(null);
      setAdjustQty('1');
      setAdjustReason('');
    } catch (err) {
      alert('Error syncing adjustment transaction with sheets.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search & Action Bars */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Search controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:max-w-2xl bg-white p-3 rounded-2xl border border-gray-100 shadow-xs">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by Name, SKU or Vendor..."
              className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-700"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Dropdown */}
          <select
            className="w-full sm:w-48 text-xs py-2 px-3 border border-gray-200 rounded-xl bg-white text-gray-700"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            {categories.filter(c => c !== 'All').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Stock Level Dropdown */}
          <select
            className="w-full sm:w-44 text-xs py-2 px-3 border border-gray-200 rounded-xl bg-white text-gray-700"
            value={stockFilter}
            onChange={e => setStockFilter(e.target.value)}
          >
            <option value="All">All Stock Levels</option>
            <option value="Low Stock">⚠️ Low Stock / Reorders</option>
            <option value="Active">🟢 Active Listings</option>
            <option value="Inactive">🔴 Inactive Items</option>
          </select>
        </div>

        {/* Create new product button */}
        <button
          onClick={() => {
            setEditingProduct(null);
            setFormData({
              sku: '',
              name: '',
              category: settings.productCategories[0] || 'Apparel',
              variant: '',
              cost: 0,
              retailPrice: 0,
              quantity: 0,
              reorderLevel: 5,
              vendor: 'MG Creations',
              barcode: '',
              active: true,
              imageUrl: ''
            });
            setShowAddForm(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center space-x-2 shrink-0 transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Craft Product</span>
        </button>

      </div>

      {/* Main UI splitting Catalogue Table and Logs Audit */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Products Catalogue Table (8 columns) */}
        <div className="xl:col-span-8 bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h4 className="text-base font-bold text-gray-800">Master Product Catalog</h4>
            <span className="text-xs text-gray-400 font-medium">Viewing {filteredProducts.length} items</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="py-2">Product Name</th>
                  <th className="py-2">SKU / Code</th>
                  <th className="py-2">Category</th>
                  <th className="py-2 text-right">Cost</th>
                  <th className="py-2 text-right">Retail</th>
                  <th className="py-2 text-center">Stock</th>
                  <th className="py-2 text-center">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium">
                {filteredProducts.map(prod => {
                  const isLow = prod.quantity <= prod.reorderLevel;
                  return (
                    <tr key={prod.id} className="hover:bg-gray-50/50">
                      <td className="py-3">
                        <div className="flex items-center space-x-2.5">
                          {prod.imageUrl ? (
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-lg object-cover bg-gray-50"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center font-bold">
                              {prod.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-gray-800 leading-tight">{prod.name}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5 font-semibold">Var: {prod.variant || 'Standard'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 font-mono text-gray-500">{prod.sku}</td>
                      <td className="py-3">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-semibold">{prod.category}</span>
                      </td>
                      <td className="py-3 text-right text-gray-500 font-mono">{formatCurrency(prod.cost)}</td>
                      <td className="py-3 text-right text-gray-800 font-bold font-mono">{formatCurrency(prod.retailPrice)}</td>
                      <td className="py-3 text-center">
                        <div className="inline-block">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            prod.quantity <= 0 
                              ? 'bg-red-50 text-red-500' 
                              : isLow 
                                ? 'bg-amber-50 text-amber-600' 
                                : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {prod.quantity}
                          </span>
                          {isLow && prod.active && (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline ml-1 align-middle" title="Reorder needed!" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`text-[10px] font-bold ${prod.active ? 'text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md' : 'text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md'}`}>
                          {prod.active ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="py-3 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(prod)}
                          className="p-1 hover:bg-gray-100 text-gray-500 rounded-md inline-block"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setAdjustingProduct(prod);
                            setAdjustQty('1');
                            setAdjustReason('');
                          }}
                          className="p-1 hover:bg-indigo-50 text-indigo-600 rounded-md inline-block font-semibold"
                          title="Log Stock Adjustment/Damage/Restock"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: Audits / Inventory logs (4 columns) */}
        <div className="xl:col-span-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h4 className="text-base font-bold text-gray-800">Inventory Logs (Audit Trail)</h4>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Ledger</span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1 divide-y divide-gray-50">
            {logs.slice().reverse().map((log, idx) => {
              const sign = log.qtyChange > 0 ? '+' : '';
              const logProd = products.find(p => p.id === log.productId);
              return (
                <div key={idx} className="pt-3 first:pt-0 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-gray-700 truncate max-w-[160px]">
                      {logProd ? logProd.name : `Product ID: ${log.productId}`}
                    </span>
                    <span className={`font-mono font-extrabold px-1.5 py-0.5 rounded-md text-[10px] ${
                      log.type === 'Restock' || log.type === 'Return'
                        ? 'bg-emerald-50 text-emerald-600'
                        : log.type === 'Damage'
                          ? 'bg-red-50 text-red-500'
                          : 'bg-indigo-50 text-indigo-600'
                    }`}>
                      {sign}{log.qtyChange} ({log.type})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>Date: {log.date?.substring(0, 16).replace('T', ' ')}</span>
                    <span>Stock: {log.beforeQty} ➔ {log.afterQty}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 italic font-medium leading-tight">Reason: {log.reason}</p>
                </div>
              );
            })}
            {logs.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-xs">No transactions logged in the auditor yet.</div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL: ADD / EDIT PRODUCT FORM */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="text-lg font-bold text-gray-800">
                {editingProduct ? `Edit "${editingProduct.name}"` : 'Add New Craft Item'}
              </h4>
              <button 
                onClick={() => setShowAddForm(false)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-gray-500">Internal SKU / Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TSHIRT-BLK-L"
                    className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3"
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-500">Barcode / UPC</label>
                  <input
                    type="text"
                    placeholder="Optional barcode number"
                    className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3"
                    value={formData.barcode}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-500">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rainbow Sparkle Coffee Mug"
                  className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-gray-500">Category</label>
                  <select
                    className="w-full text-xs py-2 border border-gray-200 rounded-xl bg-white px-2"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    {settings.productCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-500">Variant (Color, Size, Size 11oz)</label>
                  <input
                    type="text"
                    placeholder="e.g. Rainbow Style"
                    className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3"
                    value={formData.variant}
                    onChange={e => setFormData({ ...formData, variant: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-gray-500">Cost Cost (Raw materials / blanks) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3"
                    value={formData.cost}
                    onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-500">Retail price *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3"
                    value={formData.retailPrice}
                    onChange={e => setFormData({ ...formData, retailPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-500">Initial Stock</label>
                  <input
                    type="number"
                    disabled={!!editingProduct} // Disable editing direct quantity on update to protect audit integrity
                    placeholder="e.g. 50"
                    className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 disabled:opacity-50"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-500">Low Reorder level</label>
                  <input
                    type="number"
                    className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3"
                    value={formData.reorderLevel}
                    onChange={e => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 5 })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-500">Vendor / Maker</label>
                  <input
                    type="text"
                    placeholder="e.g. MG Creations"
                    className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3"
                    value={formData.vendor}
                    onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-500">Thumbnail Image URL</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/... or leave blank"
                  className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3"
                  value={formData.imageUrl}
                  onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <input
                  type="checkbox"
                  id="activeCheck"
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  checked={formData.active}
                  onChange={e => setFormData({ ...formData, active: e.target.checked })}
                />
                <label htmlFor="activeCheck" className="font-bold text-gray-700">Active Listing (Available in checkout catalogue)</label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-gray-500 font-bold px-4 py-2 hover:bg-gray-50 rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSyncing}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-2 rounded-xl transition-all"
                >
                  {isSyncing ? 'Saving in sheets...' : 'Save Product Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SINGLE ADJUSTMENT LOGGER */}
      {adjustingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="text-base font-bold text-gray-800">Log Manual Stock Event</h4>
              <button 
                onClick={() => setAdjustingProduct(null)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-medium text-gray-500">
              <p>Product: <strong className="text-gray-800">{adjustingProduct.name}</strong></p>
              <p>Current Qty: <strong className="text-gray-800">{adjustingProduct.quantity}</strong></p>

              <div className="space-y-1">
                <label className="font-bold text-gray-500">Adjustment Type</label>
                <select
                  className="w-full text-xs py-2 border border-gray-200 rounded-xl bg-white text-gray-700 px-2"
                  value={adjustType}
                  onChange={e => setAdjustType(e.target.value as any)}
                >
                  <option value="Restock">Restock (+ Supply replenishment)</option>
                  <option value="Adjustment">Adjustment (Audit audit variance)</option>
                  <option value="Damage">Damage (- Raw material loss/broken items)</option>
                  <option value="Return">Return (+ Returned client stock)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-500">Operation Quantity</label>
                <input
                  type="number"
                  min="1"
                  className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-700"
                  value={adjustQty}
                  onChange={e => setAdjustQty(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-500">Log Reason (Required for audit)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Restocked blank ceramic mugs"
                  className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-700"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="text-xs text-gray-400 font-bold px-3 py-2 hover:bg-gray-50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLogAdjustmentSubmit}
                  disabled={isSyncing}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Stock Event'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

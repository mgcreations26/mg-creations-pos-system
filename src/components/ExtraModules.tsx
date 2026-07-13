/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Undo2, Gift, Clipboard, Calendar, ClipboardCheck, 
  Layers, Plus, Trash2, CheckCircle, Clock 
} from 'lucide-react';
import { 
  ReturnRecord, GiftCard, ConsignmentItem, CraftEvent, 
  CustomOrder, RawMaterial, Product, Customer 
} from '../types';

interface ExtraModulesProps {
  returns: ReturnRecord[];
  giftCards: GiftCard[];
  consignment: ConsignmentItem[];
  events: CraftEvent[];
  customOrders: CustomOrder[];
  materials: RawMaterial[];
  products: Product[];
  customers: Customer[];
  currency: string;
  onAddRecord: (sheetName: string, record: any) => Promise<void>;
  isSyncing: boolean;
}

type ExtraTab = 'returns' | 'giftcards' | 'consignment' | 'events' | 'customorders' | 'materials';

export default function ExtraModules({
  returns,
  giftCards,
  consignment,
  events,
  customOrders,
  materials,
  products,
  customers,
  currency = 'USD',
  onAddRecord,
  isSyncing
}: ExtraModulesProps) {
  const [activeTab, setActiveTab] = useState<ExtraTab>('customorders');
  const [showForm, setShowForm] = useState(false);

  // General Form States
  const [formFields, setFormFields] = useState<any>({});

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(val);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();

    let sheetName = '';
    let newRecord: any = {};

    if (activeTab === 'returns') {
      sheetName = 'RETURNS';
      newRecord = {
        id: `RET-${Date.now().toString().slice(-4)}`,
        invoiceId: formFields.invoiceId || '',
        date: new Date().toISOString().substring(0, 10),
        reason: formFields.reason || '',
        refundAmount: parseFloat(formFields.refundAmount) || 0
      };
    } else if (activeTab === 'giftcards') {
      sheetName = 'GIFT_CARDS';
      newRecord = {
        id: `GC-${Date.now().toString().slice(-4)}`,
        code: formFields.code || `GC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        customerId: formFields.customerId || 'WALKIN',
        originalBalance: parseFloat(formFields.originalBalance) || 50,
        currentBalance: parseFloat(formFields.originalBalance) || 50,
        active: true
      };
    } else if (activeTab === 'consignment') {
      sheetName = 'CONSIGNMENT';
      newRecord = {
        id: `CON-${Date.now().toString().slice(-4)}`,
        location: formFields.location || '',
        productId: formFields.productId || '',
        quantity: parseInt(formFields.quantity) || 0,
        payoutRate: parseFloat(formFields.payoutRate) || 0,
        soldQuantity: 0,
        status: 'Active'
      };
    } else if (activeTab === 'events') {
      sheetName = 'EVENTS';
      newRecord = {
        id: `EVT-${Date.now().toString().slice(-4)}`,
        name: formFields.name || '',
        date: formFields.date || new Date().toISOString().substring(0, 10),
        boothFee: parseFloat(formFields.boothFee) || 0,
        sales: parseFloat(formFields.sales) || 0,
        profit: (parseFloat(formFields.sales) || 0) - (parseFloat(formFields.boothFee) || 0)
      };
    } else if (activeTab === 'customorders') {
      sheetName = 'CUSTOM_ORDERS';
      newRecord = {
        id: `ORD-${Date.now().toString().slice(-4)}`,
        customerId: formFields.customerId || '',
        description: formFields.description || '',
        deposit: parseFloat(formFields.deposit) || 0,
        totalPrice: parseFloat(formFields.totalPrice) || 0,
        dueDate: formFields.dueDate || '',
        status: 'Pending'
      };
    } else if (activeTab === 'materials') {
      sheetName = 'MATERIALS';
      newRecord = {
        id: `MAT-${Date.now().toString().slice(-4)}`,
        name: formFields.name || '',
        category: formFields.category || 'Supplies',
        quantity: parseFloat(formFields.quantity) || 0,
        unit: formFields.unit || 'units',
        cost: parseFloat(formFields.cost) || 0,
        supplier: formFields.supplier || ''
      };
    }

    try {
      await onAddRecord(sheetName, newRecord);
      setShowForm(false);
      setFormFields({});
    } catch (err) {
      alert('Failed to save operation record to Sheet. Confirm permissions.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Selectors */}
      <div className="flex items-center space-x-2 border-b border-gray-100 overflow-x-auto pb-1.5 scrollbar-thin">
        {[
          { id: 'customorders', label: '🎨 Custom Orders', icon: ClipboardCheck },
          { id: 'materials', label: '🧵 Raw Supplies / Materials', icon: Layers },
          { id: 'events', label: '🎪 Craft Fair Events', icon: Calendar },
          { id: 'consignment', label: '🏬 Consignment Sales', icon: Clipboard },
          { id: 'returns', label: '↩️ Returns System', icon: Undo2 },
          { id: 'giftcards', label: '🎫 Gift Cards balances', icon: Gift },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as ExtraTab);
                setShowForm(false);
              }}
              className={`flex items-center space-x-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shrink-0 ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Grid control bar */}
      <div className="flex items-center justify-between">
        <h4 className="text-base font-extrabold text-gray-800 capitalize">{activeTab.replace('_', ' ')} System</h4>
        <button
          onClick={() => {
            setFormFields({});
            setShowForm(true);
          }}
          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center space-x-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Log</span>
        </button>
      </div>

      {/* Main Tab Render Grid */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
        
        {/* Custom Orders list */}
        {activeTab === 'customorders' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase">
                  <th className="py-2.5">Order ID</th>
                  <th className="py-2.5">Customer Name</th>
                  <th className="py-2.5">Description</th>
                  <th className="py-2.5 text-right">Deposit</th>
                  <th className="py-2.5 text-right">Total Price</th>
                  <th className="py-2.5">Due Date</th>
                  <th className="py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                {customOrders.map(ord => {
                  const custObj = customers.find(c => c.id === ord.customerId);
                  const custName = custObj ? `${custObj.firstName} ${custObj.lastName}` : `ID: ${ord.customerId}`;
                  return (
                    <tr key={ord.id} className="hover:bg-gray-50/50">
                      <td className="py-3 font-mono text-gray-400">{ord.id}</td>
                      <td className="py-3 font-bold text-gray-800">{custName}</td>
                      <td className="py-3 italic max-w-xs truncate">{ord.description}</td>
                      <td className="py-3 text-right font-mono text-emerald-600 font-bold">{formatCurrency(ord.deposit)}</td>
                      <td className="py-3 text-right font-mono text-gray-800 font-extrabold">{formatCurrency(ord.totalPrice)}</td>
                      <td className="py-3 text-amber-600 font-bold">{ord.dueDate}</td>
                      <td className="py-3 text-center">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          ord.status === 'Completed' || ord.status === 'Delivered'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {customOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">No active custom orders logged.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Raw Materials/Supplies list */}
        {activeTab === 'materials' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase">
                  <th className="py-2.5">Material ID</th>
                  <th className="py-2.5">Supplies Name</th>
                  <th className="py-2.5">Category</th>
                  <th className="py-2.5 text-center">Stock Level</th>
                  <th className="py-2.5 text-right">Unit Cost</th>
                  <th className="py-2.5">Supplier Vendor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                {materials.map(mat => (
                  <tr key={mat.id} className="hover:bg-gray-50/50">
                    <td className="py-3 font-mono text-gray-400">{mat.id}</td>
                    <td className="py-3 font-bold text-gray-800">{mat.name}</td>
                    <td className="py-3">{mat.category}</td>
                    <td className="py-3 text-center">
                      <span className="bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-md font-mono">
                        {mat.quantity} {mat.unit}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-gray-800 font-bold">{formatCurrency(mat.cost)}</td>
                    <td className="py-3 text-gray-500">{mat.supplier || 'Generic'}</td>
                  </tr>
                ))}
                {materials.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">No raw supplies registered yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Craft Fair Events list */}
        {activeTab === 'events' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase">
                  <th className="py-2.5">Event ID</th>
                  <th className="py-2.5">Fair Name</th>
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5 text-right">Booth Fee</th>
                  <th className="py-2.5 text-right">Total Sales</th>
                  <th className="py-2.5 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                {events.map(evt => {
                  const profit = evt.sales - evt.boothFee;
                  return (
                    <tr key={evt.id} className="hover:bg-gray-50/50">
                      <td className="py-3 font-mono text-gray-400">{evt.id}</td>
                      <td className="py-3 font-bold text-gray-800">{evt.name}</td>
                      <td className="py-3 text-gray-500">{evt.date}</td>
                      <td className="py-3 text-right font-mono text-gray-500">{formatCurrency(evt.boothFee)}</td>
                      <td className="py-3 text-right font-mono text-gray-800 font-bold">{formatCurrency(evt.sales)}</td>
                      <td className={`py-3 text-right font-mono font-extrabold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {formatCurrency(profit)}
                      </td>
                    </tr>
                  );
                })}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">No craft fairs logged.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Consignment tracking list */}
        {activeTab === 'consignment' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase">
                  <th className="py-2.5">Consignment ID</th>
                  <th className="py-2.5">Boutique Location</th>
                  <th className="py-2.5">Product</th>
                  <th className="py-2.5 text-center">Placed Qty</th>
                  <th className="py-2.5 text-right">Payout Rate</th>
                  <th className="py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                {consignment.map(con => {
                  const pObj = products.find(p => p.id === con.productId);
                  const pName = pObj ? pObj.name : `Product ID: ${con.productId}`;
                  return (
                    <tr key={con.id} className="hover:bg-gray-50/50">
                      <td className="py-3 font-mono text-gray-400">{con.id}</td>
                      <td className="py-3 font-bold text-gray-800">{con.location}</td>
                      <td className="py-3 text-gray-500 truncate max-w-xs">{pName}</td>
                      <td className="py-3 text-center text-gray-700 font-bold">{con.quantity}</td>
                      <td className="py-3 text-right font-mono text-indigo-600 font-bold">{formatCurrency(con.payoutRate)}</td>
                      <td className="py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          con.status === 'Active' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {con.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {consignment.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">No consignment boutique accounts logged.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Returns system logs */}
        {activeTab === 'returns' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase">
                  <th className="py-2.5">Return ID</th>
                  <th className="py-2.5">Invoice ID</th>
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Return Reason</th>
                  <th className="py-2.5 text-right">Refund Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                {returns.map(ret => (
                  <tr key={ret.id} className="hover:bg-gray-50/50">
                    <td className="py-3 font-mono text-gray-400">{ret.id}</td>
                    <td className="py-3 font-mono text-gray-800">{ret.invoiceId}</td>
                    <td className="py-3 text-gray-500">{ret.date}</td>
                    <td className="py-3 text-gray-700 font-bold italic">{ret.reason}</td>
                    <td className="py-3 text-right font-mono text-red-600 font-bold">-{formatCurrency(ret.refundAmount)}</td>
                  </tr>
                ))}
                {returns.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">No returns logged.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Gift Cards lists */}
        {activeTab === 'giftcards' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase">
                  <th className="py-2.5">Card ID</th>
                  <th className="py-2.5">Gift Card Code</th>
                  <th className="py-2.5">Associated Customer</th>
                  <th className="py-2.5 text-right">Original Bal</th>
                  <th className="py-2.5 text-right">Running Balance</th>
                  <th className="py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                {giftCards.map(card => {
                  const custObj = customers.find(c => c.id === card.customerId);
                  const custName = custObj ? `${custObj.firstName} ${custObj.lastName}` : 'Walk-in';
                  return (
                    <tr key={card.id} className="hover:bg-gray-50/50">
                      <td className="py-3 font-mono text-gray-400">{card.id}</td>
                      <td className="py-3 font-mono font-bold text-gray-800">{card.code}</td>
                      <td className="py-3 text-gray-500">{custName}</td>
                      <td className="py-3 text-right font-mono text-gray-400">{formatCurrency(card.originalBalance)}</td>
                      <td className="py-3 text-right font-mono text-emerald-600 font-extrabold">{formatCurrency(card.currentBalance)}</td>
                      <td className="py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          card.active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {card.active ? 'Active' : 'Empty'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {giftCards.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">No active gift cards logged.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* POPUP: ADD EVENT OR CUSTOM LEDGER ROW */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4">
            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Log {activeTab} Details</h4>
            
            <form onSubmit={handleSaveRecord} className="space-y-4 text-xs font-medium text-gray-500">
              
              {/* Form fields for Returns */}
              {activeTab === 'returns' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold">Original Invoice ID *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. INV-123456"
                      className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                      value={formFields.invoiceId || ''}
                      onChange={e => setFormFields({ ...formFields, invoiceId: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold">Refund Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                      value={formFields.refundAmount || ''}
                      onChange={e => setFormFields({ ...formFields, refundAmount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold">Reason for return</label>
                    <input
                      type="text"
                      placeholder="e.g. Broken mug glaze, incorrect shirt size"
                      className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                      value={formFields.reason || ''}
                      onChange={e => setFormFields({ ...formFields, reason: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Form fields for Gift cards */}
              {activeTab === 'giftcards' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold">Gift Card Custom Code (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. MG-SPRING25"
                      className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                      value={formFields.code || ''}
                      onChange={e => setFormFields({ ...formFields, code: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold">Assign Customer ID (Optional)</label>
                    <select
                      className="w-full text-xs py-2 border border-gray-200 rounded-xl bg-white text-gray-800"
                      value={formFields.customerId || ''}
                      onChange={e => setFormFields({ ...formFields, customerId: e.target.value })}
                    >
                      <option value="WALKIN">-- Anonymous Walk-In --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold">Original Value Balance *</label>
                    <input
                      type="number"
                      required
                      placeholder="50.00"
                      className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                      value={formFields.originalBalance || ''}
                      onChange={e => setFormFields({ ...formFields, originalBalance: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Form fields for Consignment */}
              {activeTab === 'consignment' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold">Boutique Location / Store Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Downtown Artsy Boutique"
                      className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                      value={formFields.location || ''}
                      onChange={e => setFormFields({ ...formFields, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold">Bespoke Product *</label>
                    <select
                      className="w-full text-xs py-2 border border-gray-200 rounded-xl bg-white text-gray-800"
                      value={formFields.productId || ''}
                      onChange={e => setFormFields({ ...formFields, productId: e.target.value })}
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.variant})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold">Placed Qty *</label>
                      <input
                        type="number"
                        required
                        className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                        value={formFields.quantity || ''}
                        onChange={e => setFormFields({ ...formFields, quantity: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold">Payout / Commission Rate *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                        value={formFields.payoutRate || ''}
                        onChange={e => setFormFields({ ...formFields, payoutRate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Form fields for Craft Events */}
              {activeTab === 'events' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold">Craft Fair Event Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pride Summer Craft Fair 2026"
                      className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                      value={formFields.name || ''}
                      onChange={e => setFormFields({ ...formFields, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold">Event Date</label>
                    <input
                      type="date"
                      className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                      value={formFields.date || ''}
                      onChange={e => setFormFields({ ...formFields, date: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold">Booth Fee *</label>
                      <input
                        type="number"
                        required
                        className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                        value={formFields.boothFee || ''}
                        onChange={e => setFormFields({ ...formFields, boothFee: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold">Total Sales Recorded *</label>
                      <input
                        type="number"
                        required
                        className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                        value={formFields.sales || ''}
                        onChange={e => setFormFields({ ...formFields, sales: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Form fields for Custom commission orders */}
              {activeTab === 'customorders' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold">Assign Customer Name *</label>
                    <select
                      required
                      className="w-full text-xs py-2 border border-gray-200 rounded-xl bg-white text-gray-800"
                      value={formFields.customerId || ''}
                      onChange={e => setFormFields({ ...formFields, customerId: e.target.value })}
                    >
                      <option value="">-- Choose Customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold">Commissions Description *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 10 custom vinyl stickers + glitters mugs"
                      className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                      value={formFields.description || ''}
                      onChange={e => setFormFields({ ...formFields, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold">Down Deposit Paid *</label>
                      <input
                        type="number"
                        required
                        className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                        value={formFields.deposit || ''}
                        onChange={e => setFormFields({ ...formFields, deposit: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold">Total Quoted Price *</label>
                      <input
                        type="number"
                        required
                        className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                        value={formFields.totalPrice || ''}
                        onChange={e => setFormFields({ ...formFields, totalPrice: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold">Due Deadline Date *</label>
                    <input
                      type="date"
                      required
                      className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                      value={formFields.dueDate || ''}
                      onChange={e => setFormFields({ ...formFields, dueDate: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Form fields for Manufacturing Raw Materials */}
              {activeTab === 'materials' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold">Supply Material Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Blank White Tees, Vinyl roll, resin epox"
                      className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                      value={formFields.name || ''}
                      onChange={e => setFormFields({ ...formFields, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold">Quantity Level *</label>
                      <input
                        type="number"
                        required
                        placeholder="100"
                        className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                        value={formFields.quantity || ''}
                        onChange={e => setFormFields({ ...formFields, quantity: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold">Inventory Unit (oz, yards, blanks) *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. blanks, oz, rolls"
                        className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                        value={formFields.unit || ''}
                        onChange={e => setFormFields({ ...formFields, unit: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold">Unit Purchase Cost *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="1.50"
                        className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                        value={formFields.cost || ''}
                        onChange={e => setFormFields({ ...formFields, cost: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold">Supplier Maker</label>
                      <input
                        type="text"
                        placeholder="e.g. Amazon Supplies"
                        className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                        value={formFields.supplier || ''}
                        onChange={e => setFormFields({ ...formFields, supplier: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-xs text-gray-400 font-bold px-3 py-2 hover:bg-gray-50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl"
                >
                  {isSyncing ? 'Writing Sheet...' : 'Log Operation'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

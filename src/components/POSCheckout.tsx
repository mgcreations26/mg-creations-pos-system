/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, Minus, Trash2, UserPlus, Receipt, 
  CreditCard, Tag, ShoppingBag, CheckCircle, ArrowRight, Printer 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Customer, SystemSettings, SalesInvoice, SalesItem, InventoryLog } from '../types';

interface POSCheckoutProps {
  products: Product[];
  customers: Customer[];
  settings: SystemSettings;
  currency: string;
  onCompleteSale: (
    invoice: SalesInvoice, 
    items: SalesItem[], 
    logs: InventoryLog[],
    updates: { id: string; newQty: number }[]
  ) => Promise<void>;
  onAddCustomer: (newCustomer: Customer) => void;
  isSyncing: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // custom line-item discount
}

export default function POSCheckout({
  products,
  customers,
  settings,
  currency = 'USD',
  onCompleteSale,
  onAddCustomer,
  isSyncing
}: POSCheckoutProps) {
  // POS States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [discountInput, setDiscountInput] = useState('0'); // Overall order discount
  const [discountType, setDiscountType] = useState<'value' | 'percent'>('percent');
  const [paymentType, setPaymentType] = useState('Cash');
  const [salesChannel, setSalesChannel] = useState('Craft Fair');
  const [notes, setNotes] = useState('');

  // Quick customer modal states
  const [showCustModal, setShowCustModal] = useState(false);
  const [newCustFirst, setNewCustFirst] = useState('');
  const [newCustLast, setNewCustLast] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Post-sale success state
  const [completedInvoice, setCompletedInvoice] = useState<SalesInvoice | null>(null);
  const [completedItems, setCompletedItems] = useState<{ name: string; sku: string; variant: string; qty: number; price: number; total: number }[]>([]);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(val);
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.active) return false;
      const matchSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchTerm, selectedCategory]);

  // Unique categories list
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return ['All', ...Array.from(cats)];
  }, [products]);

  // Add product to cart
  const handleAddToCart = (product: Product) => {
    if (product.quantity <= 0) {
      alert(`Warning: "${product.name}" is out of stock! You can still add it, but inventory will drop below 0.`);
    }

    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === product.id);
      if (idx > -1) {
        return prev.map((item, i) => i === idx ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  };

  // Adjust item quantity in cart
  const handleUpdateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  // Remove item from cart
  const handleRemoveItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // Cart Calculations
  const cartCalculations = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => {
      const price = item.product.retailPrice;
      const lineSub = price * item.quantity;
      return sum + lineSub - item.discount;
    }, 0);

    // Calculate discount
    const discNum = parseFloat(discountInput) || 0;
    const discount = discountType === 'percent' 
      ? subtotal * (discNum / 100) 
      : discNum;

    const afterDiscount = Math.max(0, subtotal - discount);
    const tax = afterDiscount * (settings.taxRate || 0.08875);
    const total = afterDiscount + tax;

    return {
      subtotal,
      discount,
      tax,
      total
    };
  }, [cart, discountInput, discountType, settings.taxRate]);

  // Create quick customer
  const handleCreateCustomer = () => {
    if (!newCustFirst || !newCustLast) {
      alert('First and Last names are required');
      return;
    }

    const newCust = {
      id: (customers.length + 1).toString(),
      firstName: newCustFirst,
      lastName: newCustLast,
      businessName: '',
      phone: newCustPhone,
      email: newCustEmail,
      birthday: '',
      tags: ['Repeat Buyer'],
      totalOrders: 0,
      lifetimeValue: 0,
      notes: 'Added from POS quick checkout'
    };

    onAddCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    setShowCustModal(false);
    // Reset forms
    setNewCustFirst('');
    setNewCustLast('');
    setNewCustPhone('');
    setNewCustEmail('');
  };

  // Checkout submission
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Your shopping cart is empty.');
      return;
    }

    const { subtotal, tax, discount, total } = cartCalculations;
    const isConfirmed = window.confirm(
      `Complete Sale?\nTotal Due: ${formatCurrency(total)}\nPayment Method: ${paymentType}\nChannel: ${salesChannel}`
    );
    if (!isConfirmed) return;

    const invoiceId = `${settings.invoicePrefix || 'INV'}-${Date.now().toString().slice(-6)}`;
    const invoiceDate = new Date().toISOString();

    const invoice: SalesInvoice = {
      id: invoiceId,
      date: invoiceDate,
      customerId: selectedCustomerId || 'WALKIN',
      subtotal,
      tax,
      discount,
      total,
      paymentType,
      salesChannel,
      status: 'Paid',
      notes: notes || 'Completed checkout'
    };

    const items: SalesItem[] = cart.map((item, idx) => ({
      id: `${invoiceId}-L${idx + 1}`,
      invoiceId,
      productId: item.product.id,
      qty: item.quantity,
      unitPrice: item.product.retailPrice,
      discount: item.discount,
      total: (item.product.retailPrice * item.quantity) - item.discount
    }));

    // Create logs and inventory decrement details
    const logs: InventoryLog[] = [];
    const updates: { id: string; newQty: number }[] = [];

    cart.forEach(item => {
      const beforeQty = item.product.quantity;
      const afterQty = beforeQty - item.quantity;
      
      logs.push({
        id: `LOG-${Date.now().toString().slice(-4)}-${item.product.id}`,
        date: invoiceDate,
        productId: item.product.id,
        type: 'Sale',
        qtyChange: -item.quantity,
        beforeQty,
        afterQty,
        reason: `POS Checkout - Invoice ${invoiceId}`,
        user: settings.email || 'Admin User'
      });

      updates.push({
        id: item.product.id,
        newQty: afterQty
      });
    });

    const itemsDetail = cart.map(item => ({
      name: item.product.name,
      sku: item.product.sku,
      variant: item.product.variant || '',
      qty: item.quantity,
      price: item.product.retailPrice,
      total: (item.product.retailPrice * item.quantity) - item.discount
    }));

    try {
      await onCompleteSale(invoice, items, logs, updates);
      setCompletedInvoice(invoice);
      setCompletedItems(itemsDetail);
      setCart([]);
      setNotes('');
      setDiscountInput('0');
    } catch (err) {
      console.error('Checkout execution error:', err);
      alert('Error writing sale transaction to ledger. Please check your sheet connection.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* LEFT: Product Selection (7 columns) */}
      <div className="lg:col-span-7 space-y-4">
        
        {/* Search and category filters */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products by Name, SKU, or Barcode..."
              className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-700"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Quick Categories filter tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 ${
                  selectedCategory === cat 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products catalog grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[580px] overflow-y-auto pr-1">
          {filteredProducts.map(prod => (
            <motion.div
              whileHover={{ y: -2 }}
              key={prod.id}
              onClick={() => handleAddToCart(prod)}
              className="bg-white border border-gray-100 rounded-2xl p-3 shadow-xs cursor-pointer hover:shadow-md transition-all flex flex-col justify-between space-y-3"
            >
              {prod.imageUrl ? (
                <img
                  src={prod.imageUrl}
                  alt={prod.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-24 object-cover rounded-xl bg-gray-50 border border-gray-50"
                />
              ) : (
                <div className="w-full h-24 rounded-xl bg-indigo-50/50 flex flex-col items-center justify-center text-indigo-400">
                  <ShoppingBag className="w-7 h-7" />
                  <span className="text-[10px] uppercase font-bold tracking-wider mt-1">{prod.category}</span>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs text-gray-400 font-bold truncate">SKU: {prod.sku}</p>
                <h5 className="text-sm font-bold text-gray-800 line-clamp-1 leading-tight">{prod.name}</h5>
                <p className="text-xs text-gray-500">Variant: {prod.variant || 'N/A'}</p>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                <span className="text-base font-extrabold text-indigo-600">{formatCurrency(prod.retailPrice)}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  prod.quantity <= 0 
                    ? 'bg-red-50 text-red-500' 
                    : prod.quantity <= prod.reorderLevel 
                      ? 'bg-amber-50 text-amber-600' 
                      : 'bg-emerald-50 text-emerald-600'
                }`}>
                  Stock: {prod.quantity}
                </span>
              </div>
            </motion.div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full bg-white border border-gray-100 rounded-2xl py-14 text-center text-gray-400 text-sm">
              No matching products found in catalog.
            </div>
          )}
        </div>

      </div>

      {/* RIGHT: Cart and Totals Summary (5 columns) */}
      <div className="lg:col-span-5 space-y-4">
        
        {/* Cart items list */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-indigo-600" />
              <h4 className="text-base font-bold text-gray-800">Current Cart ({cart.reduce((s,i) => s + i.quantity, 0)})</h4>
            </div>
            {cart.length > 0 && (
              <button 
                onClick={() => setCart([])}
                className="text-xs text-red-500 hover:text-red-600 font-semibold"
              >
                Clear Cart
              </button>
            )}
          </div>

          <div className="divide-y divide-gray-50 overflow-y-auto max-h-[220px] pr-1 space-y-2">
            {cart.map(item => (
              <div key={item.product.id} className="flex items-center justify-between py-2 first:pt-0">
                <div className="space-y-1 max-w-[160px]">
                  <p className="text-sm font-bold text-gray-700 truncate">{item.product.name}</p>
                  <p className="text-xs text-gray-400 font-medium">Retail: {formatCurrency(item.product.retailPrice)} ({item.product.variant})</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    <button 
                      onClick={() => handleUpdateQty(item.product.id, -1)}
                      className="px-2 py-1 hover:bg-gray-100 text-gray-500 transition-all"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2.5 text-xs font-bold text-gray-700">{item.quantity}</span>
                    <button 
                      onClick={() => handleUpdateQty(item.product.id, 1)}
                      className="px-2 py-1 hover:bg-gray-100 text-gray-500 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button 
                    onClick={() => handleRemoveItem(item.product.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm flex flex-col items-center justify-center space-y-2">
                <ShoppingBag className="w-8 h-8 text-gray-200" />
                <p>Cashier cart is empty.</p>
                <p className="text-xs text-gray-300">Click products on the left to add items.</p>
              </div>
            )}
          </div>
        </div>

        {/* Transaction options & Customer lookups */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs space-y-4">
          
          {/* Customer lookup row */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Customer Lookup</label>
            <div className="flex items-center space-x-2">
              <select
                className="w-full text-sm py-2 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
              >
                <option value="">-- Anonymous Walk-In --</option>
                {customers.map(cust => (
                  <option key={cust.id} value={cust.id}>
                    {cust.firstName} {cust.lastName} {cust.businessName ? `(${cust.businessName})` : ''}
                  </option>
                ))}
              </select>
              <button 
                onClick={() => setShowCustModal(true)}
                className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all"
                title="Add Customer quickly"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Payment method and Channel */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment Method</label>
              <select
                className="w-full text-sm py-2 border border-gray-200 rounded-xl bg-white text-gray-700"
                value={paymentType}
                onChange={e => setPaymentType(e.target.value)}
              >
                {settings.paymentMethods.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sales Channel</label>
              <select
                className="w-full text-sm py-2 border border-gray-200 rounded-xl bg-white text-gray-700"
                value={salesChannel}
                onChange={e => setSalesChannel(e.target.value)}
              >
                {settings.salesChannels.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Discounts */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Discount Modifier</label>
            <div className="flex items-center space-x-2">
              <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white w-28 shrink-0">
                <button
                  onClick={() => setDiscountType('percent')}
                  className={`text-xs px-3 py-1.5 font-bold ${discountType === 'percent' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  %
                </button>
                <button
                  onClick={() => setDiscountType('value')}
                  className={`text-xs px-3 py-1.5 font-bold ${discountType === 'value' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  $
                </button>
              </div>
              <input
                type="number"
                min="0"
                className="w-full text-sm py-1.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-700 px-3"
                value={discountInput}
                onChange={e => setDiscountInput(e.target.value || '0')}
              />
            </div>
          </div>

          {/* Checkout notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Notes</label>
            <input
              type="text"
              placeholder="e.g. Custom order deposit, pride festival sale..."
              className="w-full text-sm py-1.5 border border-gray-200 rounded-xl text-gray-700 px-3"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Pricing Totals list */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2 border border-gray-100/60 font-medium text-sm text-gray-500">
            <div className="flex items-center justify-between">
              <span>Cart Subtotal</span>
              <span className="font-mono text-gray-700 font-bold">{formatCurrency(cartCalculations.subtotal)}</span>
            </div>
            {cartCalculations.discount > 0 && (
              <div className="flex items-center justify-between text-rose-500">
                <span>Discounts Applied</span>
                <span className="font-mono font-bold">-{formatCurrency(cartCalculations.discount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>Sales Tax ({(settings.taxRate * 100).toFixed(3)}%)</span>
              <span className="font-mono text-gray-700 font-bold">{formatCurrency(cartCalculations.tax)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200/60 pt-2 text-base text-gray-800 font-extrabold">
              <span className="text-indigo-600">Total Charged</span>
              <span className="font-mono text-indigo-700">{formatCurrency(cartCalculations.total)}</span>
            </div>
          </div>

          {/* Submit button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isSyncing}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer shadow-md hover:shadow-lg"
          >
            {isSyncing ? (
              <span>Syncing Ledger with Google Sheets...</span>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                <span>Complete Checkout & Sync Sheets</span>
              </>
            )}
          </button>

        </div>

      </div>

      {/* QUICK CUSTOMER QUICK MODAL */}
      {showCustModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4"
          >
            <h4 className="text-lg font-bold text-gray-800">Add Quick Customer</h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="First Name *"
                className="w-full text-sm py-2 border border-gray-200 rounded-xl px-3"
                value={newCustFirst}
                onChange={e => setNewCustFirst(e.target.value)}
              />
              <input
                type="text"
                placeholder="Last Name *"
                className="w-full text-sm py-2 border border-gray-200 rounded-xl px-3"
                value={newCustLast}
                onChange={e => setNewCustLast(e.target.value)}
              />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full text-sm py-2 border border-gray-200 rounded-xl px-3"
                value={newCustEmail}
                onChange={e => setNewCustEmail(e.target.value)}
              />
              <input
                type="text"
                placeholder="Phone Number"
                className="w-full text-sm py-2 border border-gray-200 rounded-xl px-3"
                value={newCustPhone}
                onChange={e => setNewCustPhone(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button 
                onClick={() => setShowCustModal(false)}
                className="text-xs text-gray-500 font-semibold px-3 py-2 hover:bg-gray-50 rounded-xl"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateCustomer}
                className="text-xs bg-indigo-600 text-white font-bold px-4 py-2 hover:bg-indigo-700 rounded-xl"
              >
                Save Customer
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* INVOICE SUCCESS POPUP */}
      <AnimatePresence>
        {completedInvoice && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-gray-100 space-y-4 relative"
            >
              <div className="text-center space-y-2">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-xl font-bold text-gray-800">Sale Recorded Successfully!</h4>
                <p className="text-xs text-gray-400">All inventory logs generated and Google Sheet updated.</p>
              </div>

              {/* Mock Receipt */}
              <div className="border border-dashed border-gray-200 rounded-2xl p-4 bg-gray-50 font-mono text-xs space-y-3 text-gray-600 max-h-96 overflow-y-auto">
                <div className="text-center font-bold">
                  <p className="text-sm">{settings.businessName || 'MG Creations'}</p>
                  <p>{settings.email}</p>
                  <p className="mt-1">*** OFFICIAL RECEIPT ***</p>
                </div>
                <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                  <span>INVOICE: {completedInvoice.id}</span>
                  <span>{completedInvoice.date.substring(11, 19)}</span>
                </div>

                {/* Items Purchased in standard popup */}
                {completedItems.length > 0 && (
                  <div className="border-b border-dashed border-gray-200 pb-2 space-y-1">
                    <p className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Items Purchased</p>
                    {completedItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-[11px]">
                        <span>
                          {item.qty}x {item.name} {item.variant ? `(${item.variant})` : ''}
                        </span>
                        <span>{formatCurrency(item.total)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-1">
                  <p className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Transaction Summary</p>
                  <div className="flex justify-between">
                    <span>Payment Method:</span>
                    <span className="font-bold">{completedInvoice.paymentType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sales Channel:</span>
                    <span className="font-bold">{completedInvoice.salesChannel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(completedInvoice.subtotal)}</span>
                  </div>
                  {completedInvoice.discount > 0 && (
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span>-{formatCurrency(completedInvoice.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatCurrency(completedInvoice.tax)}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-gray-200 pt-2 font-bold text-gray-800">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(completedInvoice.total)}</span>
                  </div>
                </div>
                <div className="text-center text-[10px] text-gray-400 mt-2">
                  <p>Thank you for supporting craft businesses!</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handlePrint}
                  className="flex-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-bold py-2.5 rounded-2xl flex items-center justify-center space-x-2 cursor-pointer transition-all hover:shadow-xs"
                  id="print-receipt-action-btn"
                >
                  <Printer className="w-4 h-4 text-indigo-600" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setCompletedInvoice(null)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-2xl flex items-center justify-center space-x-2 cursor-pointer transition-all hover:shadow-md"
                >
                  <span>Continue Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HIDDEN PRINT-ONLY RECEIPT AREA (FOR PAPER FORMATTING VIA MEDIA QUERY) */}
      {completedInvoice && (
        <div id="print-receipt-area" className="hidden print:block text-black bg-white">
          <div className="text-center mb-4">
            <h1 className="font-bold text-sm tracking-wider uppercase m-0 leading-tight">{settings.businessName || 'MG Creations'}</h1>
            {settings.email && <p className="text-[10px] m-0">{settings.email}</p>}
            <p className="text-[10px] mt-2 mb-0 border-y border-dashed border-black py-1 font-bold">*** OFFICIAL RECEIPT ***</p>
          </div>

          <table className="w-full text-[10px] mb-4">
            <tbody>
              <tr>
                <td className="py-0.5 pr-1 font-bold">Invoice Ref:</td>
                <td className="py-0.5 text-right">{completedInvoice.id}</td>
              </tr>
              <tr>
                <td className="py-0.5 pr-1 font-bold">Date & Time:</td>
                <td className="py-0.5 text-right">{new Date(completedInvoice.date).toLocaleString()}</td>
              </tr>
              <tr>
                <td className="py-0.5 pr-1 font-bold">Payment Method:</td>
                <td className="py-0.5 text-right">{completedInvoice.paymentType}</td>
              </tr>
              <tr>
                <td className="py-0.5 pr-1 font-bold">Sales Channel:</td>
                <td className="py-0.5 text-right">{completedInvoice.salesChannel}</td>
              </tr>
              {completedInvoice.customerId !== 'WALKIN' && (
                <tr>
                  <td className="py-0.5 pr-1 font-bold">Customer ID:</td>
                  <td className="py-0.5 text-right">{completedInvoice.customerId}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Purchased products itemized table */}
          <div className="border-t border-dashed border-black pt-2 mb-3">
            <p className="font-bold text-[10px] uppercase mb-1.5 tracking-wider">Purchased Items</p>
            <table className="w-full text-[10px] border-b border-dashed border-black pb-2">
              <thead>
                <tr className="border-b border-dashed border-black">
                  <th className="text-left py-1 font-bold">Item Description</th>
                  <th className="text-center py-1 font-bold w-12">Qty</th>
                  <th className="text-right py-1 font-bold w-16">Price</th>
                </tr>
              </thead>
              <tbody>
                {completedItems.map((item, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-1 pr-1 font-medium">
                      <span>{item.name}</span>
                      {item.variant && <p className="text-[8px] text-gray-800 m-0 leading-none">({item.variant})</p>}
                    </td>
                    <td className="py-1 text-center font-bold">{item.qty}</td>
                    <td className="py-1 text-right">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Transaction aggregates */}
          <table className="w-full text-[10px] mb-6">
            <tbody>
              <tr>
                <td className="py-0.5 font-bold">Subtotal:</td>
                <td className="py-0.5 text-right">{formatCurrency(completedInvoice.subtotal)}</td>
              </tr>
              {completedInvoice.discount > 0 && (
                <tr className="font-bold text-black">
                  <td className="py-0.5">Discount Applied:</td>
                  <td className="py-0.5 text-right">-{formatCurrency(completedInvoice.discount)}</td>
                </tr>
              )}
              <tr>
                <td className="py-0.5 font-bold">Sales Tax ({(settings.taxRate * 100).toFixed(3)}%):</td>
                <td className="py-0.5 text-right">{formatCurrency(completedInvoice.tax)}</td>
              </tr>
              <tr className="border-t border-dashed border-black font-bold text-sm">
                <td className="pt-2">TOTAL PAID:</td>
                <td className="pt-2 text-right">{formatCurrency(completedInvoice.total)}</td>
              </tr>
            </tbody>
          </table>

          <div className="text-center text-[10px] border-t border-dashed border-black pt-3 mt-4">
            <p className="font-bold m-0 leading-normal">Thank you for your business!</p>
            <p className="m-0 text-[8px] leading-relaxed">Handcrafted & Consignment Goods</p>
          </div>
        </div>
      )}

    </div>
  );
}

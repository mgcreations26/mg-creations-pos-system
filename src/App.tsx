/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  auth, googleSignIn, logout, getAccessToken 
} from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  findPOSSpreadsheet, createPOSSpreadsheet, loadSpreadsheetData, 
  appendToSheet, updateProductQuantityInSheet, updateProductInSheet, saveSaleToSheets 
} from './sheets';
import { 
  Product, Customer, SalesInvoice, SalesItem, 
  InventoryLog, Expense, ReturnRecord, GiftCard, 
  ConsignmentItem, CraftEvent, CustomOrder, RawMaterial, SystemSettings 
} from './types';

// Importing Premium UI Tab Modules
import Dashboard from './components/Dashboard';
import POSCheckout from './components/POSCheckout';
import InventoryManager from './components/InventoryManager';
import CustomerManager from './components/CustomerManager';
import ExpenseManager from './components/ExpenseManager';
import ExtraModules from './components/ExtraModules';
import AIAssistant from './components/AIAssistant';
import ImageDesigner from './components/ImageDesigner';

// Import Icons
import { 
  LayoutDashboard, ShoppingBag, Layers, Users, 
  DollarSign, Sliders, Sparkles, Cpu, RotateCw, 
  LogOut, LogIn, Database, CheckCircle, ExternalLink, Loader2,
  Sun, Moon
} from 'lucide-react';

// Default / Initial Settings
const DEFAULT_SETTINGS: SystemSettings = {
  taxRate: 0.08875,
  invoicePrefix: 'INV',
  currency: 'USD',
  lowStockThreshold: 5,
  businessName: 'MG Creations',
  email: 'mgcreations@gmail.com',
  paymentMethods: ['Cash', 'Credit Card', 'Venmo', 'PayPal', 'Zelle'],
  salesChannels: ['Craft Fair', 'Etsy', 'Website', 'Consignment', 'Custom Commission'],
  productCategories: ['Apparel', 'Drinkware', 'Stickers', 'Bags', 'Accessories', 'Stationery', 'Home Decor']
};


export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Sheets variables
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [isInitializingSheets, setIsInitializingSheets] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [useDemoSandbox, setUseDemoSandbox] = useState(false);

  // ERP Database Core States
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Extras States
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [consignment, setConsignment] = useState<ConsignmentItem[]>([]);
  const [events, setEvents] = useState<CraftEvent[]>([]);
  const [customOrders, setCustomOrders] = useState<CustomOrder[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  // Active Screen / Tab Selector
  const [activeTab, setActiveTab] = useState<'dashboard' | 'checkout' | 'inventory' | 'customers' | 'expenses' | 'extras' | 'advisor' | 'designer'>('dashboard');

  // Listen to Auth State
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setAuthLoading(true);
      if (currentUser) {
        setUser(currentUser);
        try {
          const fetchedToken = getAccessToken();
          setToken(fetchedToken);
          // Auto-discover sheet after getting Google token
          if (fetchedToken) {
            await handleDiscoverOrCreateSheet(fetchedToken);
          }
        } catch (err) {
          console.error("Auth token cache fetch failed:", err);
        }
      } else {
        setUser(null);
        setToken(null);
        setSheetId(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // Sandbox data loader
  const handleLoadDemoSandbox = () => {
    setUseDemoSandbox(true);
    setSheetId("SANDBOX-ID-DEMO-ONLY");

    // Seed mock craft products
    setProducts([
      { id: '1', sku: 'MUG-RAIN-11', name: 'Rainbow Glow Glazed Mug', category: 'Drinkware', variant: '11oz', cost: 2.10, retailPrice: 18.00, quantity: 24, reorderLevel: 5, vendor: 'MG Creations', barcode: '112233', active: true, imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=200' },
      { id: '2', sku: 'TEE-ST-M', name: 'Crafty Vibes Embroidered Tee', category: 'Apparel', variant: 'Medium', cost: 4.50, retailPrice: 28.00, quantity: 4, reorderLevel: 5, vendor: 'MG Creations', barcode: '445566', active: true, imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=200' },
      { id: '3', sku: 'STK-PRD-01', name: 'Pride Rainbow Vinyl Sticker pack', category: 'Stickers', variant: 'Glossy', cost: 0.25, retailPrice: 5.00, quantity: 150, reorderLevel: 10, vendor: 'MG Creations', barcode: '778899', active: true, imageUrl: 'https://images.unsplash.com/photo-1572375995501-4b0894d13c89?auto=format&fit=crop&q=80&w=200' },
      { id: '4', sku: 'TOTE-NAT-01', name: 'Support Makers Canvas Tote', category: 'Bags', variant: 'Natural Canvas', cost: 3.00, retailPrice: 22.00, quantity: 2, reorderLevel: 4, vendor: 'MG Creations', barcode: '990011', active: true, imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=200' },
    ]);

    // Seed mock CRM Customers
    setCustomers([
      { id: '1', firstName: 'Sarah', lastName: 'Miller', businessName: 'Boutique Gifts Ltd', phone: '(555) 432-1234', email: 'sarah@millergifts.com', birthday: 'May 12', tags: ['VIP', 'Wholesale'], totalOrders: 4, lifetimeValue: 420.00, notes: 'Prefers matte glaze coffee mugs.' },
      { id: '2', firstName: 'David', lastName: 'Kemp', businessName: '', phone: '(555) 987-6543', email: 'dkemp@gmail.com', birthday: 'Feb 19', tags: ['Repeat Buyer', 'Craft Fair'], totalOrders: 2, lifetimeValue: 46.00, notes: 'Bought 2 sticker packs at Pride Fair.' },
    ]);

    // Seed mock Sales
    setInvoices([
      { id: 'INV-77112', date: '2026-06-15T14:32:00.000Z', customerId: '1', subtotal: 100.00, tax: 8.88, discount: 10.00, total: 98.88, paymentType: 'Credit Card', salesChannel: 'Etsy', status: 'Paid', notes: 'Packed with bubblewrap' },
      { id: 'INV-88224', date: '2026-06-20T11:15:00.000Z', customerId: '2', subtotal: 36.00, tax: 3.20, discount: 0, total: 39.20, paymentType: 'Cash', salesChannel: 'Craft Fair', status: 'Paid', notes: 'Met at Booth 4' },
    ]);

    // Seed mock Expenses
    setExpenses([
      { id: 'EXP-101', date: '2026-06-01', category: 'Booth Fees', vendor: 'Pride Fair Organizers', amount: 150.00, taxDeductible: true, notes: 'Table and tent included' },
      { id: 'EXP-102', date: '2026-06-05', category: 'Supplies', vendor: 'Amazon Craft Blanks', amount: 84.50, taxDeductible: true, notes: '10 blank ceramic mugs' },
    ]);

    // Seed audit logs
    setInventoryLogs([
      { id: 'LOG-001', date: '2026-06-01T12:00:00.000Z', productId: '1', type: 'Restock', qtyChange: 24, beforeQty: 0, afterQty: 24, reason: 'Initial batch glazing', user: 'Admin' },
    ]);

    // Seed returns, consignment, gift cards, custom orders
    setCustomOrders([
      { id: 'ORD-901', customerId: '1', description: '5 customized glow mugs with name "Sarah"', deposit: 25.00, totalPrice: 90.00, dueDate: '2026-07-20', status: 'In Progress' }
    ]);
    setMaterials([
      { id: 'MAT-201', name: 'Blank Ceramic 11oz Mugs', category: 'Blanks', quantity: 45, unit: 'mugs', cost: 1.45, supplier: 'CrateBlanks Inc' },
      { id: 'MAT-202', name: 'Glow Resin Epoxy Solution', category: 'Glazes', quantity: 12, unit: 'oz', cost: 4.50, supplier: 'ArtChem' }
    ]);
    setEvents([
      { id: 'EVT-501', name: 'Downtown Pride Fair 2026', date: '2026-06-20', boothFee: 150.00, sales: 640.00, profit: 490.00 }
    ]);
    setConsignment([
      { id: 'CON-301', location: 'Whimsical Local Crafts Boutique', productId: '1', quantity: 10, payoutRate: 11.00, soldQuantity: 3, status: 'Active' }
    ]);
  };

  // Google Sheets discovery & creation pipeline
  const handleDiscoverOrCreateSheet = async (accessToken: string) => {
    setIsInitializingSheets(true);
    try {
      let foundId = await findPOSSpreadsheet(accessToken);
      if (!foundId) {
        console.log("No existing spreadsheet found. Provisioning a brand new MG Creations POS System spreadsheet...");
        foundId = await createPOSSpreadsheet(accessToken, user?.email || 'mgcreations@gmail.com');
      }
      setSheetId(foundId);
      await handleSyncLoadAllData(foundId, accessToken);
    } catch (err) {
      console.error("Failed to sync/provision Google Sheets:", err);
      alert("Notice: Could not sync with Google Sheets. Check OAuth scopes or toggle offline Demo Sandbox mode.");
      handleLoadDemoSandbox();
    } finally {
      setIsInitializingSheets(false);
    }
  };

  // Pull all records from Google Sheets
  const handleSyncLoadAllData = async (spreadsheetId: string, accessToken: string) => {
    setIsSyncing(true);
    try {
      const data = await loadSpreadsheetData(accessToken, spreadsheetId);
      if (data) {
        setProducts(data.products);
        setCustomers(data.customers);
        setInvoices(data.salesInvoices);
        setSalesItems(data.salesItems);
        setInventoryLogs(data.logs);
        setExpenses(data.expenses);
        
        // Load extras
        setReturns(data.returns || []);
        setGiftCards(data.giftCards || []);
        setConsignment(data.consignment || []);
        setEvents(data.events || []);
        setCustomOrders(data.customOrders || []);
        setMaterials(data.materials || []);

        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (err) {
      console.error("Failed to load spreadsheet rows:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // FORCE MANUAL SYNC
  const handleManualSync = async () => {
    if (useDemoSandbox) {
      alert("Currently running in Offline Demo Sandbox mode. Sign in to connect with Google Sheets ledger!");
      return;
    }
    if (!token || !sheetId) return;
    await handleSyncLoadAllData(sheetId, token);
    alert("ERP state successfully synchronized and updated from Google Sheet ledger!");
  };

  // 1. CHECKOUT SUBMIT SALES HANDLER
  const handleCompleteSale = async (
    invoice: SalesInvoice, 
    items: SalesItem[], 
    logs: InventoryLog[],
    updates: { id: string; newQty: number }[]
  ) => {
    // 1. Update React Local States immediately for snappy frontend feel
    setInvoices(prev => [...prev, invoice]);
    setSalesItems(prev => [...prev, ...items]);
    setInventoryLogs(prev => [...prev, ...logs]);
    
    // Decrement local quantities
    setProducts(prev => prev.map(p => {
      const update = updates.find(u => u.id === p.id);
      return update ? { ...p, quantity: update.newQty } : p;
    }));

    // Increment associated customer lifetime value & totals
    if (invoice.customerId && invoice.customerId !== 'WALKIN') {
      setCustomers(prev => prev.map(c => {
        if (c.id === invoice.customerId) {
          return {
            ...c,
            totalOrders: c.totalOrders + 1,
            lifetimeValue: c.lifetimeValue + invoice.total
          };
        }
        return c;
      }));
    }

    // 2. Sync sheets ledger background write
    if (!useDemoSandbox && token && sheetId) {
      setIsSyncing(true);
      try {
        const updatesWithRowNum = updates.map(up => {
          const idx = products.findIndex(p => p.id === up.id);
          return {
            id: up.id,
            rowNum: idx > -1 ? idx + 2 : 2,
            newQty: up.newQty
          };
        });
        await saveSaleToSheets(token, sheetId, invoice, items, logs, updatesWithRowNum);
      } catch (err) {
        console.error("Sale Sheets sync failed:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // 2. PRODUCT MASTER ACTIONS
  const handleAddProduct = async (newProduct: Product) => {
    setProducts(prev => [...prev, newProduct]);
    if (!useDemoSandbox && token && sheetId) {
      setIsSyncing(true);
      try {
        await appendToSheet(token, sheetId, 'PRODUCTS', [
          newProduct.id,
          newProduct.sku,
          newProduct.name,
          newProduct.category,
          newProduct.variant,
          newProduct.cost,
          newProduct.retailPrice,
          newProduct.quantity,
          newProduct.reorderLevel,
          newProduct.vendor,
          newProduct.barcode,
          newProduct.active ? 'TRUE' : 'FALSE',
          newProduct.imageUrl || ''
        ]);
      } catch (err) {
        console.error("Save product failed:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    if (!useDemoSandbox && token && sheetId) {
      setIsSyncing(true);
      try {
        const idx = products.findIndex(p => p.id === updatedProduct.id);
        const rowNum = idx > -1 ? idx + 2 : 2;
        await updateProductInSheet(token, sheetId, updatedProduct, rowNum);
      } catch (err) {
        console.error("Update product failed:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleLogAdjustment = async (log: InventoryLog) => {
    setInventoryLogs(prev => [...prev, log]);
    setProducts(prev => prev.map(p => p.id === log.productId ? { ...p, quantity: log.afterQty } : p));
    
    if (!useDemoSandbox && token && sheetId) {
      setIsSyncing(true);
      try {
        const idx = products.findIndex(p => p.id === log.productId);
        const rowNum = idx > -1 ? idx + 2 : 2;
        // Log in sheets and update products quantity cell
        await appendToSheet(token, sheetId, 'INVENTORY_LOG', [
          log.id,
          log.date,
          log.productId,
          log.type,
          log.qtyChange,
          log.beforeQty,
          log.afterQty,
          log.reason,
          log.user
        ]);
        await updateProductQuantityInSheet(token, sheetId, log.productId, log.afterQty, rowNum);
      } catch (err) {
        console.error("Log adjustment failed:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // 3. CRM CUSTOMER RECORD
  const handleAddCustomer = async (newCust: Customer) => {
    setCustomers(prev => [...prev, newCust]);
    if (!useDemoSandbox && token && sheetId) {
      setIsSyncing(true);
      try {
        await appendToSheet(token, sheetId, 'CUSTOMERS', [
          newCust.id,
          newCust.firstName,
          newCust.lastName,
          newCust.businessName || '',
          newCust.phone || '',
          newCust.email || '',
          newCust.birthday || '',
          newCust.tags.join(', '),
          newCust.totalOrders,
          newCust.lifetimeValue,
          newCust.notes || ''
        ]);
      } catch (err) {
        console.error("Save customer failed:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // 4. EXPENSE RECORD
  const handleAddExpense = async (newExp: Expense) => {
    setExpenses(prev => [...prev, newExp]);
    if (!useDemoSandbox && token && sheetId) {
      setIsSyncing(true);
      try {
        await appendToSheet(token, sheetId, 'EXPENSES', [
          newExp.id,
          newExp.date,
          newExp.category,
          newExp.vendor,
          newExp.amount,
          newExp.taxDeductible ? 'TRUE' : 'FALSE',
          newExp.notes || ''
        ]);
      } catch (err) {
        console.error("Save expense failed:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // 5. EXTRAS LOGS RECORD
  const handleAddExtraRecord = async (sheetName: string, record: any) => {
    // Update local react states based on sheets
    if (sheetName === 'RETURNS') {
      setReturns(prev => [...prev, record]);
    } else if (sheetName === 'GIFT_CARDS') {
      setGiftCards(prev => [...prev, record]);
    } else if (sheetName === 'CONSIGNMENT') {
      setConsignment(prev => [...prev, record]);
    } else if (sheetName === 'EVENTS') {
      setEvents(prev => [...prev, record]);
    } else if (sheetName === 'CUSTOM_ORDERS') {
      setCustomOrders(prev => [...prev, record]);
    } else if (sheetName === 'MATERIALS') {
      setMaterials(prev => [...prev, record]);
    }

    if (!useDemoSandbox && token && sheetId) {
      setIsSyncing(true);
      try {
        let cols: any[] = [];
        if (sheetName === 'RETURNS') {
          cols = [record.id, record.invoiceId, record.date, record.reason, record.refundAmount];
        } else if (sheetName === 'GIFT_CARDS') {
          cols = [record.id, record.code, record.customerId, record.originalBalance, record.currentBalance, record.active ? 'TRUE' : 'FALSE'];
        } else if (sheetName === 'CONSIGNMENT') {
          cols = [record.id, record.location, record.productId, record.quantity, record.payoutRate, record.soldQuantity, record.status];
        } else if (sheetName === 'EVENTS') {
          cols = [record.id, record.name, record.date, record.boothFee, record.sales, record.profit];
        } else if (sheetName === 'CUSTOM_ORDERS') {
          cols = [record.id, record.customerId, record.description, record.deposit, record.totalPrice, record.dueDate, record.status];
        } else if (sheetName === 'MATERIALS') {
          cols = [record.id, record.name, record.category, record.quantity, record.unit, record.cost, record.supplier];
        }

        await appendToSheet(token, sheetId, sheetName, cols);
      } catch (err) {
        console.error(`Save extra record to ${sheetName} failed:`, err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Autofill designer mockup images to the Add product form
  const handleAddProductWithImage = (imageUrl: string) => {
    setActiveTab('inventory');
    alert("Image URL transferred! Tap 'Add New Craft Product' inside catalogue, and paste this URL into the Thumbnail Image input.");
  };

  // Google Sign-In helper triggers

  const handleSignInGoogleFlow = async () => {
    try {
      setAuthLoading(true);
      await googleSignIn();
    } catch (err) {
      alert("Sign in proposal failed. Check your browser popups.");
      setAuthLoading(false);
    }
  };

  const handleSignOutFlow = async () => {
    await logout();
    setUseDemoSandbox(false);
    setProducts([]);
    setCustomers([]);
    setInvoices([]);
    setExpenses([]);
    setInventoryLogs([]);
    setReturns([]);
    setGiftCards([]);
    setConsignment([]);
    setEvents([]);
    setCustomOrders([]);
    setMaterials([]);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-gray-800 antialiased font-sans flex flex-col justify-between">
      
      {/* Top Banner & Titlebar */}
      <header className="bg-white border-b border-gray-200/60 sticky top-0 z-40 backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
              <Cpu className="w-5.5 h-5.5 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-gray-900 tracking-tight leading-none">{settings.businessName} POS</h1>
              <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mt-0.5">Modular ERP Ledger</p>
            </div>
          </div>

          {/* Ledger Connections / Auth Buttons */}
          <div className="flex items-center space-x-3">
            
            {/* Show Spreadsheet link if active */}
            {sheetId && !useDemoSandbox && (
              <a 
                href={`https://docs.google.com/spreadsheets/d/${sheetId}`} 
                target="_blank" 
                rel="noreferrer"
                className="hidden md:flex items-center space-x-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full hover:bg-emerald-100/60 transition-all"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Opened Ledger</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {/* Offline Sandbox notification */}
            {useDemoSandbox && (
              <span className="text-[10px] font-extrabold bg-amber-50 text-amber-600 border border-amber-100/80 px-3 py-1.5 rounded-full">
                🟡 Offline Sandbox Mode
              </span>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              className="p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-800 rounded-xl transition-all cursor-pointer border border-gray-100 bg-white"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              id="theme-toggle-button"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-slate-700" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
            </button>

            {/* Manual sheet refresh action */}
            {sheetId && !useDemoSandbox && (
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-800 rounded-xl transition-all cursor-pointer border border-gray-100 bg-white"
                title="Synchronize ERP sheets"
              >
                <RotateCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
            )}

            {/* Login or user profile logic */}
            {authLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            ) : user ? (
              <div className="flex items-center space-x-2.5">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-gray-800 leading-tight truncate max-w-[120px]">{user.displayName || 'Owner'}</p>
                  <p className="text-[9px] text-gray-400 font-bold tracking-wider uppercase leading-none mt-0.5">Verified</p>
                </div>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="profile logo"
                    className="w-8.5 h-8.5 rounded-xl border border-gray-200 shadow-sm"
                  />
                ) : (
                  <div className="w-8.5 h-8.5 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-xs">
                    {user.displayName?.charAt(0) || 'O'}
                  </div>
                )}
                <button
                  onClick={handleSignOutFlow}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border border-transparent"
                  title="Disconnect account"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignInGoogleFlow}
                className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Link Google Drive</span>
              </button>
            )}

          </div>

        </div>
      </header>

      {/* Main Core Display Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* LANDING SECTION: IF NOT SIGNED IN & NOT SANDBOX */}
        {!user && !useDemoSandbox ? (
          <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl p-8 border border-gray-100 shadow-xl space-y-6 text-center">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-md">
              <Database className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">MG Creations POS Database Setup</h2>
              <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
                Securely store invoices, materials, expenses, and consignment inventories right inside your personal Google Sheets. Complete sales and manage inventory easily.
              </p>
            </div>

            {/* Setup and Try buttons */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center pt-2">
              <button
                onClick={handleSignInGoogleFlow}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 px-6 rounded-2xl flex items-center justify-center space-x-2 shadow-md cursor-pointer transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In with Google</span>
              </button>
              <button
                onClick={handleLoadDemoSandbox}
                className="w-full sm:w-auto bg-gray-50 hover:bg-gray-100 text-gray-600 font-extrabold text-xs py-3 px-6 rounded-2xl border border-gray-200/80 cursor-pointer transition-all"
              >
                Try Offline Demo Sandbox
              </button>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 text-[11px] text-gray-400 border border-gray-100 leading-relaxed text-left space-y-1">
              <p className="font-bold text-gray-600">🛡️ Personal Workspace Privacy Mandate:</p>
              <p>We strictly read/write ONLY your custom spreadsheet file. Your personal documents, emails, and data are entirely untouched and secure.</p>
            </div>
          </div>
        ) : isInitializingSheets ? (
          // Spreadsheet initialization loader
          <div className="max-w-md mx-auto my-24 text-center space-y-4">
            <div className="relative w-12 h-12 mx-auto">
              <div className="absolute inset-0 border-4 border-indigo-100 rounded-full animate-ping"></div>
              <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-xs text-indigo-600 font-extrabold tracking-wider uppercase">Scanning Google Drive Workspace...</p>
            <p className="text-[11px] text-gray-400 leading-relaxed max-w-xs mx-auto">
              We are verifying or creating "MG Creations POS System" inside your spreadsheet directory.
            </p>
          </div>
        ) : (
          
          // CORE TABBED INTERFACE
          <div className="space-y-6">
            
            {/* Nav controls */}
            <nav className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm border border-gray-200/60 p-1 rounded-2xl overflow-x-auto scrollbar-thin">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'checkout', label: 'Cashier Terminal', icon: ShoppingBag },
                { id: 'inventory', label: 'Inventory Audit', icon: Layers },
                { id: 'customers', label: 'Customers CRM', icon: Users },
                { id: 'expenses', label: 'Expenses Ledger', icon: DollarSign },
                { id: 'extras', label: 'Commissions & Extras', icon: Sliders },
                { id: 'advisor', label: 'AI ERP Advisor', icon: Sparkles },
                { id: 'designer', label: 'Visual Designer', icon: Cpu }
              ].map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-1.5 text-[11px] font-extrabold py-2 px-3.5 rounded-xl shrink-0 transition-all cursor-pointer ${
                      active 
                        ? 'bg-indigo-600 text-white shadow-xs font-extrabold' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* TAB SCREENS ROUTING */}
            <div className="space-y-4">
              {activeTab === 'dashboard' && (
                <Dashboard 
                  products={products}
                  salesInvoices={invoices}
                  salesItems={salesItems}
                  expenses={expenses}
                  events={events}
                  currency={settings.currency}
                />
              )}

              {activeTab === 'checkout' && (
                <POSCheckout
                  products={products}
                  customers={customers}
                  settings={settings}
                  currency={settings.currency}
                  onCompleteSale={handleCompleteSale}
                  onAddCustomer={handleAddCustomer}
                  isSyncing={isSyncing}
                />
              )}

              {activeTab === 'inventory' && (
                <InventoryManager
                  products={products}
                  logs={inventoryLogs}
                  settings={settings}
                  currency={settings.currency}
                  onAddProduct={handleAddProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onLogAdjustment={handleLogAdjustment}
                  isSyncing={isSyncing}
                />
              )}

              {activeTab === 'customers' && (
                <CustomerManager
                  customers={customers}
                  currency={settings.currency}
                  onAddCustomer={handleAddCustomer}
                  isSyncing={isSyncing}
                />
              )}

              {activeTab === 'expenses' && (
                <ExpenseManager
                  expenses={expenses}
                  currency={settings.currency}
                  onAddExpense={handleAddExpense}
                  isSyncing={isSyncing}
                />
              )}

              {activeTab === 'extras' && (
                <ExtraModules
                  returns={returns}
                  giftCards={giftCards}
                  consignment={consignment}
                  events={events}
                  customOrders={customOrders}
                  materials={materials}
                  products={products}
                  customers={customers}
                  currency={settings.currency}
                  onAddRecord={handleAddExtraRecord}
                  isSyncing={isSyncing}
                />
              )}

              {activeTab === 'advisor' && (
                <AIAssistant
                  products={products}
                  customers={customers}
                  invoices={invoices}
                  expenses={expenses}
                  customOrders={customOrders}
                  materials={materials}
                />
              )}

              {activeTab === 'designer' && (
                <ImageDesigner 
                  onAddProductWithImage={handleAddProductWithImage}
                />
              )}
            </div>

          </div>
        )}

      </main>

      {/* Footer bar */}
      <footer className="bg-white border-t border-gray-100 py-6 mt-12 text-center text-[10px] text-gray-400 font-medium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-1">
          <p>© 2026 {settings.businessName} POS ERP Applet. All rights reserved.</p>
          <p>Structured Google Sheets Cloud Ledger Database Engine • Powered by Gemini AI models</p>
        </div>
      </footer>

    </div>
  );
}

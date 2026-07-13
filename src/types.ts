/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SystemSettings {
  taxRate: number;
  invoicePrefix: string;
  currency: string;
  lowStockThreshold: number;
  businessName: string;
  email: string;
  paymentMethods: string[];
  productCategories: string[];
  salesChannels: string[];
}

export interface Product {
  id: string; // Internal unique number or ID
  sku: string;
  name: string;
  category: string;
  variant: string; // Size, Color, Style, etc.
  cost: number;
  retailPrice: number;
  quantity: number;
  reorderLevel: number;
  vendor: string;
  barcode: string;
  active: boolean;
  imageUrl: string;
}

export interface InventoryLog {
  id: string;
  date: string;
  productId: string;
  productName?: string; // Helper UI field
  type: 'Sale' | 'Restock' | 'Adjustment' | 'Return' | 'Damage';
  qtyChange: number;
  beforeQty: number;
  afterQty: number;
  reason: string;
  user: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  businessName: string;
  phone: string;
  email: string;
  birthday: string;
  tags: string[]; // e.g., VIP, Wholesale, Pride Events, etc.
  totalOrders: number;
  lifetimeValue: number;
  notes: string;
}

export interface SalesInvoice {
  id: string; // Invoice ID
  date: string;
  customerId: string;
  customerName?: string; // Helper UI field
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentType: string;
  salesChannel: string;
  status: 'Paid' | 'Pending' | 'Refunded' | 'Partial';
  notes: string;
}

export interface SalesItem {
  id: string; // Line ID
  invoiceId: string;
  productId: string;
  productName?: string; // Helper UI field
  qty: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  vendor: string;
  dateOrdered: string;
  dateReceived: string;
  status: 'Draft' | 'Ordered' | 'Received' | 'Cancelled';
  totalCost: number;
}

export interface PurchaseOrderItem {
  id: string;
  poId: string;
  productId: string;
  qty: number;
  cost: number;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  vendor: string;
  amount: number;
  taxDeductible: boolean;
  notes: string;
}

// EXTRA MODULES
export interface ReturnRecord {
  id: string;
  invoiceId: string;
  date: string;
  reason: string;
  refundAmount: number;
}

export interface GiftCard {
  id: string;
  code: string;
  customerId: string;
  customerName?: string;
  originalBalance: number;
  currentBalance: number;
  active: boolean;
}

export interface ConsignmentItem {
  id: string;
  location: string;
  productId: string;
  productName?: string;
  quantity: number;
  payoutRate: number;
  soldQuantity: number;
  status: 'Active' | 'Settled' | 'Returned';
}

export interface CraftEvent {
  id: string;
  name: string;
  date: string;
  boothFee: number;
  sales: number;
  profit: number;
}

export interface CustomOrder {
  id: string;
  customerId: string;
  customerName?: string;
  description: string;
  deposit: number;
  totalPrice: number;
  dueDate: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Delivered';
}

export interface RawMaterial {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string; // e.g., yards, oz, blanks, sheets
  cost: number;
  supplier: string;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Product, 
  Customer, 
  Expense, 
  SalesInvoice, 
  SalesItem, 
  InventoryLog,
  SystemSettings,
  ReturnRecord,
  GiftCard,
  ConsignmentItem,
  CraftEvent,
  CustomOrder,
  RawMaterial
} from './types';

// Drive search helper to find an existing POS file
export async function findPOSSpreadsheet(token: string): Promise<string | null> {
  const query = encodeURIComponent("name = 'MG Creations POS System' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      throw new Error(`Drive search failed: ${await response.text()}`);
    }
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (error) {
    console.error('Error finding spreadsheet in Drive:', error);
    return null;
  }
}

// Create a new POS Spreadsheet with all 17 tabs
export async function createPOSSpreadsheet(token: string, userEmail: string): Promise<string> {
  const body = {
    properties: { title: 'MG Creations POS System' },
    sheets: [
      { properties: { title: 'SETTINGS' } },
      { properties: { title: 'PRODUCTS' } },
      { properties: { title: 'INVENTORY_LOG' } },
      { properties: { title: 'CUSTOMERS' } },
      { properties: { title: 'SALES' } },
      { properties: { title: 'SALES_ITEMS' } },
      { properties: { title: 'PURCHASE_ORDERS' } },
      { properties: { title: 'PURCHASE_ORDER_ITEMS' } },
      { properties: { title: 'EXPENSES' } },
      { properties: { title: 'DASHBOARD' } },
      { properties: { title: 'POS_SCREEN' } },
      { properties: { title: 'RETURNS' } },
      { properties: { title: 'GIFT_CARDS' } },
      { properties: { title: 'CONSIGNMENT' } },
      { properties: { title: 'EVENTS' } },
      { properties: { title: 'CUSTOM_ORDERS' } },
      { properties: { title: 'MATERIALS' } }
    ]
  };

  try {
    const response = await fetch('https://www.googleapis.com/sheets/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Spreadsheet creation failed: ${await response.text()}`);
    }

    const createdSpreadsheet = await response.json();
    const spreadsheetId = createdSpreadsheet.spreadsheetId;

    // Populate sheets with headers
    await populateDefaultHeaders(token, spreadsheetId, userEmail);

    return spreadsheetId;
  } catch (error) {
    console.error('Error creating spreadsheet:', error);
    throw error;
  }
}

// Batch write default header records to all tabs
async function populateDefaultHeaders(token: string, spreadsheetId: string, email: string) {
  const defaultSettings = [
    ['Setting', 'Value'],
    ['Tax Rate', '0.08875'],
    ['Invoice Prefix', 'INV'],
    ['Currency', 'USD'],
    ['Low Stock Threshold', '5'],
    ['Business Name', 'MG Creations'],
    ['Email', email || 'your@email.com'],
    ['Payment Methods', 'Cash, Card, Gift Card, Custom'],
    ['Product Categories', 'Apparel, Mugs, Accessories, Stationery, Home Decor'],
    ['Sales Channels', 'Craft Fair, Website, Etsy, Instagram, Custom Order']
  ];

  const headers = {
    valueInputOption: 'USER_ENTERED',
    data: [
      { range: 'SETTINGS!A1:B10', values: defaultSettings },
      { 
        range: 'PRODUCTS!A1:M1', 
        values: [['Product ID', 'SKU', 'Product Name', 'Category', 'Variant', 'Cost', 'Retail Price', 'Quantity', 'Reorder Level', 'Vendor', 'Barcode', 'Active', 'Image URL']] 
      },
      { 
        range: 'INVENTORY_LOG!A1:I1', 
        values: [['Log ID', 'Date', 'Product ID', 'Type', 'Qty Change', 'Before Qty', 'After Qty', 'Reason', 'User']] 
      },
      { 
        range: 'CUSTOMERS!A1:K1', 
        values: [['Customer ID', 'First Name', 'Last Name', 'Business Name', 'Phone', 'Email', 'Birthday', 'Tags', 'Total Orders', 'Lifetime Value', 'Notes']] 
      },
      { 
        range: 'SALES!A1:K1', 
        values: [['Invoice ID', 'Date', 'Customer ID', 'Subtotal', 'Tax', 'Discount', 'Total', 'Payment Type', 'Sales Channel', 'Status', 'Notes']] 
      },
      { 
        range: 'SALES_ITEMS!A1:G1', 
        values: [['Line ID', 'Invoice ID', 'Product ID', 'Qty', 'Unit Price', 'Discount', 'Total']] 
      },
      { 
        range: 'PURCHASE_ORDERS!A1:F1', 
        values: [['PO ID', 'Vendor', 'Date Ordered', 'Date Received', 'Status', 'Total Cost']] 
      },
      { 
        range: 'PURCHASE_ORDER_ITEMS!A1:E1', 
        values: [['PO Item ID', 'PO ID', 'Product ID', 'Qty', 'Cost']] 
      },
      { 
        range: 'EXPENSES!A1:G1', 
        values: [['Expense ID', 'Date', 'Category', 'Vendor', 'Amount', 'Tax Deductible', 'Notes']] 
      },
      { 
        range: 'DASHBOARD!A1:D3', 
        values: [
          ['MG Creations Business Dashboard', '', '', ''],
          ['Please look at the Web POS application dashboard for real-time visual analytics, profit charts, sales trends and low-stock highlights.', '', '', ''],
          ['For local Sheets reporting, configure Pivot Tables or Slicers on the SALES and EXPENSES tabs.', '', '', '']
        ] 
      },
      { 
        range: 'POS_SCREEN!A1:B4', 
        values: [
          ['Sheets POS Quick Help', ''],
          ['Search & Checkout', 'Please use the connected React Web App POS interface for the most efficient mobile-friendly checkout experience.'],
          ['Automatic Updates', 'All completed sales automatically synchronize and update inventory log rows, reducing manual effort.'],
          ['Local Override', 'Do not manually edit inventory numbers here; use the web dashboard to log adjustment transactions.']
        ] 
      },
      { 
        range: 'RETURNS!A1:E1', 
        values: [['Return ID', 'Invoice ID', 'Date', 'Reason', 'Refund Amount']] 
      },
      { 
        range: 'GIFT_CARDS!A1:F1', 
        values: [['Card ID', 'Code', 'Customer ID', 'Original Balance', 'Current Balance', 'Active']] 
      },
      { 
        range: 'CONSIGNMENT!A1:G1', 
        values: [['Consignment ID', 'Location', 'Product ID', 'Quantity', 'Payout Rate', 'Sold Quantity', 'Status']] 
      },
      { 
        range: 'EVENTS!A1:F1', 
        values: [['Event ID', 'Name', 'Date', 'Booth Fee', 'Sales', 'Profit']] 
      },
      { 
        range: 'CUSTOM_ORDERS!A1:G1', 
        values: [['Order ID', 'Customer ID', 'Description', 'Deposit', 'Total Price', 'Due Date', 'Status']] 
      },
      { 
        range: 'MATERIALS!A1:G1', 
        values: [['Material ID', 'Name', 'Category', 'Quantity', 'Unit', 'Cost', 'Supplier']] 
      }
    ]
  };

  const response = await fetch(`https://www.googleapis.com/sheets/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(headers)
  });

  if (!response.ok) {
    throw new Error(`Failed to write sheet headers: ${await response.text()}`);
  }
}

// Fetch all rows from a spreadsheet
export async function loadSpreadsheetData(token: string, spreadsheetId: string) {
  // We want to load multiple ranges in one call to optimize API rate limits
  const ranges = [
    'SETTINGS!A1:B20',
    'PRODUCTS!A2:M1000',
    'CUSTOMERS!A2:K1000',
    'EXPENSES!A2:G1000',
    'INVENTORY_LOG!A2:I1000',
    'SALES!A2:K1000',
    'SALES_ITEMS!A2:G1000',
    'RETURNS!A2:E1000',
    'GIFT_CARDS!A2:F1000',
    'CONSIGNMENT!A2:G1000',
    'EVENTS!A2:F1000',
    'CUSTOM_ORDERS!A2:G1000',
    'MATERIALS!A2:G1000'
  ];

  const rangesQuery = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');

  try {
    const response = await fetch(`https://www.googleapis.com/sheets/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesQuery}&valueRenderOption=UNFORMATTED_VALUE`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to load sheet data: ${await response.text()}`);
    }

    const data = await response.json();
    const valueRanges = data.valueRanges || [];

    // Parse Settings
    const settingsRows = valueRanges[0]?.values || [];
    const settings: Partial<SystemSettings> = {
      taxRate: 0.08875,
      invoicePrefix: 'INV',
      currency: 'USD',
      lowStockThreshold: 5,
      businessName: 'MG Creations',
      email: '',
      paymentMethods: ['Cash', 'Card', 'Gift Card', 'Custom'],
      productCategories: ['Apparel', 'Mugs', 'Accessories', 'Stationery', 'Home Decor'],
      salesChannels: ['Craft Fair', 'Website', 'Etsy', 'Instagram', 'Custom Order']
    };

    settingsRows.forEach((row: any[]) => {
      const setting = row[0]?.toString();
      const val = row[1];
      if (setting === 'Tax Rate') settings.taxRate = parseFloat(val) || 0.08875;
      else if (setting === 'Invoice Prefix') settings.invoicePrefix = val?.toString() || 'INV';
      else if (setting === 'Currency') settings.currency = val?.toString() || 'USD';
      else if (setting === 'Low Stock Threshold') settings.lowStockThreshold = parseInt(val) || 5;
      else if (setting === 'Business Name') settings.businessName = val?.toString() || 'MG Creations';
      else if (setting === 'Email') settings.email = val?.toString() || '';
      else if (setting === 'Payment Methods') settings.paymentMethods = val?.toString().split(',').map((s: string) => s.trim()) || [];
      else if (setting === 'Product Categories') settings.productCategories = val?.toString().split(',').map((s: string) => s.trim()) || [];
      else if (setting === 'Sales Channels') settings.salesChannels = val?.toString().split(',').map((s: string) => s.trim()) || [];
    });

    // Parse Products
    const products: Product[] = (valueRanges[1]?.values || []).map((row: any[]) => ({
      id: row[0]?.toString() || '',
      sku: row[1]?.toString() || '',
      name: row[2]?.toString() || '',
      category: row[3]?.toString() || '',
      variant: row[4]?.toString() || '',
      cost: parseFloat(row[5]) || 0,
      retailPrice: parseFloat(row[6]) || 0,
      quantity: parseInt(row[7]) || 0,
      reorderLevel: parseInt(row[8]) || 0,
      vendor: row[9]?.toString() || '',
      barcode: row[10]?.toString() || '',
      active: row[11] === true || row[11]?.toString().toLowerCase() === 'true',
      imageUrl: row[12]?.toString() || ''
    }));

    // Parse Customers
    const customers: Customer[] = (valueRanges[2]?.values || []).map((row: any[]) => ({
      id: row[0]?.toString() || '',
      firstName: row[1]?.toString() || '',
      lastName: row[2]?.toString() || '',
      businessName: row[3]?.toString() || '',
      phone: row[4]?.toString() || '',
      email: row[5]?.toString() || '',
      birthday: row[6]?.toString() || '',
      tags: row[7]?.toString().split(',').map((s: string) => s.trim()).filter(Boolean) || [],
      totalOrders: parseInt(row[8]) || 0,
      lifetimeValue: parseFloat(row[9]) || 0,
      notes: row[10]?.toString() || ''
    }));

    // Parse Expenses
    const expenses: Expense[] = (valueRanges[3]?.values || []).map((row: any[]) => ({
      id: row[0]?.toString() || '',
      date: row[1]?.toString() || '',
      category: row[2]?.toString() || '',
      vendor: row[3]?.toString() || '',
      amount: parseFloat(row[4]) || 0,
      taxDeductible: row[5] === true || row[5]?.toString().toLowerCase() === 'true',
      notes: row[6]?.toString() || ''
    }));

    // Parse Logs
    const logs: InventoryLog[] = (valueRanges[4]?.values || []).map((row: any[]) => ({
      id: row[0]?.toString() || '',
      date: row[1]?.toString() || '',
      productId: row[2]?.toString() || '',
      type: row[3] as any,
      qtyChange: parseInt(row[4]) || 0,
      beforeQty: parseInt(row[5]) || 0,
      afterQty: parseInt(row[6]) || 0,
      reason: row[7]?.toString() || '',
      user: row[8]?.toString() || ''
    }));

    // Parse Sales Invoices
    const salesInvoices: SalesInvoice[] = (valueRanges[5]?.values || []).map((row: any[]) => ({
      id: row[0]?.toString() || '',
      date: row[1]?.toString() || '',
      customerId: row[2]?.toString() || '',
      subtotal: parseFloat(row[3]) || 0,
      tax: parseFloat(row[4]) || 0,
      discount: parseFloat(row[5]) || 0,
      total: parseFloat(row[6]) || 0,
      paymentType: row[7]?.toString() || '',
      salesChannel: row[8]?.toString() || '',
      status: row[9] as any,
      notes: row[10]?.toString() || ''
    }));

    // Parse Sales Items
    const salesItems: SalesItem[] = (valueRanges[6]?.values || []).map((row: any[]) => ({
      id: row[0]?.toString() || '',
      invoiceId: row[1]?.toString() || '',
      productId: row[2]?.toString() || '',
      qty: parseInt(row[3]) || 0,
      unitPrice: parseFloat(row[4]) || 0,
      discount: parseFloat(row[5]) || 0,
      total: parseFloat(row[6]) || 0
    }));

    // Parse Extra lists
    const returns: ReturnRecord[] = (valueRanges[7]?.values || []).map((row: any[]) => ({
      id: row[0]?.toString() || '',
      invoiceId: row[1]?.toString() || '',
      date: row[2]?.toString() || '',
      reason: row[3]?.toString() || '',
      refundAmount: parseFloat(row[4]) || 0
    }));

    const giftCards: GiftCard[] = (valueRanges[8]?.values || []).map((row: any[]) => ({
      id: row[0]?.toString() || '',
      code: row[1]?.toString() || '',
      customerId: row[2]?.toString() || '',
      originalBalance: parseFloat(row[3]) || 0,
      currentBalance: parseFloat(row[4]) || 0,
      active: row[5] === true || row[5]?.toString().toLowerCase() === 'true'
    }));

    const consignment: ConsignmentItem[] = (valueRanges[9]?.values || []).map((row: any[]) => ({
      id: row[0]?.toString() || '',
      location: row[1]?.toString() || '',
      productId: row[2]?.toString() || '',
      quantity: parseInt(row[3]) || 0,
      payoutRate: parseFloat(row[4]) || 0,
      soldQuantity: parseInt(row[5]) || 0,
      status: row[6] as any
    }));

    const events: CraftEvent[] = (valueRanges[10]?.values || []).map((row: any[]) => ({
      id: row[0]?.toString() || '',
      name: row[1]?.toString() || '',
      date: row[2]?.toString() || '',
      boothFee: parseFloat(row[3]) || 0,
      sales: parseFloat(row[4]) || 0,
      profit: parseFloat(row[5]) || 0
    }));

    const customOrders: CustomOrder[] = (valueRanges[11]?.values || []).map((row: any[]) => ({
      id: row[0]?.toString() || '',
      customerId: row[1]?.toString() || '',
      description: row[2]?.toString() || '',
      deposit: parseFloat(row[3]) || 0,
      totalPrice: parseFloat(row[4]) || 0,
      dueDate: row[5]?.toString() || '',
      status: row[6] as any
    }));

    const materials: RawMaterial[] = (valueRanges[12]?.values || []).map((row: any[]) => ({
      id: row[0]?.toString() || '',
      name: row[1]?.toString() || '',
      category: row[2]?.toString() || '',
      quantity: parseFloat(row[3]) || 0,
      unit: row[4]?.toString() || '',
      cost: parseFloat(row[5]) || 0,
      supplier: row[6]?.toString() || ''
    }));

    return {
      settings: settings as SystemSettings,
      products,
      customers,
      expenses,
      logs,
      salesInvoices,
      salesItems,
      returns,
      giftCards,
      consignment,
      events,
      customOrders,
      materials
    };
  } catch (error) {
    console.error('Error loading spreadsheet data:', error);
    throw error;
  }
}

// Append a single record to a sheet range
export async function appendToSheet(token: string, spreadsheetId: string, sheetName: string, rowValues: any[]) {
  const range = `${sheetName}!A:A`;
  const body = {
    range,
    majorDimension: 'ROWS',
    values: [rowValues]
  };

  try {
    const response = await fetch(`https://www.googleapis.com/sheets/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Failed to append to ${sheetName}: ${await response.text()}`);
    }
  } catch (error) {
    console.error(`Error appending to ${sheetName}:`, error);
    throw error;
  }
}

// Update specific cells, useful for product quantities or settings changes
export async function updateCell(token: string, spreadsheetId: string, cellRange: string, value: any) {
  const body = {
    range: cellRange,
    values: [[value]]
  };

  try {
    const response = await fetch(`https://www.googleapis.com/sheets/v4/spreadsheets/${spreadsheetId}/values/${cellRange}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Failed to update cell ${cellRange}: ${await response.text()}`);
    }
  } catch (error) {
    console.error(`Error updating cell ${cellRange}:`, error);
    throw error;
  }
}

// Save a completed sale to Google Sheets
export async function saveSaleToSheets(
  token: string, 
  spreadsheetId: string, 
  invoice: SalesInvoice, 
  items: SalesItem[], 
  logs: InventoryLog[],
  productQuantitiesToUpdate: { id: string; rowNum: number; newQty: number }[]
) {
  // 1. Append invoice row
  const invoiceRow = [
    invoice.id,
    invoice.date,
    invoice.customerId,
    invoice.subtotal,
    invoice.tax,
    invoice.discount,
    invoice.total,
    invoice.paymentType,
    invoice.salesChannel,
    invoice.status,
    invoice.notes
  ];

  // 2. Append lines
  const itemRows = items.map(item => [
    item.id,
    item.invoiceId,
    item.productId,
    item.qty,
    item.unitPrice,
    item.discount,
    item.total
  ]);

  // 3. Append inventory logs
  const logRows = logs.map(log => [
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

  const batchData = [
    {
      range: 'SALES!A:A',
      values: [invoiceRow]
    },
    ...itemRows.map(row => ({
      range: 'SALES_ITEMS!A:A',
      values: [row]
    })),
    ...logRows.map(row => ({
      range: 'INVENTORY_LOG!A:A',
      values: [row]
    }))
  ];

  try {
    // Append rows one by one or via multiple appends. Since values.append handles row finding, we can do them.
    await appendToSheet(token, spreadsheetId, 'SALES', invoiceRow);

    for (const itemRow of itemRows) {
      await appendToSheet(token, spreadsheetId, 'SALES_ITEMS', itemRow);
    }

    for (const logRow of logRows) {
      await appendToSheet(token, spreadsheetId, 'INVENTORY_LOG', logRow);
    }

    // 4. Update product quantity cells
    for (const prod of productQuantitiesToUpdate) {
      // rowNum is 2-indexed corresponding to row in products sheet (row 1 is headers, products start on row 2)
      // Column H is Column 8 in PRODUCTS sheet
      await updateCell(token, spreadsheetId, `PRODUCTS!H${prod.rowNum}`, prod.newQty);
    }
  } catch (error) {
    console.error('Error saving sale to sheets:', error);
    throw error;
  }
}

export async function updateProductQuantityInSheet(token: string, spreadsheetId: string, productId: string, newQty: number, rowNum: number) {
  // Column H is Column 8 (Quantity) in PRODUCTS sheet
  await updateCell(token, spreadsheetId, `PRODUCTS!H${rowNum}`, newQty);
}

export async function updateProductInSheet(token: string, spreadsheetId: string, prod: Product, rowNum: number) {
  const range = `PRODUCTS!A${rowNum}:M${rowNum}`;
  const body = {
    range,
    values: [[
      prod.id,
      prod.sku,
      prod.name,
      prod.category,
      prod.variant,
      prod.cost,
      prod.retailPrice,
      prod.quantity,
      prod.reorderLevel,
      prod.vendor,
      prod.barcode,
      prod.active ? 'TRUE' : 'FALSE',
      prod.imageUrl || ''
    ]]
  };

  const response = await fetch(`https://www.googleapis.com/sheets/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Failed to update product row: ${await response.text()}`);
  }
}

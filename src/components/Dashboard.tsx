/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, ShoppingBag, DollarSign, Percent, AlertTriangle, 
  Layers, Truck, Calendar, Sparkles 
} from 'lucide-react';
import { Product, SalesInvoice, SalesItem, Expense, CraftEvent } from '../types';

interface DashboardProps {
  products: Product[];
  salesInvoices: SalesInvoice[];
  salesItems: SalesItem[];
  expenses: Expense[];
  events: CraftEvent[];
  currency: string;
}

export default function Dashboard({ 
  products, 
  salesInvoices, 
  salesItems, 
  expenses, 
  events,
  currency = 'USD' 
}: DashboardProps) {

  // 1. Calculate general financial metrics
  const stats = useMemo(() => {
    const totalSales = salesInvoices
      .filter(inv => inv.status === 'Paid' || inv.status === 'Partial')
      .reduce((sum, inv) => sum + inv.total, 0);

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
    const transactionCount = salesInvoices.length;

    const lowStockItems = products.filter(p => p.active && p.quantity <= p.reorderLevel);

    return {
      totalSales,
      totalExpenses,
      netProfit,
      profitMargin,
      transactionCount,
      lowStockCount: lowStockItems.length,
      lowStockItems
    };
  }, [products, salesInvoices, expenses]);

  // 2. Prepare daily sales chart data
  const salesTrendData = useMemo(() => {
    const dailyMap: { [date: string]: number } = {};
    salesInvoices
      .filter(inv => inv.status === 'Paid' || inv.status === 'Partial')
      .forEach(inv => {
        const dateStr = inv.date ? inv.date.substring(0, 10) : 'Unknown';
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + inv.total;
      });

    const sortedDates = Object.keys(dailyMap).sort();
    // Fallback if empty
    if (sortedDates.length === 0) {
      return [
        { name: 'No Data', Sales: 0 }
      ];
    }

    return sortedDates.map(date => ({
      name: date,
      Sales: parseFloat(dailyMap[date].toFixed(2))
    }));
  }, [salesInvoices]);

  // 3. Sales by Channel Pie Chart
  const channelData = useMemo(() => {
    const channelMap: { [channel: string]: number } = {};
    salesInvoices
      .filter(inv => inv.status === 'Paid' || inv.status === 'Partial')
      .forEach(inv => {
        const channel = inv.salesChannel || 'Direct/Fair';
        channelMap[channel] = (channelMap[channel] || 0) + inv.total;
      });

    return Object.keys(channelMap).map(channel => ({
      name: channel,
      value: parseFloat(channelMap[channel].toFixed(2))
    }));
  }, [salesInvoices]);

  // 4. Sales by Product Category
  const categoryData = useMemo(() => {
    const categoryMap: { [cat: string]: number } = {};
    
    // Map productId to category
    const productCatMap: { [id: string]: string } = {};
    products.forEach(p => {
      productCatMap[p.id] = p.category || 'Uncategorized';
    });

    salesItems.forEach(item => {
      // Find parent invoice to verify it's paid
      const inv = salesInvoices.find(i => i.id === item.invoiceId);
      if (inv && (inv.status === 'Paid' || inv.status === 'Partial')) {
        const cat = productCatMap[item.productId] || 'Uncategorized';
        categoryMap[cat] = (categoryMap[cat] || 0) + item.total;
      }
    });

    return Object.keys(categoryMap).map(cat => ({
      name: cat,
      value: parseFloat(categoryMap[cat].toFixed(2))
    })).sort((a, b) => b.value - a.value);
  }, [products, salesItems, salesInvoices]);

  // 5. Best Selling Products list
  const bestSellers = useMemo(() => {
    const qtyMap: { [prodId: string]: { name: string; qty: number; sales: number } } = {};
    
    salesItems.forEach(item => {
      const inv = salesInvoices.find(i => i.id === item.invoiceId);
      if (inv && (inv.status === 'Paid' || inv.status === 'Partial')) {
        const pId = item.productId;
        const pObj = products.find(p => p.id === pId);
        const name = pObj ? pObj.name : `Product ID: ${pId}`;
        
        if (!qtyMap[pId]) {
          qtyMap[pId] = { name, qty: 0, sales: 0 };
        }
        qtyMap[pId].qty += item.qty;
        qtyMap[pId].sales += item.total;
      }
    });

    return Object.values(qtyMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }, [products, salesItems, salesInvoices]);

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4'];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* KPI Header Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card: Total Sales */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400">Total Sales</p>
            <h3 className="text-2xl font-bold text-gray-800">{formatCurrency(stats.totalSales)}</h3>
            <p className="text-xs text-indigo-500 mt-0.5 font-medium">{stats.transactionCount} Orders Placed</p>
          </div>
        </div>

        {/* Card: Total Expenses */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400">Total Expenses</p>
            <h3 className="text-2xl font-bold text-gray-800">{formatCurrency(stats.totalExpenses)}</h3>
            <p className="text-xs text-rose-500 mt-0.5 font-medium">Booth Fees & Craft Supplies</p>
          </div>
        </div>

        {/* Card: Net Profit */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-center space-x-4">
          <div className={`p-3 rounded-xl ${stats.netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400">Net Profit</p>
            <h3 className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {formatCurrency(stats.netProfit)}
            </h3>
            <p className="text-xs text-emerald-500 mt-0.5 font-medium">Running Margin</p>
          </div>
        </div>

        {/* Card: Margin / Health */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400">Profit Margin</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.profitMargin.toFixed(1)}%</h3>
            <p className="text-xs text-amber-600 mt-0.5 font-medium">
              {stats.lowStockCount > 0 ? `${stats.lowStockCount} Low Stock Alerts!` : 'Stock Levels Healthy'}
            </p>
          </div>
        </div>

      </div>

      {/* Primary Graphs & Data Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Sales Area Chart */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold text-gray-800">Sales Trend over Time</h4>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">Daily Ledger</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), 'Sales']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} 
                />
                <Area type="monotone" dataKey="Sales" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales channels distribution */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="text-base font-bold text-gray-800">Sales Channel Breakdown</h4>
            <p className="text-xs text-gray-400">Where are your customers buying?</p>
          </div>
          {channelData.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No sales records to analyze.</div>
          ) : (
            <div className="h-44 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-gray-400 font-medium">Top Channels</span>
                <span className="text-sm font-bold text-gray-700">{channelData[0]?.name || ''}</span>
              </div>
            </div>
          )}
          <div className="space-y-1">
            {channelData.slice(0, 4).map((entry, idx) => (
              <div key={entry.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-gray-600 font-medium">{entry.name}</span>
                </div>
                <span className="text-gray-800 font-bold">{formatCurrency(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Secondary Row: Category Sales + Best Sellers + Low Stock board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Category Performance */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
          <h4 className="text-base font-bold text-gray-800">Sales by Category</h4>
          {categoryData.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No category metrics logged.</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F9FAFB" />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={10} tickLine={false} width={80} />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Best Sellers */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h4 className="text-base font-bold text-gray-800">Top 5 Best Sellers</h4>
          </div>
          <div className="divide-y divide-gray-100">
            {bestSellers.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">No sales processed yet.</div>
            ) : (
              bestSellers.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-gray-700 truncate max-w-[180px]">{item.name}</p>
                    <p className="text-xs text-gray-400 font-medium">{item.qty} units sold</p>
                  </div>
                  <span className="text-sm font-extrabold text-indigo-600 bg-indigo-50/50 px-2.5 py-1 rounded-lg">
                    {formatCurrency(item.sales)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="text-base font-bold text-gray-800">Low Stock Reorders</h4>
            </div>
            <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
              {stats.lowStockCount} items
            </span>
          </div>
          <div className="overflow-y-auto max-h-[220px] divide-y divide-gray-100 pr-1">
            {stats.lowStockCount === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">All product stock levels are stable!</div>
            ) : (
              stats.lowStockItems.map((prod) => (
                <div key={prod.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-gray-700 truncate max-w-[160px]">{prod.name}</p>
                    <p className="text-xs text-gray-400 font-medium">SKU: {prod.sku} • Variant: {prod.variant}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md inline-block">
                      Qty: {prod.quantity}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Reorder at: {prod.reorderLevel}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Events performance section */}
      {events.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h4 className="text-base font-bold text-gray-800">Craft Fair & Event ROI Tracker</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-medium text-xs">
                  <th className="py-2.5">Event Name</th>
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5 text-right">Booth Fee</th>
                  <th className="py-2.5 text-right">Recorded Sales</th>
                  <th className="py-2.5 text-right">Net Profit</th>
                  <th className="py-2.5 text-right">ROI Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-600">
                {events.map((evt) => {
                  const net = evt.sales - evt.boothFee;
                  const roi = evt.boothFee > 0 ? (net / evt.boothFee) * 100 : 0;
                  return (
                    <tr key={evt.id} className="hover:bg-gray-50/50">
                      <td className="py-3 font-semibold text-gray-700">{evt.name}</td>
                      <td className="py-3 text-xs">{evt.date}</td>
                      <td className="py-3 text-right text-gray-500 font-mono">{formatCurrency(evt.boothFee)}</td>
                      <td className="py-3 text-right text-gray-800 font-semibold font-mono">{formatCurrency(evt.sales)}</td>
                      <td className={`py-3 text-right font-bold font-mono ${net >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {formatCurrency(net)}
                      </td>
                      <td className={`py-3 text-right font-bold text-xs ${roi >= 100 ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {roi.toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

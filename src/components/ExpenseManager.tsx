/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Plus, Search, Layers, DollarSign, Calendar, Tag, Check, X } from 'lucide-react';
import { Expense } from '../types';

interface ExpenseManagerProps {
  expenses: Expense[];
  currency: string;
  onAddExpense: (newExpense: Expense) => Promise<void>;
  isSyncing: boolean;
}

export default function ExpenseManager({
  expenses,
  currency = 'USD',
  onAddExpense,
  isSyncing
}: ExpenseManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [category, setCategory] = useState('Supplies');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [taxDeductible, setTaxDeductible] = useState(true);
  const [notes, setNotes] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(val);
  };

  const categories = ['Supplies', 'Booth Fees', 'Shipping', 'Packaging', 'Marketing', 'Software', 'Others'];

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchSearch = 
        exp.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.notes.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchCat = categoryFilter === 'All' || exp.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [expenses, searchTerm, categoryFilter]);

  const totalSum = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const taxDeductibleSum = useMemo(() => {
    return filteredExpenses.filter(e => e.taxDeductible).reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || !amount) {
      alert('Vendor and Amount are required.');
      return;
    }

    const newExpense: Expense = {
      id: `EXP-${Date.now().toString().slice(-5)}`,
      date,
      category,
      vendor,
      amount: parseFloat(amount) || 0,
      taxDeductible,
      notes
    };

    try {
      await onAddExpense(newExpense);
      setShowForm(false);
      // Reset
      setVendor('');
      setAmount('');
      setNotes('');
      setTaxDeductible(true);
    } catch (err) {
      alert('Error writing expense record to Google Sheets.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* KPI Overlays */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400">Total Expenditures</p>
            <h3 className="text-xl font-extrabold text-gray-800">{formatCurrency(totalSum)}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Sum of all filtered records</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Check className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400">Tax Deductible</p>
            <h3 className="text-xl font-extrabold text-gray-800">{formatCurrency(taxDeductibleSum)}</h3>
            <p className="text-[10px] text-emerald-500 mt-0.5 font-bold">Write-offs for tax season</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400">Total Count</p>
            <h3 className="text-xl font-extrabold text-gray-800">{filteredExpenses.length} Logs</h3>
            <p className="text-[10px] text-indigo-500 mt-0.5 font-bold">Expenses registered in sheets</p>
          </div>
        </div>
      </div>

      {/* Action panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:max-w-xl bg-white p-3 rounded-2xl border border-gray-100 shadow-xs">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search expenses by vendor or notes..."
              className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-700"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="w-full sm:w-44 text-xs py-2 px-3 border border-gray-200 rounded-xl bg-white text-gray-700"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center space-x-2 shrink-0 transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Record Business Expense</span>
        </button>
      </div>

      {/* Expense ledger list */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
        <h4 className="text-sm font-bold text-gray-800 border-b border-gray-50 pb-3 mb-3">Expenses Record List</h4>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                <th className="py-2">Expense ID</th>
                <th className="py-2">Date</th>
                <th className="py-2">Category</th>
                <th className="py-2">Vendor / Recipient</th>
                <th className="py-2 text-right">Amount</th>
                <th className="py-2 text-center">Tax Deductible</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
              {filteredExpenses.map(exp => (
                <tr key={exp.id} className="hover:bg-gray-50/50">
                  <td className="py-3 font-mono text-gray-400">{exp.id}</td>
                  <td className="py-3">{exp.date}</td>
                  <td className="py-3">
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase">
                      {exp.category}
                    </span>
                  </td>
                  <td className="py-3 font-bold text-gray-800">{exp.vendor}</td>
                  <td className="py-3 text-right font-extrabold text-indigo-600 font-mono">{formatCurrency(exp.amount)}</td>
                  <td className="py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${exp.taxDeductible ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                      {exp.taxDeductible ? 'Deductible' : 'No write-off'}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500 italic truncate max-w-[200px]">{exp.notes || '—'}</td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr className="border-b border-gray-100">
                  <td colSpan={7} className="py-14 text-center text-gray-400 text-sm">
                    No expenditures logged in current spreadsheet list.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD EXPENSE MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4">
            <h4 className="text-lg font-bold text-gray-800">Record Outgoing Expense</h4>
            
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-medium text-gray-500">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-gray-500">Expense Date</label>
                  <input
                    type="date"
                    required
                    className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-500">Category</label>
                  <select
                    className="w-full text-xs py-2 border border-gray-200 rounded-xl bg-white px-2"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-500">Vendor / Supplier / Paid To *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Etsy Ads, Amazon Blanks, Fair Booth Fee"
                  className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                  value={vendor}
                  onChange={e => setVendor(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-500">Transaction Amount ({currency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-500">Expenditure Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Bought 20 custom packaging boxes"
                  className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-3 pt-1">
                <input
                  type="checkbox"
                  id="deductible"
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                  checked={taxDeductible}
                  onChange={e => setTaxDeductible(e.target.checked)}
                />
                <label htmlFor="deductible" className="font-bold text-gray-700">Tax Deductible Expense (Write-off)</label>
              </div>

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
                  {isSyncing ? 'Syncing...' : 'Record Expense'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

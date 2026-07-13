/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Search, Plus, User, Tag, Mail, Phone, Calendar, DollarSign, Award } from 'lucide-react';
import { Customer } from '../types';

interface CustomerManagerProps {
  customers: Customer[];
  currency: string;
  onAddCustomer: (newCustomer: Customer) => Promise<void>;
  isSyncing: boolean;
}

export default function CustomerManager({
  customers,
  currency = 'USD',
  onAddCustomer,
  isSyncing
}: CustomerManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [tagsInput, setTagsInput] = useState('Etsy Customer');
  const [notes, setNotes] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(val);
  };

  const allTags = useMemo(() => {
    const set = new Set<string>();
    customers.forEach(c => {
      if (Array.isArray(c.tags)) {
        c.tags.forEach(t => set.add(t));
      }
    });
    return ['All', ...Array.from(set)];
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchSearch = 
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchTag = selectedTag === 'All' || c.tags.includes(selectedTag);
      return matchSearch && matchTag;
    });
  }, [customers, searchTerm, selectedTag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) {
      alert('First Name and Last Name are required.');
      return;
    }

    const newCust: Customer = {
      id: (customers.length + 1).toString(),
      firstName,
      lastName,
      businessName,
      phone,
      email,
      birthday,
      tags: tagsInput.split(',').map(s => s.trim()).filter(Boolean),
      totalOrders: 0,
      lifetimeValue: 0,
      notes
    };

    try {
      await onAddCustomer(newCust);
      setShowAddForm(false);
      // Reset
      setFirstName('');
      setLastName('');
      setBusinessName('');
      setPhone('');
      setEmail('');
      setBirthday('');
      setTagsInput('Etsy Customer');
      setNotes('');
    } catch (err) {
      alert('Error creating customer record in spreadsheet.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Add button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Search controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:max-w-xl bg-white p-3 rounded-2xl border border-gray-100 shadow-xs">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers by name, company, email..."
              className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-700"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="w-full sm:w-44 text-xs py-2 px-3 border border-gray-200 rounded-xl bg-white text-gray-700"
            value={selectedTag}
            onChange={e => setSelectedTag(e.target.value)}
          >
            <option value="All">All Customer Tags</option>
            {allTags.filter(t => t !== 'All').map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center space-x-2 shrink-0 transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Customer</span>
        </button>

      </div>

      {/* Main Customers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCustomers.map(cust => (
          <div 
            key={cust.id} 
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all relative overflow-hidden"
          >
            {cust.lifetimeValue >= 200 && (
              <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center space-x-1">
                <Award className="w-3 h-3" />
                <span>VIP</span>
              </div>
            )}

            <div className="space-y-2.5">
              {/* Profile initial row */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold text-sm">
                  {cust.firstName.charAt(0)}{cust.lastName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm leading-tight">{cust.firstName} {cust.lastName}</h4>
                  <p className="text-xs text-gray-400">{cust.businessName || 'Individual Customer'}</p>
                </div>
              </div>

              {/* Contact options */}
              <div className="space-y-1 text-xs text-gray-500">
                {cust.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{cust.email}</span>
                  </div>
                )}
                {cust.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{cust.phone}</span>
                  </div>
                )}
                {cust.birthday && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>Birthday: {cust.birthday}</span>
                  </div>
                )}
              </div>

              {/* Tags and LTV indicators */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {cust.tags.map(tag => (
                  <span key={tag} className="text-[10px] bg-gray-50 text-gray-500 border border-gray-100 font-bold px-2 py-0.5 rounded-md">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-xs font-semibold text-gray-500">
              <div className="space-y-0.5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Total Orders</p>
                <p className="text-gray-700 font-bold">{cust.totalOrders} Purchases</p>
              </div>
              <div className="text-right space-y-0.5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">LTV / Revenue</p>
                <p className="text-indigo-600 font-extrabold font-mono">{formatCurrency(cust.lifetimeValue)}</p>
              </div>
            </div>

            {cust.notes && (
              <div className="bg-gray-50 rounded-xl p-2.5 text-[11px] text-gray-500 leading-tight italic">
                Notes: {cust.notes}
              </div>
            )}
          </div>
        ))}
        
        {filteredCustomers.length === 0 && (
          <div className="col-span-full bg-white border border-gray-100 rounded-2xl py-14 text-center text-gray-400 text-sm">
            No customers match your filters.
          </div>
        )}
      </div>

      {/* REGISTER NEW CUSTOMER MODAL */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4">
            <h4 className="text-lg font-bold text-gray-800">Register Customer Profile</h4>
            
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-medium text-gray-500">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-gray-500">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John"
                    className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-500">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Doe"
                    className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-500">Business / Organization Name</label>
                <input
                  type="text"
                  placeholder="e.g. Craft Supplies Wholesale"
                  className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-gray-500">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. user@email.com"
                    className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-500">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. (555) 123-4567"
                    className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-gray-500">Birthday (Month/Day)</label>
                  <input
                    type="text"
                    placeholder="e.g. Oct 24"
                    className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                    value={birthday}
                    onChange={e => setBirthday(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-500">Customer Tags (comma separated)</label>
                  <input
                    type="text"
                    placeholder="VIP, Etsy, Wholesale"
                    className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                    value={tagsInput}
                    onChange={e => setTagsInput(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-500">Internal Notes / Preferences</label>
                <textarea
                  placeholder="Prefers rainbow glitters, wholesale requests, custom mugs..."
                  rows={2}
                  className="w-full text-xs py-2 border border-gray-200 rounded-xl px-3 text-gray-800"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-gray-400 font-bold px-3 py-2 hover:bg-gray-50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl"
                >
                  {isSyncing ? 'Writing Sheet...' : 'Register Profile'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

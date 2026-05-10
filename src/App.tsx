/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  db, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  doc,
  handleFirestoreError
} from './firebase';
import { Winner, OperationType } from './types';
import { MONTHS } from './constants';
import Login from './components/Login';
import WinnerForm from './components/WinnerForm';
import { 
  Search, 
  Plus, 
  LogOut, 
  Trophy, 
  Trash2, 
  Edit2, 
  Calendar, 
  User,
  LayoutGrid,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWinner, setEditingWinner] = useState<Winner | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'winners'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Winner[];
      setWinners(data);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'winners');
    });

    return () => unsubscribe();
  }, []);

  const handleAddWinner = async (data: Partial<Winner>) => {
    try {
      await addDoc(collection(db, 'winners'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setIsFormOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'winners');
    }
  };

  const handleUpdateWinner = async (data: Partial<Winner>) => {
    if (!editingWinner?.id) return;
    try {
      await updateDoc(doc(db, 'winners', editingWinner.id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      setEditingWinner(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `winners/${editingWinner.id}`);
    }
  };

  const handleDeleteWinner = async (id: string) => {
    if (!confirm('Are you sure you want to delete this winner?')) return;
    try {
      await deleteDoc(doc(db, 'winners', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `winners/${id}`);
    }
  };

  const filteredWinners = useMemo(() => {
    const filtered = winners.filter(w => 
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.month.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.year.toString().includes(searchTerm)
    );

    return filtered.sort((a, b) => {
      // Primary: Year (desc)
      if (b.year !== a.year) return b.year - a.year;
      
      // Secondary: Month (desc)
      const monthIndexA = MONTHS.indexOf(a.month);
      const monthIndexB = MONTHS.indexOf(b.month);
      if (monthIndexB !== monthIndexA) return monthIndexB - monthIndexA;
      
      // Tertiary: Day (desc)
      return b.day - a.day;
    });
  }, [winners, searchTerm]);

  if (!isLoggedIn) {
    return <Login onLogin={setIsLoggedIn} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header Navigation */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold italic">T</div>
          <span className="text-lg font-bold text-slate-800 tracking-tight">Tanghaga Winners</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Logged in as <strong className="text-slate-700">admin</strong>
          </div>
          <button
            onClick={() => setIsLoggedIn(false)}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-8 gap-6 max-w-7xl mx-auto w-full">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end shrink-0 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Weekly Winner Database</h1>
            <p className="text-slate-500 text-sm">Manage and edit official weekly winners</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <button
              onClick={() => setIsFormOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New Winner
            </button>
          </div>
        </div>

        {/* Data Table Container */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Syncing Database...</p>
            </div>
          ) : filteredWinners.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
              <Trophy className="w-12 h-12 text-slate-200 mb-4" />
              <h3 className="text-slate-900 font-bold">No Records Found</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-xs">Adjust your search parameters or start by registering a new winner entry.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Day</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Month</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Year</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 italic-hover">
                  <AnimatePresence>
                    {filteredWinners.map((winner) => (
                      <motion.tr
                        key={winner.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="px-6 py-4 font-semibold text-slate-800 text-sm">{winner.name}</td>
                        <td className="px-6 py-4 text-slate-600 text-sm">{winner.day}</td>
                        <td className="px-6 py-4 text-slate-600 text-sm">{winner.month}</td>
                        <td className="px-6 py-4 text-slate-600 text-sm">{winner.year}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingWinner(winner)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-bold uppercase tracking-wider"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => winner.id && handleDeleteWinner(winner.id)}
                              className="text-rose-600 hover:text-rose-800 text-xs font-bold uppercase tracking-wider"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
          
          {/* Footer Status */}
          <div className="mt-auto border-t border-slate-100 bg-slate-50 px-6 py-3 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <div>
              {filteredWinners.length} of {winners.length} entries displayed
            </div>
            <div className="flex gap-2 items-center">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
              Live Database Sync Active
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Branding Bar */}
      <footer className="h-8 bg-slate-800 text-[10px] text-slate-400 uppercase tracking-widest flex items-center px-8 shrink-0">
        Tanghaga Winners Portal v2.4.0 — Security Tier: High
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {isFormOpen && (
          <WinnerForm
            onClose={() => setIsFormOpen(false)}
            onSubmit={handleAddWinner}
          />
        )}
        {editingWinner && (
          <WinnerForm
            winner={editingWinner}
            onClose={() => setEditingWinner(null)}
            onSubmit={handleUpdateWinner}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { Winner } from '../types';
import { MONTHS } from '../constants';
import { X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WinnerFormProps {
  winner?: Winner | null;
  existingWinners?: Winner[];
  onSubmit: (data: Partial<Winner>) => Promise<void>;
  onClose: () => void;
}

export default function WinnerForm({ winner, existingWinners = [], onSubmit, onClose }: WinnerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Winner>>({
    name: '',
    day: new Date().getDate(),
    month: MONTHS[new Date().getMonth()],
    year: new Date().getFullYear(),
    isNoWinner: false,
  });

  useEffect(() => {
    if (winner) {
      setFormData({
        name: winner.name,
        day: winner.day,
        month: winner.month,
        year: winner.year,
        isNoWinner: winner.isNoWinner || false,
      });
    }
  }, [winner]);

  const getMaxDays = (monthName: string, year: number) => {
    const monthIndex = MONTHS.indexOf(monthName);
    if (monthIndex === -1) return 31;
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  const isValidDate = (day: number | undefined, monthName: string | undefined, year: number | undefined) => {
    if (!day || !monthName || !year) return true;
    const monthIndex = MONTHS.indexOf(monthName);
    if (monthIndex === -1) return false;
    const date = new Date(year, monthIndex, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === monthIndex &&
      date.getDate() === day
    );
  };

  useEffect(() => {
    if (formData.day && formData.month && formData.year) {
      const max = getMaxDays(formData.month, formData.year);
      if (formData.day > max) {
        setFormData(prev => ({ ...prev, day: max }));
      }
    }
    setFormError(null);
  }, [formData.month, formData.year]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final safety validation
    if (!isValidDate(formData.day, formData.month, formData.year)) {
      setFormError(`The date ${formData.month} ${formData.day}, ${formData.year} is not valid.`);
      return;
    }
    setFormError(null);

    // If editing, check if any changes were actually made
    if (winner) {
      const isUnchanged =
        formData.name === winner.name &&
        formData.day === winner.day &&
        formData.month === winner.month &&
        formData.year === winner.year &&
        (formData.isNoWinner || false) === (winner.isNoWinner || false);

      if (isUnchanged) {
        onClose();
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Check for duplicates
      const isDuplicate = existingWinners.some(w => 
        w.id !== winner?.id && // Exclude current winner if editing
        w.name.toLowerCase() === (formData.name || '').toLowerCase() &&
        w.day === formData.day &&
        w.month === formData.month &&
        w.year === formData.year
      );

      if (isDuplicate) {
        setFormError('User already exists');
        setIsSubmitting(false);
        return;
      }

      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full" />
            {winner ? 'Update Winner Entry' : 'Register New Winner'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <input
              type="checkbox"
              id="no-winner-checkbox"
              checked={formData.isNoWinner}
              onChange={(e) => {
                const checked = e.target.checked;
                setFormData({ 
                  ...formData, 
                  isNoWinner: checked,
                  name: checked ? 'No Winner' : (winner?.name || '')
                });
              }}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="no-winner-checkbox" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
              No Winner for this week
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Full Legal Name
            </label>
            <input
              type="text"
              required={!formData.isNoWinner}
              disabled={formData.isNoWinner}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm ${formData.isNoWinner ? 'bg-slate-50 text-slate-400 border-slate-100 italic' : ''}`}
              placeholder={formData.isNoWinner ? 'No winner assigned' : 'e.g. Jonathan Aris'}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Day
              </label>
              <input
                type="number"
                min="1"
                max={formData.month && formData.year ? getMaxDays(formData.month, formData.year) : 31}
                required
                value={formData.day}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setFormError(null);
                  if (isNaN(val)) {
                    setFormData({ ...formData, day: undefined });
                  } else {
                    setFormData({ ...formData, day: val });
                  }
                }}
                onBlur={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) {
                    const max = formData.month && formData.year ? getMaxDays(formData.month, formData.year) : 31;
                    const clamped = Math.min(Math.max(1, val), max);
                    setFormData({ ...formData, day: clamped });
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Month
              </label>
              <select
                required
                value={formData.month}
                onChange={(e) => {
                  setFormError(null);
                  setFormData({ ...formData, month: e.target.value });
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
              >
                {MONTHS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              YEAR
            </label>
            <input
              type="number"
              required
              value={formData.year}
              onChange={(e) => {
                setFormError(null);
                setFormData({ ...formData, year: parseInt(e.target.value) });
              }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
            />
          </div>

          <AnimatePresence>
            {formError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-rose-50 border border-rose-100 rounded-lg p-3 flex items-center gap-3 text-rose-600 overflow-hidden"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-xs font-semibold">{formError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-semibold"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-bold shadow-md text-sm flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                winner ? 'Save Changes' : 'Confirm Entry'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

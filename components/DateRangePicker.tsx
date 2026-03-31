'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function DateRangePicker() {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 2, 1));

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const startDay = firstDay === 0 ? 6 : firstDay - 1; // Mon-Sun

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (!startDate || (startDate && endDate)) {
      setStartDate(clickedDate);
      setEndDate(null);
    } else {
      if (clickedDate < startDate) {
        setStartDate(clickedDate);
      } else {
        setEndDate(clickedDate);
        setTimeout(() => setIsOpen(false), 300);
      }
    }
  };

  const isSelected = (day: number) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).getTime();
    const s = startDate?.getTime();
    const e = endDate?.getTime();
    if (s === d || e === d) return true;
    return false;
  };

  const isInRange = (day: number) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).getTime();
    const s = startDate?.getTime();
    const e = endDate?.getTime();
    if (s && e && d > s && d < e) return true;
    return false;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="relative w-full">
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${isOpen ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-500'}`}
      >
        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
          <CalendarIcon className="w-5 h-5" />
        </div>
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between font-bold text-slate-700 dark:text-slate-300 gap-1 sm:gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">Start Date</span>
            <span className={startDate ? 'text-purple-700 dark:text-purple-400 text-sm sm:text-base' : 'text-sm sm:text-base'}>{formatDate(startDate)}</span>
          </div>
          <div className="hidden sm:block text-slate-300 dark:text-slate-600">→</div>
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">End Date</span>
            <span className={endDate ? 'text-purple-700 dark:text-purple-400 text-sm sm:text-base' : 'text-sm sm:text-base'}>{formatDate(endDate)}</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 bg-white dark:bg-slate-900 rounded-[2rem] p-4 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-800"
          >
            <div className="flex justify-between items-center mb-6">
              <button 
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-black text-slate-800 dark:text-slate-100 text-base sm:text-lg">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button 
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                <div key={d} className="text-center text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1 sm:gap-y-2">
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-8 sm:h-10" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const selected = isSelected(day);
                const inRange = isInRange(day);
                
                return (
                  <div key={day} className="relative flex justify-center items-center h-8 sm:h-10">
                    {inRange && <div className="absolute inset-0 bg-purple-50 dark:bg-purple-900/20" />}
                    {selected && startDate && endDate && day === startDate.getDate() && <div className="absolute right-0 w-1/2 h-full bg-purple-50 dark:bg-purple-900/20" />}
                    {selected && startDate && endDate && day === endDate.getDate() && <div className="absolute left-0 w-1/2 h-full bg-purple-50 dark:bg-purple-900/20" />}
                    
                    <button
                      onClick={() => handleDateClick(day)}
                      className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all z-10 ${
                        selected 
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-500/40 scale-110' 
                          : inRange 
                            ? 'text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40' 
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {day}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

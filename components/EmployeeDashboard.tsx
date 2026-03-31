'use client';

import { Tab } from '@/app/page';
import { motion, AnimatePresence } from 'motion/react';
import { Plane, HeartPulse, Coffee, Plus, Calendar as CalendarIcon, Clock, X, Check, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import TeamCalendar from './TeamCalendar';
import DateRangePicker from './DateRangePicker';
import mockData from '@/data/mockData.json';

interface EmployeeDashboardProps {
  activeTab: Tab;
}

const parseDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDateRange = (startStr: string, endStr: string) => {
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  const startMonth = start.toLocaleString('default', { month: 'short' });
  const endMonth = end.toLocaleString('default', { month: 'short' });
  
  if (startStr === endStr) {
    return `${startMonth} ${start.getDate().toString().padStart(2, '0')}, ${start.getFullYear()}`;
  }
  
  if (start.getFullYear() === end.getFullYear()) {
    return `${startMonth} ${start.getDate().toString().padStart(2, '0')} - ${endMonth} ${end.getDate().toString().padStart(2, '0')}, ${start.getFullYear()}`;
  }
  
  return `${startMonth} ${start.getDate().toString().padStart(2, '0')}, ${start.getFullYear()} - ${endMonth} ${end.getDate().toString().padStart(2, '0')}, ${end.getFullYear()}`;
};

export default function EmployeeDashboard({ activeTab }: EmployeeDashboardProps) {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  
  const { currentUser } = mockData;
  const userRequests = mockData.leaveRequests.filter(req => req.userId === currentUser.id);

  if (activeTab === 'Dashboard') {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header & Floating Action */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Good morning, {currentUser.name.split(' ')[0]}! ☀️</h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium mt-1">Here&apos;s your time off at a glance.</p>
          </div>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-full overflow-hidden shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full -translate-x-full transition-transform duration-500 ease-out skew-x-12" />
            <Plus className="w-6 h-6" />
            <span className="text-lg">Request Time Off</span>
          </button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BalanceCard
            title="Annual Leave"
            icon={Plane}
            used={currentUser.balances.annual.used}
            total={currentUser.balances.annual.total}
            colorClass={{ bg: 'bg-purple-100', text: 'text-purple-600' }}
            gradientClass="from-purple-500 to-indigo-500"
          />
          <BalanceCard
            title="Sick Leave"
            icon={HeartPulse}
            used={currentUser.balances.sick.used}
            total={currentUser.balances.sick.total}
            colorClass={{ bg: 'bg-pink-100', text: 'text-pink-600' }}
            gradientClass="from-pink-500 to-rose-500"
          />
          <BalanceCard
            title="Personal Days"
            icon={Coffee}
            used={currentUser.balances.personal.used}
            total={currentUser.balances.personal.total}
            colorClass={{ bg: 'bg-amber-100', text: 'text-amber-600' }}
            gradientClass="from-amber-400 to-orange-500"
          />
        </div>

        {/* Leave History */}
        <div className="bg-white dark:bg-slate-900/50 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Recent Requests</h2>
            <button className="text-purple-600 dark:text-purple-400 font-bold hover:text-purple-700 dark:hover:text-purple-300 hover:underline underline-offset-4">View All</button>
          </div>
          <div className="space-y-4">
            {userRequests.map(req => (
              <HistoryItem
                key={req.id}
                type={req.type}
                date={formatDateRange(req.startDate, req.endDate)}
                days={req.days}
                status={req.status}
              />
            ))}
            {userRequests.length === 0 && (
              <p className="text-slate-500 dark:text-slate-400 text-sm italic">No recent requests.</p>
            )}
          </div>
        </div>

        {/* Request Modal Wizard */}
        <RequestModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} />
      </div>
    );
  }

  if (activeTab === 'Team Calendar') {
    return <TeamCalendar title="Team Calendar" />;
  }

  return null;
}

function BalanceCard({ title, icon: Icon, used, total, colorClass, gradientClass }: any) {
  const percentage = (used / total) * 100;
  
  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradientClass} opacity-5 dark:opacity-10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity`} />
      
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-14 h-14 rounded-2xl ${colorClass.bg} dark:bg-opacity-20 flex items-center justify-center ${colorClass.text} dark:text-opacity-90`}>
          <Icon className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          <p className="text-slate-500 dark:text-slate-400 font-semibold">{total - used} days available</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm font-bold">
          <span className="text-slate-700 dark:text-slate-300">{used} used</span>
          <span className="text-slate-400 dark:text-slate-500">{total} total</span>
        </div>
        <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full bg-gradient-to-r ${gradientClass} rounded-full`}
          />
        </div>
      </div>
    </div>
  );
}

function HistoryItem({ type, date, days, status }: any) {
  const statusConfig = {
    Approved: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: Check },
    Pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', icon: Clock },
    Rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: X },
  };
  
  const config = statusConfig[status as keyof typeof statusConfig];
  const StatusIcon = config.icon;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-2xl border-2 border-slate-50 dark:border-slate-800/50 hover:border-slate-100 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group gap-4 sm:gap-0">
      <div className="flex items-center gap-4 sm:gap-5">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full ${config.bg} flex items-center justify-center`}>
          <StatusIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${config.text}`} />
        </div>
        <div>
          <h4 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">{type}</h4>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-slate-500 dark:text-slate-400 font-medium mt-0.5 sm:mt-1 text-xs sm:text-sm">
            <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>{date}</span>
            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mx-1" />
            <span>{days} {days === 1 ? 'day' : 'days'}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-14 sm:pl-0">
        <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold ${config.bg} ${config.text}`}>
          {status}
        </span>
        {status === 'Pending' && (
          <button className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors sm:opacity-0 group-hover:opacity-100 sm:-ml-2">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function RequestModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl z-50 hide-scrollbar border border-slate-100 dark:border-slate-800"
          >
            {/* Wizard Header */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-purple-600' : i < step ? 'w-4 bg-purple-300 dark:bg-purple-900/50' : 'w-4 bg-slate-100 dark:bg-slate-800'}`} />
                ))}
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Wizard Content */}
            <div className="min-h-[200px]">
              {step === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-2">What type of leave?</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">Select the category for your time off.</p>
                  <div className="grid grid-cols-2 gap-4">
                    {['Annual Leave', 'Sick Leave', 'Personal', 'Unpaid'].map((type) => (
                      <button key={type} onClick={() => setStep(2)} className="p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-purple-600 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-left transition-all group">
                        <span className="block font-bold text-slate-700 dark:text-slate-300 group-hover:text-purple-700 dark:group-hover:text-purple-400">{type}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
              {step === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-2">When are you off?</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">Pick your start and end dates.</p>
                  <div className="space-y-4">
                    <DateRangePicker />
                    <button onClick={() => setStep(3)} className="w-full py-4 rounded-full bg-purple-600 text-white font-bold text-lg hover:bg-purple-700 transition-colors mt-4">
                      Continue
                    </button>
                  </div>
                </motion.div>
              )}
              {step === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-2">Any notes?</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">Add a message for your manager (optional).</p>
                  <textarea 
                    rows={4} 
                    placeholder="I'll be traveling with family..."
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 focus:border-purple-500 dark:focus:border-purple-500 focus:ring-0 font-medium text-slate-700 dark:text-slate-300 outline-none resize-none mb-6 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                  <div className="flex gap-4">
                    <button onClick={() => setStep(2)} className="px-6 py-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      Back
                    </button>
                    <button onClick={() => {
                      // Submit logic here
                      onClose();
                      setTimeout(() => setStep(1), 300);
                    }} className="flex-1 py-4 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg hover:shadow-lg hover:shadow-purple-500/30 transition-all">
                      Submit Request
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

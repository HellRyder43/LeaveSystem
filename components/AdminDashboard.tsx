'use client';

type Tab = 'Dashboard' | 'Team Calendar' | 'Approvals' | 'Settings';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Calendar as CalendarIcon, FileText, Plus, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { useState } from 'react';

interface AdminDashboardProps {
  activeTab: Tab;
}

export default function AdminDashboard({ activeTab }: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState<'Holidays' | 'Policies' | 'Reports'>('Holidays');
  const [isAddHolidayOpen, setIsAddHolidayOpen] = useState(false);

  if (activeTab === 'Dashboard' || activeTab === 'Settings') {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">System Configuration</h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium mt-1">Manage company holidays, policies, and reports.</p>
          </div>
        </div>

        {/* Configuration Navigation */}
        <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
          <ConfigNavButton
            title="Holidays"
            icon={CalendarIcon}
            isActive={activeSection === 'Holidays'}
            onClick={() => setActiveSection('Holidays')}
            colorClass={{ bg: 'bg-purple-600 dark:bg-purple-500', text: 'text-purple-500 dark:text-purple-400', shadow: 'shadow-purple-500/30' }}
          />
          <ConfigNavButton
            title="Policies"
            icon={Settings}
            isActive={activeSection === 'Policies'}
            onClick={() => setActiveSection('Policies')}
            colorClass={{ bg: 'bg-blue-600 dark:bg-blue-500', text: 'text-blue-500 dark:text-blue-400', shadow: 'shadow-blue-500/30' }}
          />
          <ConfigNavButton
            title="Reports"
            icon={FileText}
            isActive={activeSection === 'Reports'}
            onClick={() => setActiveSection('Reports')}
            colorClass={{ bg: 'bg-pink-600 dark:bg-pink-500', text: 'text-pink-500 dark:text-pink-400', shadow: 'shadow-pink-500/30' }}
          />
        </div>

        {/* Section Content */}
        <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 min-h-[500px]">
          {activeSection === 'Holidays' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Company Holidays 2026</h2>
                <button
                  onClick={() => setIsAddHolidayOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full font-bold hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Holiday
                </button>
              </div>
              
              <div className="space-y-3">
                <HolidayItem name="New Year's Day" date="Jan 1, 2026" day="Thursday" />
                <HolidayItem name="Company Retreat" date="Mar 15, 2026" day="Monday" />
                <HolidayItem name="Summer Bank Holiday" date="Aug 31, 2026" day="Monday" />
                <HolidayItem name="Christmas Day" date="Dec 25, 2026" day="Friday" />
              </div>
            </motion.div>
          )}

          {activeSection === 'Policies' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Leave Policies</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PolicyCard
                  title="Carry-Forward Rules"
                  description="Allow employees to carry forward unused annual leave to the next year."
                  enabled={true}
                />
                <PolicyCard
                  title="Auto-Approve Sick Leave"
                  description="Automatically approve sick leave requests under 2 days."
                  enabled={false}
                />
                <PolicyCard
                  title="Half-Day Requests"
                  description="Allow employees to request half-day leaves."
                  enabled={true}
                />
                <PolicyCard
                  title="Negative Balance"
                  description="Allow leave balances to go negative."
                  enabled={false}
                />
              </div>

              <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Company Quotas</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Default Annual Leave</span>
                    <div className="flex items-center gap-2">
                      <input type="number" defaultValue={20} className="w-20 p-2 text-center font-bold bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-500 outline-none text-slate-800 dark:text-slate-200" />
                      <span className="text-slate-500 dark:text-slate-400 font-medium">days</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Default Sick Leave</span>
                    <div className="flex items-center gap-2">
                      <input type="number" defaultValue={10} className="w-20 p-2 text-center font-bold bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-500 outline-none text-slate-800 dark:text-slate-200" />
                      <span className="text-slate-500 dark:text-slate-400 font-medium">days</span>
                    </div>
                  </div>
                </div>
                <button className="mt-6 w-full py-4 rounded-full bg-slate-800 dark:bg-slate-700 text-white font-bold text-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors">
                  Save Quotas
                </button>
              </div>
            </motion.div>
          )}

          {activeSection === 'Reports' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center h-[400px] text-center">
              <div className="w-24 h-24 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-pink-500 dark:text-pink-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Reports Dashboard</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md">Generate detailed reports on leave utilization, balances, and trends across the company.</p>
              <button className="mt-8 px-8 py-4 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold shadow-lg shadow-pink-500/30 hover:-translate-y-1 transition-transform">
                Generate New Report
              </button>
            </motion.div>
          )}
        </div>

        {/* Add Holiday Modal */}
        <AnimatePresence>
          {isAddHolidayOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddHolidayOpen(false)}
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl z-50 border border-slate-100 dark:border-slate-800"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Add Holiday</h2>
                  <button onClick={() => setIsAddHolidayOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">Holiday Name</label>
                    <input type="text" placeholder="e.g. Thanksgiving" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 focus:border-purple-500 dark:focus:border-purple-500 focus:ring-0 font-bold text-slate-700 dark:text-slate-200 outline-none placeholder-slate-400 dark:placeholder-slate-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">Date</label>
                    <input type="date" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 focus:border-purple-500 dark:focus:border-purple-500 focus:ring-0 font-bold text-slate-700 dark:text-slate-200 outline-none" />
                  </div>
                  <button onClick={() => setIsAddHolidayOpen(false)} className="w-full py-4 rounded-full bg-purple-600 dark:bg-purple-500 text-white font-bold text-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors mt-4">
                    Save Holiday
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return null;
}

function ConfigNavButton({ title, icon: Icon, isActive, onClick, colorClass }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all duration-300 min-w-max ${
        isActive 
          ? `${colorClass.bg} text-white shadow-lg ${colorClass.shadow}` 
          : 'bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border-2 border-slate-100 dark:border-slate-800'
      }`}
    >
      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : colorClass.text}`} />
      {title}
    </button>
  );
}

function HolidayItem({ name, date, day }: any) {
  return (
    <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-purple-200 dark:hover:border-purple-500/50 transition-colors group">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex flex-col items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 group-hover:border-purple-200 dark:group-hover:border-purple-500/50">
          <span className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase">{date.split(' ')[0]}</span>
          <span className="text-lg font-black text-slate-800 dark:text-slate-200 leading-none">{date.split(' ')[1].replace(',', '')}</span>
        </div>
        <div>
          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">{name}</h4>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{day}</p>
        </div>
      </div>
      <button className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

function PolicyCard({ title, description, enabled: initialEnabled }: any) {
  const [enabled, setEnabled] = useState(initialEnabled);
  
  return (
    <div className="p-6 bg-white dark:bg-slate-800/50 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 flex flex-col justify-between h-full hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{description}</p>
      </div>
      <div className="flex items-center justify-between mt-auto">
        <span className={`font-bold text-sm ${enabled ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>
          {enabled ? 'Enabled' : 'Disabled'}
        </span>
        <button 
          onClick={() => setEnabled(!enabled)}
          className={`transition-colors duration-300 ${enabled ? 'text-green-500 dark:text-green-400' : 'text-slate-300 dark:text-slate-600'}`}
        >
          {enabled ? <ToggleRight className="w-12 h-12" /> : <ToggleLeft className="w-12 h-12" />}
        </button>
      </div>
    </div>
  );
}

'use client';

import { Tab } from '@/app/page';
import { motion } from 'motion/react';
import { Check, X, Calendar as CalendarIcon, MessageSquare, Clock } from 'lucide-react';
import Image from 'next/image';
import TeamCalendar from './TeamCalendar';
import mockData from '@/data/mockData.json';

interface ManagerDashboardProps {
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

export default function ManagerDashboard({ activeTab }: ManagerDashboardProps) {
  const pendingRequests = mockData.leaveRequests.filter(req => req.status === 'Pending');

  if (activeTab === 'Dashboard' || activeTab === 'Approvals') {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Pending Approvals</h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium mt-1">You have {pendingRequests.length} requests requiring your attention.</p>
          </div>
        </div>

        {/* Masonry Grid for Approvals */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingRequests.map(req => (
            <ApprovalCard
              key={req.id}
              name={req.memberName}
              avatar={req.avatar}
              type={req.type}
              date={formatDateRange(req.startDate, req.endDate)}
              days={req.days}
              note={req.note}
              colorClass={req.color}
            />
          ))}
          {pendingRequests.length === 0 && (
            <div className="col-span-full text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
              <Check className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">All caught up!</h3>
              <p className="text-slate-500 dark:text-slate-500 mt-2">No pending approvals at the moment.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === 'Team Calendar') {
    return <TeamCalendar title="Department Calendar" />;
  }

  return null;
}

function ApprovalCard({ name, avatar, type, date, days, note, colorClass }: any) {
  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-[2rem] p-5 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all duration-300 flex flex-col h-full group">
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full overflow-hidden border-2 border-slate-100 dark:border-slate-700">
            <Image src={avatar} alt={name} fill className="object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 leading-tight truncate">{name}</h3>
            <span className={`inline-block px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold ${colorClass.bg} dark:bg-opacity-20 ${colorClass.text} dark:text-opacity-90 mt-1 truncate max-w-full`}>
              {type}
            </span>
          </div>
        </div>
        <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 p-1.5 sm:p-2 rounded-xl shrink-0">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-slate-600 dark:text-slate-400 font-medium mb-4 bg-slate-50 dark:bg-slate-800/50 p-2.5 sm:p-3 rounded-2xl text-xs sm:text-sm">
        <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 dark:text-slate-500 shrink-0" />
        <span className="text-xs sm:text-sm">{date}</span>
        <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mx-0.5 sm:mx-1 shrink-0" />
        <span className="text-xs sm:text-sm font-bold shrink-0">{days} {days === 1 ? 'day' : 'days'}</span>
      </div>

      {note && (
        <div className="mb-6 flex-grow">
          <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 p-3 sm:p-4 rounded-2xl border border-slate-50 dark:border-slate-800/50">
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" />
            <p className="italic leading-relaxed line-clamp-3 sm:line-clamp-none">{note}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
        <button className="flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3.5 rounded-full font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm sm:text-base">
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
          Reject
        </button>
        <button className="flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3.5 rounded-full font-bold text-white bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 shadow-lg shadow-green-500/20 transition-all hover:-translate-y-0.5 text-sm sm:text-base">
          <Check className="w-4 h-4 sm:w-5 sm:h-5" />
          Approve
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import mockData from '@/data/mockData.json';

interface TeamCalendarProps {
  title?: string;
}

const parseDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const TEAM_MEMBERS = ['All', ...mockData.teamMembers.map(m => m.name)];

const MOCK_LEAVES = mockData.leaveRequests.map(req => ({
  id: req.id,
  member: req.memberName,
  type: req.type,
  status: req.status,
  start: parseDate(req.startDate),
  end: parseDate(req.endDate),
  color: req.color
}));

const MOCK_HOLIDAYS = mockData.holidays.map(h => ({
  date: parseDate(h.date),
  name: h.name
}));

export default function TeamCalendar({ title = 'Team Calendar' }: TeamCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1)); // Start at March 2026
  const [selectedMember, setSelectedMember] = useState('All');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Mon-Sun

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const filteredLeaves = MOCK_LEAVES.filter(leave =>
    selectedMember === 'All' || leave.member === selectedMember
  );

  const isDateInRange = (date: Date, start: Date, end: Date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return d >= s && d <= e;
  };

  const renderDays = () => {
    const days = [];
    // Empty cells
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 sm:h-32 rounded-3xl bg-slate-50 dark:bg-slate-800/20 border-2 border-dashed border-slate-200/50 dark:border-slate-700/50" />);
    }
    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const currentCellDate = new Date(year, month, d);
      const dayLeaves = filteredLeaves.filter(leave => isDateInRange(currentCellDate, leave.start, leave.end));
      const isToday = new Date().toDateString() === currentCellDate.toDateString();
      const holiday = MOCK_HOLIDAYS.find(h => h.date.toDateString() === currentCellDate.toDateString());
      const isHoliday = !!holiday;

      let cellClasses = 'h-24 sm:h-32 rounded-3xl border-2 relative group transition-colors overflow-y-auto hide-scrollbar flex flex-col pt-8 pb-1 ';
      if (isToday) {
        cellClasses += 'bg-white dark:bg-slate-800 border-purple-400 dark:border-purple-500 shadow-sm';
      } else if (isHoliday) {
        cellClasses += 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30 border-dashed';
      } else {
        cellClasses += 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-500/50';
      }

      days.push(
        <div key={`day-${d}`} className={cellClasses}>
          <span className={`absolute top-2 right-3 font-bold z-10 ${isToday ? 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 w-7 h-7 flex items-center justify-center rounded-full' : isHoliday ? 'text-orange-500 dark:text-orange-400' : 'text-slate-400 dark:text-slate-500'}`}>
            {d}
          </span>
          {isHoliday && (
            <div className="absolute top-2.5 left-2 right-10 truncate text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100/50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded z-10">
              {holiday.name}
            </div>
          )}
          <div className="flex flex-col gap-1 w-full relative z-0">
            {dayLeaves.map(leave => {
              const isStart = currentCellDate.toDateString() === leave.start.toDateString();
              const isEnd = currentCellDate.toDateString() === leave.end.toDateString();
              const isPending = leave.status === 'Pending';
              
              let barClasses = `h-6 sm:h-7 flex items-center px-2 text-[10px] sm:text-xs font-bold truncate ${leave.color.text} `;
              let wrapperClasses = "w-full ";
              
              if (isStart && isEnd) {
                wrapperClasses = "w-[calc(100%-16px)] mx-2";
                barClasses += "rounded-xl ";
              } else if (isStart) {
                wrapperClasses = "w-[calc(100%-8px)] ml-2";
                barClasses += "rounded-l-xl ";
              } else if (isEnd) {
                wrapperClasses = "w-[calc(100%-8px)] mr-2";
                barClasses += "rounded-r-xl ";
              } else {
                barClasses += "rounded-none ";
              }

              if (isPending) {
                barClasses += `border-y-2 border-dashed ${leave.color.border} bg-white dark:bg-slate-900 `;
                if (isStart) barClasses += `border-l-2 `;
                if (isEnd) barClasses += `border-r-2 `;
              } else {
                barClasses += `${leave.color.bg} dark:bg-opacity-20 `;
              }

              return (
                <div key={leave.id} className={wrapperClasses}>
                  <div className={barClasses} title={`${leave.member} (${leave.type} - ${leave.status})`}>
                    {isStart || currentCellDate.getDay() === 1 ? (
                      <span>{leave.member.split(' ')[0]} <span className="font-medium opacity-75 hidden sm:inline">({leave.type})</span></span>
                    ) : (
                      <span>&nbsp;</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-100 dark:border-slate-800 min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">{title}</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Member Filter */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-full border border-slate-200 dark:border-slate-700 focus-within:border-purple-400 dark:focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100 dark:focus-within:ring-purple-900/30 transition-all">
            <div className="bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-sm">
              <Filter className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="bg-transparent border-none font-bold text-slate-700 dark:text-slate-300 text-sm focus:ring-0 cursor-pointer outline-none pr-4 py-1"
            >
              {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-full border border-slate-200 dark:border-slate-700">
            <button onClick={prevMonth} className="p-2 rounded-full bg-white dark:bg-slate-800 shadow-sm hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 text-slate-600 dark:text-slate-400 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-700 dark:text-slate-300 min-w-[140px] text-center">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className="p-2 rounded-full bg-white dark:bg-slate-800 shadow-sm hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 text-slate-600 dark:text-slate-400 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 sm:gap-4">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-center font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-xs sm:text-sm mb-2 sm:mb-4">{day}</div>
        ))}
        {renderDays()}
      </div>
    </div>
  );
}

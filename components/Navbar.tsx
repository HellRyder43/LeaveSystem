import { Role, Tab } from '@/app/page';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, LayoutDashboard, Calendar, CheckCircle, Settings, Sun } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  role: Role;
  setRole: (role: Role) => void;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export default function Navbar({ role, setRole, activeTab, setActiveTab }: NavbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const tabs: { name: Tab; icon: React.ElementType; roles: Role[] }[] = [
    { name: 'Dashboard', icon: LayoutDashboard, roles: ['Employee', 'Manager', 'Admin'] },
    { name: 'Team Calendar', icon: Calendar, roles: ['Employee', 'Manager'] },
    { name: 'Approvals', icon: CheckCircle, roles: ['Manager'] },
    { name: 'Settings', icon: Settings, roles: ['Admin'] },
  ];

  const visibleTabs = tabs.filter(tab => tab.roles.includes(role));

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/50 dark:border-slate-800/50 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 transform rotate-3">
              <Sun className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 tracking-tight">
              Oasis
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-2">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.name;
              return (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  className={`relative px-5 py-3 rounded-full font-bold text-sm transition-all duration-200 flex items-center gap-2 ${
                    isActive ? 'text-purple-700 dark:text-purple-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-purple-100 dark:bg-purple-900/30 rounded-full -z-10"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon className={`w-5 h-5 ${isActive ? 'text-purple-600 dark:text-purple-400' : ''}`} />
                  {tab.name}
                </button>
              );
            })}
          </div>

          {/* Profile Dropdown & Theme Toggle */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 p-1.5 pr-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-full hover:border-purple-200 dark:hover:border-purple-500 hover:shadow-md transition-all duration-200"
              >
                <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm">
                  <Image
                    src="https://picsum.photos/seed/avatar/100/100"
                    alt="User Avatar"
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex flex-col items-start hidden sm:flex">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">Alex Rivera</span>
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">{role}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-3 w-48 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-2 z-50 overflow-hidden"
                  >
                    <div className="px-3 py-2 mb-2 border-b border-slate-100 dark:border-slate-700">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Switch Role</p>
                    </div>
                    {(['Employee', 'Manager', 'Admin'] as Role[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setRole(r);
                          setIsDropdownOpen(false);
                          setActiveTab('Dashboard'); // Reset tab on role change
                        }}
                        className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-colors ${
                          role === r ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {r} View
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import EmployeeDashboard from '@/components/EmployeeDashboard';
import ManagerDashboard from '@/components/ManagerDashboard';
import AdminDashboard from '@/components/AdminDashboard';

export type Role = 'Employee' | 'Manager' | 'Admin';
export type Tab = 'Dashboard' | 'Team Calendar' | 'Approvals' | 'Settings';

export default function Home() {
  const [role, setRole] = useState<Role>('Employee');
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard');

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f8f9ff] dark:bg-slate-950 transition-colors duration-300">
      {/* Mesh Gradient Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-300/30 dark:bg-purple-900/20 blur-[100px]" />
        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[50%] rounded-full bg-blue-300/30 dark:bg-blue-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[40%] rounded-full bg-pink-300/20 dark:bg-pink-900/20 blur-[100px]" />
      </div>

      <Navbar role={role} setRole={setRole} activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {role === 'Employee' && <EmployeeDashboard activeTab={activeTab} />}
        {role === 'Manager' && <ManagerDashboard activeTab={activeTab} />}
        {role === 'Admin' && <AdminDashboard activeTab={activeTab} />}
      </main>
    </div>
  );
}

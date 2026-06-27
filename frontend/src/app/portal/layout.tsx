'use client';

import { LayoutDashboard, Database, Download } from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      allowedRoles={['CLIENT', 'ADMIN', 'DATA_MANAGER']}
      nav={[
        { href: '/portal', label: 'Datasets', icon: <Database className="w-4 h-4" /> },
        { href: '/portal/downloads', label: 'My downloads', icon: <Download className="w-4 h-4" /> },
      ]}
    >
      {children}
    </DashboardShell>
  );
}

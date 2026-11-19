// pages/monitoring-ttd/index.js
import React from 'react';
import { getSession, useSession } from 'next-auth/react';
import DashboardLayout from '../../components/DashboardLayout';
import MonitoringTtdContainer from '../../components/monitoringTtd/Container';
import { requireRole, sessionForClient } from '../../utils/roleChecks';

export default function MonitoringTtdPage() {
  const { data: session, status } = useSession();

  return (
    <DashboardLayout>
      <MonitoringTtdContainer session={session} status={status} />
    </DashboardLayout>
  );
}

// Server-side protection (role-based): halaman monitoring TTD hanya untuk Admin.
export async function getServerSideProps(context) {
  const session = await getSession(context);

  const guard = requireRole(session, ['admin']);
  if (guard) return guard;

  return {
    props: { session: sessionForClient(session) },
  };
}

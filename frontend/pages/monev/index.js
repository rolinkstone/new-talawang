// pages/monev/index.js
import React from 'react';
import { useSession } from 'next-auth/react';
import { getSession } from 'next-auth/react';
import DashboardLayout from '../../components/DashboardLayout';
import MonevContainer from '../../components/monev/Container';
import { requireRole } from '../../utils/roleChecks';

export default function MonevPage() {
  const { data: session, status } = useSession();

  return (
    <DashboardLayout>
      <MonevContainer session={session} status={status} />
    </DashboardLayout>
  );
}

// Server-side protection (role-based): hanya Admin, Kabag TU, Kepala Balai, atau PPK
// yang dapat membuka halaman ini.
export async function getServerSideProps(context) {
  const session = await getSession(context);

  const guard = requireRole(session, ['admin', 'kabag_tu', 'kabalai', 'kepala balai', 'ppk']);
  if (guard) return guard;

  return {
    props: { session },
  };
}

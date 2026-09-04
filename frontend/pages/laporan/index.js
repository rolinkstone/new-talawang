// pages/laporan/index.js
import React from 'react';
import { useSession } from 'next-auth/react';
import { getSession } from 'next-auth/react';
import DashboardLayout from '../../components/DashboardLayout';
import LaporanContainer from '../../components/laporan/LaporanContainer';
import { requireRole } from '../../utils/roleChecks';

export default function LaporanPage() {
  const { data: session, status } = useSession();

  return (
    <DashboardLayout>
      <LaporanContainer session={session} status={status} />
    </DashboardLayout>
  );
}

// Server-side protection (role-based): hanya Admin, Kabag TU, atau Kepala Balai
// yang dapat membuka halaman ini. Data tidak pernah dirender untuk role lain.
export async function getServerSideProps(context) {
  const session = await getSession(context);

  const guard = requireRole(session, ['admin', 'kabag_tu', 'kabalai', 'kepala balai']);
  if (guard) return guard;

  return {
    props: { session },
  };
}
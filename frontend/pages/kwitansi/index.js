// pages/kwitansi/index.js
import React from 'react';
import { useSession } from 'next-auth/react';
import { getSession } from 'next-auth/react';
import DashboardLayout from '../../components/DashboardLayout';
import KwitansiContainer from '../../components/kwitansi/KwitansiContainer';
import { requireSession } from '../../utils/roleChecks';

export default function KwitansiPage() {
  const { data: session, status } = useSession();

  return (
    <DashboardLayout>
      <KwitansiContainer session={session} status={status} />
    </DashboardLayout>
  );
}

// Server-side protection: cek login + session belum habis
// (bila session sudah habis, redirect ke /login dengan pesan warning)
export async function getServerSideProps(context) {
  const session = await getSession(context);

  const guard = requireSession(session);
  if (guard) return guard;

  return {
    props: { session },
  };
}
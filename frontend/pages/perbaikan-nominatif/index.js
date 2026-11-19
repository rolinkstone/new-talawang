// pages/perbaikan-nominatif/index.js
import React from 'react';
import { getSession, useSession } from 'next-auth/react';
import DashboardLayout from '../../components/DashboardLayout';
import PerbaikanNominatifContainer from '../../components/perbaikanNominatif/Container';
import { requireRole, sessionForClient } from '../../utils/roleChecks';

export default function PerbaikanNominatifPage() {
  const { data: session } = useSession();

  return (
    <DashboardLayout>
      <PerbaikanNominatifContainer session={session} />
    </DashboardLayout>
  );
}

// Server-side protection (role-based): fitur perbaikan nominatif hanya untuk Admin.
export async function getServerSideProps(context) {
  const session = await getSession(context);

  const guard = requireRole(session, ['admin']);
  if (guard) return guard;

  return {
    props: { session: sessionForClient(session) },
  };
}

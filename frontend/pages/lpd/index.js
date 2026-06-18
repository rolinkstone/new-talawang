// pages/lpd/index.js
import React from 'react';
import { useSession } from 'next-auth/react';
import { getSession } from 'next-auth/react';
import DashboardLayout from '../../components/DashboardLayout';
import LpdContainer from '../../components/lpd/LpdContainer';

export default function LpdPage() {
  const { data: session, status } = useSession();

  return (
    <DashboardLayout>
      <LpdContainer session={session} status={status} />
    </DashboardLayout>
  );
}

// Server-side protection
export async function getServerSideProps(context) {
  const session = await getSession(context);

  if (!session) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return {
    props: { session },
  };
}
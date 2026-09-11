// hooks/useNotifications.js
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function useNotifications(interval = 30000) {
    const { data: session } = useSession();
    const [notifications, setNotifications] = useState({
        lpd: 0,
        kwitansi: 0,
        total: 0
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchNotifications = useCallback(async () => {
        if (!session?.accessToken) return;
        
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/notifikasi/count`, {
                headers: { 'Authorization': `Bearer ${session.accessToken}` }
            });
            
            if (response.data.success) {
                setNotifications(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching notifications:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        fetchNotifications();
        
        // Polling setiap interval
        const intervalId = setInterval(fetchNotifications, interval);
        
        return () => clearInterval(intervalId);
    }, [fetchNotifications, interval]);

    return { notifications, loading, error, refresh: fetchNotifications };
}
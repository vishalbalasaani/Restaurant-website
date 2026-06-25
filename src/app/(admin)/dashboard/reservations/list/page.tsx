'use client';

import { useState, useEffect } from 'react';
import { Loader2, Calendar, Clock, Users, Phone, Mail, FileText, CheckCircle2, XCircle, CheckSquare, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { TableReservation } from '@/lib/types';
import { getWhatsAppLink, formatReservationForWhatsApp } from '@/lib/utils';

export default function ReservationsListPage() {
  const [reservations, setReservations] = useState<TableReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filters
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState<string>('active'); // active, completed, cancelled, all

  const fetchReservations = async () => {
    try {
      const supabase = createClient();
      let query = supabase
        .from('table_reservations')
        .select(`
          *,
          restaurant_tables (*)
        `)
        .order('reservation_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (filterDate) {
        query = query.eq('reservation_date', filterDate);
      }

      if (filterStatus === 'active') {
        query = query.in('status', ['reserved', 'confirmed']);
      } else if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      if (data) setReservations(data as any);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();

    const supabase = createClient();
    const channel = supabase
      .channel('reservations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_reservations' }, () => fetchReservations())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterDate, filterStatus]);

  const updateStatus = async (id: string, newStatus: 'confirmed' | 'completed' | 'cancelled') => {
    setUpdatingId(id);
    try {
      const supabase = createClient();
      await supabase
        .from('table_reservations')
        .update({ status: newStatus })
        .eq('id', id);
    } catch (err) {
      console.error('Error updating reservation:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'reserved':
        return <span className="inline-flex rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-bold text-yellow-800">Reserved</span>;
      case 'confirmed':
        return <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">Confirmed</span>;
      case 'completed':
        return <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800">Completed</span>;
      case 'cancelled':
        return <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800">Cancelled</span>;
      default:
        return null;
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      // timeStr is usually HH:MM:SS
      const [hours, minutes] = timeStr.split(':');
      const h = parseInt(hours);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between rounded-xl bg-card p-4 border border-border shadow-sm">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="active">Active (Reserved/Confirmed)</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="all">All Statuses</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : reservations.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card">
          <Calendar className="mb-2 h-10 w-10 text-text-light opacity-50" />
          <p className="font-heading font-bold text-text-light">No reservations found</p>
          <p className="text-sm text-text-light/80">Try changing the date or status filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/50 text-xs font-bold uppercase tracking-wider text-text-light">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Table Info</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reservations.map((res) => (
                <tr key={res.id} className="transition-colors hover:bg-background/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">#{res.reservation_number}</span>
                      <p className="font-heading font-bold text-text">{res.customer_name}</p>
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-text-light">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {res.phone_number}</span>
                      {res.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {res.email}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-text flex items-center gap-1.5 mb-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> {new Date(res.reservation_date).toLocaleDateString()}
                    </p>
                    <p className="text-text-light text-xs flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" /> {formatTime(res.start_time)} - {formatTime(res.end_time)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                        {res.restaurant_tables?.table_number || '?'}
                      </div>
                      <span className="font-medium text-text">{res.restaurant_tables?.table_name || 'Assigned'}</span>
                    </div>
                    <p className="text-text-light text-xs flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-primary" /> {res.number_of_guests} People
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(res.status)}
                    {res.special_request && (
                      <div className="mt-2 text-xs text-orange-600 flex items-start gap-1">
                        <FileText className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2 max-w-[150px]" title={res.special_request}>{res.special_request}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {res.status === 'reserved' && (
                        <button
                          onClick={() => updateStatus(res.id, 'confirmed')}
                          disabled={updatingId === res.id}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Confirm
                        </button>
                      )}
                      {res.status === 'confirmed' && (
                        <>
                          <a
                            href={getWhatsAppLink(
                              res.phone_number,
                              formatReservationForWhatsApp({
                                reservation_number: res.reservation_number,
                                customer_name: res.customer_name,
                                reservation_date: res.reservation_date,
                                start_time: res.start_time,
                                number_of_guests: res.number_of_guests,
                                table_name: res.restaurant_tables?.table_name || null,
                              })
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg bg-[#25D366]/10 px-3 py-1.5 text-xs font-bold text-[#25D366] transition-colors hover:bg-[#25D366]/20"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                            WhatsApp
                          </a>
                          <button
                            onClick={() => updateStatus(res.id, 'completed')}
                            disabled={updatingId === res.id}
                            className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
                          >
                            <CheckSquare className="h-4 w-4" />
                            Complete
                          </button>
                        </>
                      )}
                      {(res.status === 'reserved' || res.status === 'confirmed') && (
                        <button
                          onClick={() => {
                            if (confirm('Cancel this reservation?')) {
                              updateStatus(res.id, 'cancelled');
                            }
                          }}
                          disabled={updatingId === res.id}
                          className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

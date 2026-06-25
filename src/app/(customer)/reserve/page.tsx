'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, Users, User, Phone, Mail, FileText, CheckCircle2, ChevronRight, Loader2, AlertCircle, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RestaurantTable, TableReservation, RestaurantSettings } from '@/lib/types';
import Link from 'next/link';

export default function ReserveTablePage() {
  const [globalSettings, setGlobalSettings] = useState<Partial<RestaurantSettings> | null>(null);
  
  // Step 1: Selection
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState('2');
  
  // Step 2: Tables
  const [availableTables, setAvailableTables] = useState<RestaurantTable[]>([]);
  const [hasAnyActiveTablesForCapacity, setHasAnyActiveTablesForCapacity] = useState<boolean>(true);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const [searched, setSearched] = useState(false);

  // Step 3: Details
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  
  // Tracker State
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [reservationStatus, setReservationStatus] = useState<string | null>(null);
  const [reservationNumber, setReservationNumber] = useState<string | null>(null);

  // Generate 30-min time slots from 11:00 to 22:00
  const allTimeSlots: string[] = [];
  for (let i = 11; i <= 22; i++) {
    allTimeSlots.push(`${i.toString().padStart(2, '0')}:00`);
    if (i !== 22) allTimeSlots.push(`${i.toString().padStart(2, '0')}:30`);
  }

  // Filter time slots if the selected date is today
  const timeSlots = allTimeSlots.filter(slot => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
    
    if (date === localDate) {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      
      const [slotHoursStr, slotMinutesStr] = slot.split(':');
      const slotHours = parseInt(slotHoursStr, 10);
      const slotMinutes = parseInt(slotMinutesStr, 10);
      
      // Only show slots that are at least 30 minutes in the future
      const currentTotalMinutes = currentHours * 60 + currentMinutes;
      const slotTotalMinutes = slotHours * 60 + slotMinutes;
      
      return slotTotalMinutes > currentTotalMinutes + 30;
    }
    return true; // Future dates show all slots
  });

  useEffect(() => {
    const supabase = createClient();
    
    const init = async () => {
      const today = new Date();
      const offset = today.getTimezoneOffset();
      const localDate = new Date(today.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
      setDate(localDate);

      const { data } = await supabase.from('restaurant_settings').select('*').single();
      if (data) setGlobalSettings(data);
    };
    init();

    // Listen to real-time changes for reservations_open
    const channel = supabase
      .channel('public:restaurant_settings:customer')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'restaurant_settings' },
        (payload: any) => {
          setGlobalSettings(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto redirect to menu when confirmed
  useEffect(() => {
    if (reservationStatus === 'confirmed') {
      const timer = setTimeout(() => {
        router.push('/menu');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [reservationStatus, router]);

  const searchTables = async () => {
    if (!date || !time || !guests) return;
    
    setLoadingTables(true);
    setSearched(true);
    setSelectedTable(null);
    setError('');

    try {
      const supabase = createClient();
      
      const startDateTime = new Date(`${date}T${time}:00`);
      const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
      const startTimeStr = `${time}:00`;
      const endTimeStr = endDateTime.toTimeString().split(' ')[0];

      // Fetch all tables
      const { data: allTables } = await supabase.from('restaurant_tables').select('*').order('capacity', { ascending: true });
      
      const { data: reservations } = await supabase
        .from('table_reservations')
        .select('*')
        .eq('reservation_date', date)
        .in('status', ['reserved', 'confirmed']);

      if (allTables) {
        const guestCount = parseInt(guests);
        // Strict Capacity Match: Target Capacity = members if even, members + 1 if odd.
        const targetCapacity = guestCount % 2 === 0 ? guestCount : guestCount + 1;
        
        const activeTablesForCapacity = allTables.filter(t => t.capacity === targetCapacity && t.is_active !== false);
        setHasAnyActiveTablesForCapacity(activeTablesForCapacity.length > 0);

        const validTables = allTables.filter((table: RestaurantTable) => {
          // Must be active
          if (table.is_active === false) return false;
          // Strict capacity match
          if (table.capacity !== targetCapacity) return false;

          // Overlap check
          const hasConflict = reservations?.some((res: TableReservation) => {
            if (res.table_id !== table.id) return false;
            return (startTimeStr < res.end_time && endTimeStr > res.start_time);
          });

          return !hasConflict;
        });

        setAvailableTables(validTables);
      }
    } catch (err) {
      console.error('Error searching tables:', err);
    } finally {
      setLoadingTables(false);
    }
  };

  useEffect(() => {
    if (date && time && guests) {
      searchTables();
    }
  }, [date, time, guests]);

  // Real-time listener for the submitted reservation
  useEffect(() => {
    if (!reservationId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`reservation-${reservationId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'table_reservations', filter: `id=eq.${reservationId}` },
        (payload: any) => {
          setReservationStatus(payload.new.status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reservationId]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable || !name || !phone) return;

    setBooking(true);
    setError('');

    try {
      const supabase = createClient();
      
      const startDateTime = new Date(`${date}T${time}:00`);
      const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
      const startTimeStr = `${time}:00`;
      const endTimeStr = endDateTime.toTimeString().split(' ')[0];

      const { data: insertedId, error: rpcError } = await supabase.rpc('book_table', {
        p_customer_name: name,
        p_phone_number: phone,
        p_email: email || null,
        p_table_id: selectedTable.id,
        p_reservation_date: date,
        p_start_time: startTimeStr,
        p_end_time: endTimeStr,
        p_number_of_guests: parseInt(guests),
        p_special_request: specialRequest || null
      });

      if (rpcError) throw rpcError;

      const { data: resData } = await supabase.from('table_reservations').select('reservation_number').eq('id', insertedId).single();
      if (resData) setReservationNumber(resData.reservation_number);

      setReservationId(insertedId);
      setReservationStatus('reserved'); // 'reserved' implies pending approval in customer context
    } catch (err: any) {
      setError(err.message || 'This table has just been reserved. Please select another available table.');
      searchTables();
      setSelectedTable(null);
    } finally {
      setBooking(false);
    }
  };

  const resetBooking = () => {
    setReservationId(null);
    setReservationStatus(null);
    setSelectedTable(null);
    searchTables();
  };

  const getMinDate = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    return new Date(today.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
  };

  // Add Step State
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ... (keep logic exactly the same, but modify the searchTables and handleBook functions slightly for step transitions)
  const handleSearchClick = () => {
    searchTables();
    setStep(2);
  };

  const handleTableSelect = (table: RestaurantTable) => {
    setSelectedTable(table);
    setStep(3);
  };

  if (globalSettings && globalSettings.reservations_open === false) {
    return (
      <div className="min-h-[100dvh] pt-20 flex items-center justify-center px-4 bg-background">
        <div className="max-w-md w-full bg-card rounded-3xl p-8 border border-border text-center shadow-xl">
          <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
            <XCircle className="w-10 h-10" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-text mb-2">Reservations Unavailable</h2>
          <p className="text-text-light mb-6">Table reservations are currently turned off for today. Please try again tomorrow or contact us directly.</p>
          <Link href="/menu" className="block w-full py-3 rounded-xl bg-primary text-white font-bold transition-colors hover:bg-primary-light">
            Explore Our Menu
          </Link>
        </div>
      </div>
    );
  }

  if (reservationStatus) {
    return (
      <div className="min-h-[100dvh] pt-20 flex items-center justify-center px-4 bg-background">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full bg-card rounded-3xl p-8 border border-border text-center shadow-xl">
          {reservationStatus === 'reserved' && (
            <>
              <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 relative">
                <Clock className="w-8 h-8" />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
                </span>
              </div>
              <h2 className="font-heading text-3xl font-bold text-text mb-2 animate-pulse">Pending Approval</h2>
              {reservationNumber && (
                <div className="mb-4 inline-block rounded-lg bg-blue-50 px-4 py-2 text-blue-800 font-bold border border-blue-200">
                  Reservation ID: #{reservationNumber}
                </div>
              )}
              <p className="text-text-light mb-8">We have received your reservation request for {selectedTable?.table_name || selectedTable?.table_number}. Please wait while the restaurant confirms your booking.</p>
            </>
          )}

          {reservationStatus === 'confirmed' && (
            <>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </motion.div>
              <h2 className="font-heading text-3xl font-bold text-green-600 mb-2">Successfully Booked!</h2>
              {reservationNumber && (
                <div className="mb-4 inline-block rounded-lg bg-green-50 px-4 py-2 text-green-800 font-bold border border-green-200">
                  Reservation ID: #{reservationNumber}
                </div>
              )}
              <p className="text-text-light mb-8">Your table is confirmed! We look forward to welcoming you on {new Date(date).toLocaleDateString()} at {time}.</p>
              <div className="space-y-4">
                <Link href="/menu" className="block w-full py-3 rounded-xl bg-primary text-white font-bold transition-colors hover:bg-primary-light">
                  Explore Our Menu
                </Link>
                <p className="text-xs text-text-light font-medium pt-2 animate-pulse">Redirecting to menu in a few seconds...</p>
              </div>
            </>
          )}

          {reservationStatus === 'cancelled' && (
            <>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                <XCircle className="w-10 h-10" />
              </motion.div>
              <h2 className="font-heading text-3xl font-bold text-red-600 mb-2">Reservation Declined</h2>
              <p className="text-text-light mb-8">Sorry, we can't offer that table at the moment. Please try to book another time and date.</p>
              <div className="space-y-4">
                <button onClick={() => { resetBooking(); setStep(1); }} className="block w-full py-3 rounded-xl bg-primary text-white font-bold transition-colors hover:bg-primary-light">
                  Try Another Time
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col pt-16 bg-background">
      <div className="flex-1 w-full max-w-md mx-auto flex flex-col p-4 relative">
        
        {/* Wizard Header / Progress */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button onClick={() => setStep(step === 3 ? 2 : 1)} className="p-2 -ml-2 rounded-full hover:bg-border text-text transition-colors">
                <ChevronRight className="w-6 h-6 rotate-180" />
              </button>
            )}
            <div>
              <h1 className="font-heading text-2xl font-bold text-text leading-tight">
                {step === 1 ? 'Find Table' : step === 2 ? 'Select Table' : 'Your Details'}
              </h1>
              <p className="text-xs text-text-light font-bold">Step {step} of 3</p>
            </div>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 w-6 rounded-full ${step >= s ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </div>
        </div>

        {/* Step 1: Search */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col min-h-0 space-y-6">
              
              <div className="space-y-3">
                <label className="text-sm font-bold text-text flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" /> Date
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
                  {Array.from({ length: 14 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    const dateStr = d.toISOString().split('T')[0];
                    const dayName = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-US', { weekday: 'short' });
                    const dayNum = d.getDate();
                    return (
                      <button key={dateStr} onClick={() => setDate(dateStr)} className={`flex-shrink-0 snap-start flex flex-col items-center justify-center w-[4.5rem] h-[4.5rem] rounded-2xl border-2 transition-all ${date === dateStr ? 'border-primary bg-primary text-white scale-[1.02] shadow-md shadow-primary/20' : 'border-border bg-card text-text'}`}>
                        <span className={`text-[10px] uppercase font-bold mb-0.5 ${date === dateStr ? 'text-white/80' : 'text-text-light'}`}>{dayName}</span>
                        <span className="font-heading text-xl font-bold leading-none">{dayNum}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-text flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Number of Guests
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                    <button key={num} onClick={() => setGuests(num.toString())} className={`flex-shrink-0 snap-start flex items-center justify-center w-[3.5rem] h-[3.5rem] rounded-xl border-2 font-bold text-lg transition-all ${guests === num.toString() ? 'border-primary bg-primary text-white scale-[1.02] shadow-md shadow-primary/20' : 'border-border bg-card text-text'}`}>
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 flex-1 min-h-0 flex flex-col">
                <label className="text-sm font-bold text-text flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Time
                </label>
                <div className="grid grid-cols-3 gap-2 overflow-y-auto pb-24 scrollbar-hide">
                  {timeSlots.map(t => (
                    <button key={t} onClick={() => setTime(t)} className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${time === t ? 'border-primary bg-primary text-white shadow-md shadow-primary/20' : 'border-border bg-card text-text'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-10 md:absolute">
                <button onClick={handleSearchClick} disabled={!date || !time || !guests} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-bold text-white transition-all hover:bg-primary-light disabled:opacity-50">
                  Find Available Tables <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Select Table */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col min-h-0">
              {loadingTables ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p className="font-bold text-text">Searching tables...</p>
                </div>
              ) : availableTables.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-20 h-20 bg-red-50 text-red-400 rounded-full flex items-center justify-center mb-4">
                    <XCircle className="w-10 h-10" />
                  </div>
                  <h3 className="font-bold text-text text-xl mb-2">No tables found</h3>
                  <p className="text-text-light text-sm max-w-[250px] mx-auto mb-8">
                    {!hasAnyActiveTablesForCapacity 
                      ? `${guests} member tables are currently unavailable. Please try a different number of guests.` 
                      : `We are fully booked for ${guests} guests at ${time}. Please try another time.`}
                  </p>
                  <button onClick={() => setStep(1)} className="px-6 py-3 rounded-xl bg-primary/10 text-primary font-bold">Change Search</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 overflow-y-auto pb-24 scrollbar-hide">
                  {availableTables.map(table => (
                    <button key={table.id} onClick={() => handleTableSelect(table)} className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-border bg-card hover:border-primary transition-all text-center">
                      <Users className="w-8 h-8 text-primary mb-2" />
                      <h4 className="font-heading font-bold text-text line-clamp-1">{table.table_name || table.table_number}</h4>
                      <p className="text-xs font-bold text-text-light mt-1">Capacity: {table.capacity}</p>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 3: Details */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col min-h-0">
              
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-text text-sm">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {time}</p>
                  <p className="text-xs font-medium text-text-light">{guests} Guests • {selectedTable?.table_name || selectedTable?.table_number}</p>
                </div>
              </div>

              <form id="book-form" onSubmit={handleBook} className="space-y-4 overflow-y-auto pb-32 scrollbar-hide">
                <div>
                  <label className="block text-sm font-bold text-text mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-light" />
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="w-full rounded-xl border border-border bg-card py-3.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-text mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-light" />
                    <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full rounded-xl border border-border bg-card py-3.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-text mb-1.5">Special Request (Optional)</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-5 w-5 text-text-light" />
                    <textarea rows={3} value={specialRequest} onChange={(e) => setSpecialRequest(e.target.value)} placeholder="Any dietary requirements?" className="w-full rounded-xl border border-border bg-card py-3.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
              </form>

              <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-10 md:absolute">
                <button form="book-form" type="submit" disabled={booking} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-bold text-white transition-all hover:bg-primary-light disabled:opacity-70">
                  {booking ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Reservation'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

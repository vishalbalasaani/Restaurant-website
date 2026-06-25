'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Loader2, Users, AlertCircle, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RestaurantTable, TableReservation } from '@/lib/types';

interface TableWithStatus extends RestaurantTable {
  isOccupiedNow: boolean;
}

export default function TablesManagementPage() {
  const [tables, setTables] = useState<TableWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [tableName, setTableName] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchTables = async () => {
    try {
      const supabase = createClient();
      
      const { data: tablesData } = await supabase.from('restaurant_tables').select('*').order('table_number');
      
      // Get today's active reservations to calculate live status
      const today = new Date().toISOString().split('T')[0];
      const { data: reservationsData } = await supabase
        .from('table_reservations')
        .select('*')
        .eq('reservation_date', today)
        .in('status', ['reserved', 'confirmed']);

      if (tablesData) {
        const now = new Date();
        const currentTimeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS

        const tablesWithStatus: TableWithStatus[] = tablesData.map((t: RestaurantTable) => {
          // Check if any active reservation is happening RIGHT NOW
          const activeRes = reservationsData?.find(r => 
            r.table_id === t.id && 
            r.start_time <= currentTimeStr && 
            r.end_time >= currentTimeStr
          );

          return {
            ...t,
            isOccupiedNow: !!activeRes
          };
        });
        
        setTables(tablesWithStatus);
      }
    } catch (err) {
      console.error('Error fetching tables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();

    const supabase = createClient();
    const channel = supabase
      .channel('tables_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => fetchTables())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_reservations' }, () => fetchTables())
      .subscribe();

    // Auto-refresh every minute to update the "Live Status"
    const interval = setInterval(fetchTables, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber || !capacity) return;
    
    setSaving(true);
    setError('');
    
    try {
      const supabase = createClient();
      
      if (editingId) {
        const { error: updateError } = await supabase
          .from('restaurant_tables')
          .update({
            table_number: tableNumber,
            table_name: tableName || null,
            capacity: parseInt(capacity),
          })
          .eq('id', editingId);
          
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('restaurant_tables')
          .insert({
            table_number: tableNumber,
            table_name: tableName || null,
            capacity: parseInt(capacity),
          });
          
        if (insertError) throw insertError;
      }
      
      setTableNumber('');
      setTableName('');
      setCapacity('4');
      setShowAddForm(false);
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save table. Table number might already exist.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (table: RestaurantTable) => {
    setTableNumber(table.table_number);
    setTableName(table.table_name || '');
    setCapacity(table.capacity.toString());
    setEditingId(table.id);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleActive = async (table: RestaurantTable) => {
    try {
      const supabase = createClient();
      await supabase.from('restaurant_tables').update({ is_active: !table.is_active }).eq('id', table.id);
    } catch (err) {
      console.error('Error toggling table:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this table? All associated reservations will also be deleted.')) return;
    try {
      const supabase = createClient();
      await supabase.from('restaurant_tables').delete().eq('id', id);
    } catch (err) {
      console.error('Error deleting table:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text">Manage Tables</h2>
        <button
          onClick={() => {
            setEditingId(null);
            setTableNumber('');
            setTableName('');
            setCapacity('4');
            setShowAddForm(!showAddForm);
          }}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-light"
        >
          <Plus className="h-4 w-4" />
          Add Table
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSave}
            className="overflow-hidden rounded-xl border border-border bg-card p-6"
          >
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-bold text-text">Table Number *</label>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="e.g. T-01"
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-text">Table Name (Optional)</label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="e.g. Window Seat"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-text">Maximum Members *</label>
                <select
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {[2, 4, 6, 8, 10, 12].map(num => (
                    <option key={num} value={num}>{num} Members</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-xl px-4 py-2 text-sm font-bold text-text-light hover:bg-border/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-light disabled:opacity-70"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? 'Update Table' : 'Save Table'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/50">
              <tr>
                <th className="px-6 py-4 font-heading font-bold text-text">Table</th>
                <th className="px-6 py-4 font-heading font-bold text-text">Name</th>
                <th className="px-6 py-4 font-heading font-bold text-text">Max Members</th>
                <th className="px-6 py-4 font-heading font-bold text-text">Live Status</th>
                <th className="px-6 py-4 font-heading font-bold text-text">Active</th>
                <th className="px-6 py-4 text-right font-heading font-bold text-text">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tables.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-light">
                    No tables added yet.
                  </td>
                </tr>
              ) : (
                tables.map((table) => (
                  <tr key={table.id} className="transition-colors hover:bg-background/50">
                    <td className="px-6 py-4 font-bold text-text">{table.table_number}</td>
                    <td className="px-6 py-4 text-text-light">{table.table_name || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-text-light">
                        <Users className="h-4 w-4" />
                        {table.capacity}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {table.is_active === false ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
                          Offline
                        </span>
                      ) : table.isOccupiedNow ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
                          Reserved Now
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                          Available
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(table)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${table.is_active !== false ? 'bg-green-500' : 'bg-red-400'}`}
                      >
                        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${table.is_active !== false ? 'left-6' : 'left-1'}`} />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(table)}
                          className="rounded-lg p-2 text-text-light transition-colors hover:bg-border/50 hover:text-primary"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(table.id)}
                          className="rounded-lg p-2 text-text-light transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

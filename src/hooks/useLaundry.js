import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export function useLaundry() {
  const { branch } = useAuth()
  const [loading, setLoading] = useState(false)

  // Fetch a record by date (for current branch)
  const fetchRecord = useCallback(async (date) => {
    const { data, error } = await supabase
      .from('records')
      .select('*, record_items(*)')
      .eq('branch', branch)
      .eq('date', date)
      .maybeSingle()
    if (error) throw error
    return data
  }, [branch])

  // Fetch previous record to get carry-forward
  const fetchPrevRecord = useCallback(async (date) => {
    const { data, error } = await supabase
      .from('records')
      .select('*, record_items(*)')
      .eq('branch', branch)
      .lt('date', date)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) return null
    return data
  }, [branch])

  // Save or update a record
  const saveRecord = useCallback(async ({ date, day, client, items }) => {
    setLoading(true)
    try {
      // Upsert the record
      const { data: record, error: recErr } = await supabase
        .from('records')
        .upsert(
          { branch, date, day, client,
            total_received: items.reduce((a, i) => a + i.total_received, 0),
            total_washed:   items.reduce((a, i) => a + i.washed, 0),
            total_remaining:items.reduce((a, i) => a + i.remaining, 0),
            total_amount:   items.reduce((a, i) => a + i.amount, 0),
          },
          { onConflict: 'branch,date' }
        )
        .select()
        .single()
      if (recErr) throw recErr

      // Delete old items then re-insert
      await supabase.from('record_items').delete().eq('record_id', record.id)

      const itemRows = items.map(i => ({
        record_id:      record.id,
        item_id:        i.item_id,
        carry:          i.carry,
        carry_treatment: i.carry_treatment || 0,
        new_qty:        i.new_qty,
        total_received: i.total_received,
        washed:         i.washed,
        for_treatment:  i.for_treatment || 0,
        remaining_at_laundry: i.remaining_at_laundry || 0,
        remaining:      i.remaining,
        price:          i.price,
        amount:         i.amount,
      }))
      const { error: itemErr } = await supabase.from('record_items').insert(itemRows)
      if (itemErr) throw itemErr

      toast.success('تم الحفظ بنجاح ✅')
      return record
    } catch (err) {
      toast.error('خطأ في الحفظ: ' + err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [branch])

  // Fetch all records for a month
  const fetchMonthRecords = useCallback(async (yearMonth) => {
    const [year, month] = yearMonth.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate()
    const { data, error } = await supabase
      .from('records')
      .select('*, record_items(*)')
      .eq('branch', branch)
      .gte('date', `${yearMonth}-01`)
      .lte('date', `${yearMonth}-${String(lastDay).padStart(2, '0')}`)
      .order('date', { ascending: true })
    if (error) throw error
    return data || []
  }, [branch])

  // Fetch prices for this branch
  const fetchPrices = useCallback(async () => {
    const { data, error } = await supabase
      .from('prices')
      .select('*')
      .eq('branch', branch)
    if (error) throw error
    return data || []
  }, [branch])

  // Save prices
  const savePrices = useCallback(async (priceMap) => {
    setLoading(true)
    try {
      const rows = Object.entries(priceMap).map(([item_id, price]) => ({
        branch, item_id, price
      }))
      const { error } = await supabase
        .from('prices')
        .upsert(rows, { onConflict: 'branch,item_id' })
      if (error) throw error
      toast.success('تم حفظ الأسعار ✅')
    } catch (err) {
      toast.error('خطأ: ' + err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [branch])

  // Delete a record
  const deleteRecord = useCallback(async (id) => {
    const { error } = await supabase.from('records').delete().eq('id', id)
    if (error) throw error
    toast.success('تم الحذف')
  }, [])

  return { loading, fetchRecord, fetchPrevRecord, saveRecord, fetchMonthRecords, fetchPrices, savePrices, deleteRecord }
}

import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export function useLaundry() {
  const { branch, isLaundryOwner, organization, activeBranch } = useAuth()
  const [loading, setLoading] = useState(false)

  // Determine mode: Hotel Legacy or Laundry
  const isLaundryMode = isLaundryOwner && activeBranch && organization

  // Fetch a record by date (for current branch)
  const fetchRecord = useCallback(async (date) => {
    let query = supabase.from('records').select('*, record_items(*)').eq('date', date)
    
    if (isLaundryMode) {
      query = query.eq('organization_id', organization.id).eq('branch_id', activeBranch.id)
    } else {
      query = query.eq('branch', branch)
    }
    
    const { data, error } = await query.maybeSingle()
    if (error) throw error
    return data
  }, [branch, isLaundryMode, organization, activeBranch])

  // Fetch previous record to get carry-forward
  const fetchPrevRecord = useCallback(async (date) => {
    let query = supabase.from('records').select('*, record_items(*)').lt('date', date)
    
    if (isLaundryMode) {
      query = query.eq('organization_id', organization.id).eq('branch_id', activeBranch.id)
    } else {
      query = query.eq('branch', branch)
    }
    
    const { data, error } = await query.order('date', { ascending: false }).limit(1).maybeSingle()
    if (error) return null
    return data
  }, [branch, isLaundryMode, organization, activeBranch])

  // Save or update a record
  const saveRecord = useCallback(async ({ date, day, client, items }) => {
    setLoading(true)
    try {
      const recordData = {
        date, day, client,
        total_received: items.reduce((a, i) => a + i.total_received, 0),
        total_washed:   items.reduce((a, i) => a + i.washed, 0),
        total_remaining:items.reduce((a, i) => a + i.remaining, 0),
        total_amount:   items.reduce((a, i) => a + i.amount, 0),
      }

      if (isLaundryMode) {
        recordData.organization_id = organization.id
        recordData.branch_id = activeBranch.id
        // Use unique compatibility value to avoid conflicts with hotel branch names
        recordData.branch = `laundry:${activeBranch.id}`
      } else {
        recordData.branch = branch
      }

      // Upsert the record
      const { data: record, error: recErr } = await supabase
        .from('records')
        .upsert(recordData, { onConflict: isLaundryMode ? 'organization_id,branch_id,date' : 'branch,date' })
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
  }, [branch, isLaundryMode, organization, activeBranch])

  // Fetch all records for a month
  const fetchMonthRecords = useCallback(async (yearMonth) => {
    const [year, month] = yearMonth.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate()
    
    let query = supabase.from('records').select('*, record_items(*)')
      .gte('date', `${yearMonth}-01`)
      .lte('date', `${yearMonth}-${String(lastDay).padStart(2, '0')}`)
    
    if (isLaundryMode) {
      query = query.eq('organization_id', organization.id).eq('branch_id', activeBranch.id)
    } else {
      query = query.eq('branch', branch)
    }
    
    const { data, error } = await query.order('date', { ascending: true })
    if (error) throw error
    return data || []
  }, [branch, isLaundryMode, organization, activeBranch])

  // Fetch prices for this branch
  const fetchPrices = useCallback(async () => {
    let query = supabase.from('prices').select('*')
    
    if (isLaundryMode) {
      query = query.eq('organization_id', organization.id).eq('branch_id', activeBranch.id)
    } else {
      query = query.eq('branch', branch)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data || []
  }, [branch, isLaundryMode, organization, activeBranch])

  // Save prices
  const savePrices = useCallback(async (priceMap) => {
    setLoading(true)
    try {
      const rows = Object.entries(priceMap).map(([item_id, price]) => {
        const row = { item_id, price }
        if (isLaundryMode) {
          row.organization_id = organization.id
          row.branch_id = activeBranch.id
          // Use unique compatibility value to avoid conflicts with hotel branch names
          row.branch = `laundry:${activeBranch.id}`
        } else {
          row.branch = branch
        }
        return row
      })
      
      const { error } = await supabase
        .from('prices')
        .upsert(rows, { onConflict: isLaundryMode ? 'organization_id,branch_id,item_id' : 'branch,item_id' })
      if (error) throw error
      toast.success('تم حفظ الأسعار ✅')
    } catch (err) {
      toast.error('خطأ: ' + err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [branch, isLaundryMode, organization, activeBranch])

  // Delete a record
  const deleteRecord = useCallback(async (id) => {
    const { error } = await supabase.from('records').delete().eq('id', id)
    if (error) throw error
    toast.success('تم الحذف')
  }, [])

  return { loading, fetchRecord, fetchPrevRecord, saveRecord, fetchMonthRecords, fetchPrices, savePrices, deleteRecord }
}

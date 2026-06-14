import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLaundry } from '../hooks/useLaundry'
import { ARABIC_MONTHS } from '../lib/constants'
import { exportDayExcel } from '../lib/exportExcel'
import toast from 'react-hot-toast'

function ExportIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function getCurrentYearMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonth(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return `${ARABIC_MONTHS[parseInt(m) - 1]} ${y}`
}

export default function LogPage() {
  const { fetchMonthRecords, fetchPrices, deleteRecord } = useLaundry()
  const navigate = useNavigate()
  const [month, setMonth]       = useState(getCurrentYearMonth())
  const [records, setRecords]   = useState([])
  const [priceMap, setPriceMap] = useState({})
  const [loading, setLoading]   = useState(false)

  const load = useCallback(async (m) => {
    setLoading(true)
    try {
      const [data, prices] = await Promise.all([
        fetchMonthRecords(m),
        fetchPrices().catch(() => []),
      ])
      setRecords(data)
      const pm = {}
      prices.forEach(p => { if (p.price > 0) pm[p.item_id] = p.price })
      setPriceMap(pm)
    } catch {
      toast.error('خطأ في التحميل')
    } finally {
      setLoading(false)
    }
  }, [fetchMonthRecords, fetchPrices])

  useEffect(() => { load(month) }, [month, load])

  const handleDelete = async (id) => {
    if (!confirm('هل تريد حذف هذا السجل؟')) return
    await deleteRecord(id)
    load(month)
  }

  const handleEdit = (date) => navigate(`/entry?date=${date}`)

  const calcAmount = (rec) => {
    if (!rec.record_items?.length) return rec.total_amount || 0
    const computed = rec.record_items.reduce((sum, ri) => {
      const price = priceMap[ri.item_id] || ri.price || 0
      return sum + (ri.washed || 0) * price
    }, 0)
    return computed > 0 ? computed : (rec.total_amount || 0)
  }

  const handleExportDay = (rec) => {
    exportDayExcel({ record: rec, priceMap, laundryName: localStorage.getItem('laundryName') || '' })
  }

  const totalAmount = records.reduce((a, r) => a + calcAmount(r), 0)

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-800">السجل اليومي</h1>
          <p className="text-sm text-slate-500 mt-0.5">عرض وتعديل سجلات الشهر</p>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <label className="text-sm text-slate-500">الشهر:</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="min-w-0 flex-1 sm:flex-none border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">جاري التحميل...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">
          لا توجد سجلات لشهر {formatMonth(month)}
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3 mb-4">
            {records.map(rec => {
              const amount = calcAmount(rec)
              return (
                <div key={rec.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-700">{rec.date}</div>
                      <div className="text-sm text-slate-500 mt-0.5">{rec.client || '—'}</div>
                    </div>
                    <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                      rec.total_remaining <= 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {rec.total_remaining <= 0 ? 'مكتمل' : `متبقي ${rec.total_remaining}`}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="rounded-lg bg-slate-50 p-2">
                      <div className="text-[11px] text-slate-400">المستلم</div>
                      <div className="text-sm font-medium text-slate-700">{rec.total_received}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <div className="text-[11px] text-slate-400">المغسول نظيف</div>
                      <div className="text-sm font-medium text-slate-700">{rec.total_washed}</div>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-2">
                      <div className="text-[11px] text-slate-400">المبلغ</div>
                      <div className="text-sm font-medium text-blue-700">{amount.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-center">
                    <div className="rounded-lg bg-blue-50 p-2">
                      <div className="text-[11px] text-slate-400">متبقي عند المغسلة 🔵</div>
                      <div className="text-sm font-medium text-blue-700">
                        {rec.record_items?.reduce((a, ri) => a + (ri.remaining_at_laundry || 0), 0) || 0}
                      </div>
                    </div>
                    <div className="rounded-lg bg-yellow-50 p-2">
                      <div className="text-[11px] text-slate-400">للمعالجة 🟡</div>
                      <div className="text-sm font-medium text-yellow-700">
                        {rec.record_items?.reduce((a, ri) => a + (ri.for_treatment || 0), 0) || 0}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleEdit(rec.date)}
                      className="flex-1 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                      تعديل
                    </button>
                    <button onClick={() => handleExportDay(rec)}
                      className="flex-1 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 flex items-center justify-center gap-1">
                      <ExportIcon /> Excel
                    </button>
                    <button onClick={() => handleDelete(rec.id)}
                      className="flex-1 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                      حذف
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden mb-4 overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-500 text-xs">التاريخ</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500 text-xs">العميل</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs">المستلم</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs">مغسول نظيف</th>
                  <th className="text-center px-4 py-3 font-medium text-yellow-500 text-xs">للمعالجة 🟡</th>
                  <th className="text-center px-4 py-3 font-medium text-blue-400 text-xs">عند المغسلة 🔵</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs">المتبقي الكلي</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs">المبلغ</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs">الحالة</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {records.map(rec => {
                  const amount = calcAmount(rec)
                  return (
                    <tr key={rec.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-700 font-medium">{rec.date}</td>
                      <td className="px-4 py-3 text-slate-600">{rec.client || '—'}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{rec.total_received}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{rec.total_washed}</td>
                      <td className="px-4 py-3 text-center text-yellow-600 font-medium">
                        {rec.record_items?.reduce((a, ri) => a + (ri.for_treatment || 0), 0) || 0}
                      </td>
                      <td className="px-4 py-3 text-center text-blue-600 font-medium">
                        {rec.record_items?.reduce((a, ri) => a + (ri.remaining_at_laundry || 0), 0) || 0}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={rec.total_remaining > 0 ? 'text-blue-600 font-medium' : 'text-slate-400'}>
                          {rec.total_remaining}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-slate-700">
                        {amount.toFixed(2)} ر.س
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          rec.total_remaining <= 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {rec.total_remaining <= 0 ? 'مكتمل' : `متبقي ${rec.total_remaining}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center items-center">
                          <button onClick={() => handleEdit(rec.date)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium">تعديل</button>
                          <button onClick={() => handleExportDay(rec)}
                            className="text-xs text-green-600 hover:text-green-800 font-medium flex items-center gap-0.5">
                            <ExportIcon /> Excel
                          </button>
                          <button onClick={() => handleDelete(rec.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium">حذف</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={7} className="px-4 py-3 text-sm font-medium text-slate-600 text-right">
                    إجمالي شهر {formatMonth(month)}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-800">
                    {totalAmount.toFixed(2)} ر.س
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

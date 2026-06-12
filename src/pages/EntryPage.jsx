import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { ITEMS, SECTIONS } from '../lib/constants'
import { useLaundry } from '../hooks/useLaundry'
import toast from 'react-hot-toast'

const today = () => new Date().toISOString().split('T')[0]

function initRows(prices = {}, carry = {}, carryTreatment = {}) {
  return ITEMS.map(item => ({
    item_id:         item.id,
    ar:              item.ar,
    en:              item.en,
    sec:             item.sec,
    carry:           carry[item.id] || 0,
    carry_treatment: carryTreatment[item.id] || 0,
    new_qty:         0,
    washed:          0,
    for_treatment:   0,
    price:           prices[item.id] || 0,
  }))
}

function calcRow(row) {
  // total = ترحيل عادي + ترحيل معالجة + جديد اليوم
  const total_received        = row.carry + (row.carry_treatment || 0) + row.new_qty
  // متبقية عند المغسلة = الإجمالي - مغسولة - للمعالجة
  const remaining_at_laundry  = total_received - row.washed - row.for_treatment
  // المتبقي الكلي = عند المغسلة + للمعالجة
  const remaining              = remaining_at_laundry + row.for_treatment
  const amount                 = row.washed * row.price
  return { ...row, total_received, remaining_at_laundry, remaining, amount }
}

export default function EntryPage() {
  const { fetchRecord, fetchPrevRecord, fetchPrices, saveRecord, loading } = useLaundry()
  const location = useLocation()

  const [date, setDate]       = useState(today())
  const [day, setDay]         = useState('')
  const [client, setClient]   = useState('')
  const [rows, setRows]       = useState([])
  const [isSaved, setIsSaved] = useState(false)
  const [carryDate, setCarryDate] = useState(null)

  const loadDate = useCallback(async (d) => {
    const [existing, prev, prices] = await Promise.all([
      fetchRecord(d).catch(() => null),
      fetchPrevRecord(d).catch(() => null),
      fetchPrices().catch((err) => { console.error('fetchPrices error:', err); return [] }),
    ])

    const pm = {}
    prices.forEach(p => { if (p.price > 0) pm[p.item_id] = p.price })

    // carry من remaining_at_laundry أمس، carry_treatment من for_treatment أمس
    const carry = {}
    const carryTreatment = {}
    if (prev?.record_items) {
      prev.record_items.forEach(ri => {
        if ((ri.remaining_at_laundry || 0) > 0) carry[ri.item_id] = ri.remaining_at_laundry
        if ((ri.for_treatment || 0) > 0) carryTreatment[ri.item_id] = ri.for_treatment
      })
      setCarryDate(prev.date)
    } else {
      setCarryDate(null)
    }

    if (existing?.record_items) {
      setDay(existing.day || '')
      setClient(existing.client || '')
      setIsSaved(true)
      const loadedRows = ITEMS.map(item => {
        const ri = existing.record_items.find(r => r.item_id === item.id) || {}
        return calcRow({
          item_id:         item.id,
          ar:              item.ar,
          en:              item.en,
          sec:             item.sec,
          carry:           ri.carry           ?? carry[item.id]        ?? 0,
          carry_treatment: ri.carry_treatment  ?? carryTreatment[item.id] ?? 0,
          new_qty:         ri.new_qty          ?? 0,
          washed:          ri.washed           ?? 0,
          for_treatment:   ri.for_treatment    ?? 0,
          price:           pm[item.id] > 0 ? pm[item.id] : (ri.price || 0),
        })
      })
      setRows(loadedRows)
    } else {
      setIsSaved(false)
      setRows(initRows(pm, carry, carryTreatment).map(calcRow))
    }
  }, [fetchRecord, fetchPrevRecord, fetchPrices])

  useEffect(() => {
    if (date) loadDate(date)
  }, [date, loadDate, location.pathname])

  const updateRow = (idx, field, value) => {
    setRows(prev => {
      const next = [...prev]
      next[idx] = calcRow({ ...next[idx], [field]: Math.max(0, Number(value) || 0) })
      return next
    })
  }

  const handleSave = async () => {
    if (!date) { toast.error('اختر التاريخ أولاً'); return }
    await saveRecord({ date, day, client, items: rows })
    setIsSaved(true)
  }

  const handleNewDay = () => {
    const next = new Date(date)
    next.setDate(next.getDate() + 1)
    setDate(next.toISOString().split('T')[0])
    setDay('')
    setClient('')
    setIsSaved(false)
  }

  const totals = rows.reduce(
    (acc, r) => ({
      received:             acc.received             + r.total_received,
      washed:               acc.washed               + r.washed,
      for_treatment:        acc.for_treatment        + r.for_treatment,
      remaining_at_laundry: acc.remaining_at_laundry + r.remaining_at_laundry,
      remaining:            acc.remaining            + r.remaining,
      amount:               acc.amount               + r.amount,
    }),
    { received: 0, washed: 0, for_treatment: 0, remaining_at_laundry: 0, remaining: 0, amount: 0 }
  )

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-800">إدخال يومي</h1>
          <p className="text-sm text-slate-500 mt-0.5">أدخل بيانات الاستلام والتسليم اليومي</p>
        </div>
        {isSaved && (
          <span className="bg-green-50 text-green-700 text-xs font-medium px-3 py-1 rounded-full border border-green-200">
            ✅ محفوظ
          </span>
        )}
      </div>

      {/* Header fields */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">التاريخ</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">اليوم</label>
            <input type="text" value={day} onChange={e => setDay(e.target.value)} placeholder="مثال: الأحد"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">اسم العميل</label>
            <input type="text" value={client} onChange={e => setClient(e.target.value)} placeholder="مثال: جولدن دلة"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* Carry info */}
      {carryDate && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-600 mb-4 flex flex-wrap gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-400 inline-block"></span>
            ترحيل عادي من {carryDate}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>
            ترحيل معالجة من {carryDate}
          </span>
        </div>
      )}
      {isSaved && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm text-green-700 mb-4 flex items-center gap-2">
          <span>✅</span>
          <span>بيانات يوم {date} محفوظة — يمكنك التعديل والضغط على حفظ/تحديث</span>
        </div>
      )}

      {/* Tables per section */}
      {SECTIONS.map(sec => {
        const secRows = rows.map((r, idx) => ({ ...r, idx })).filter(r => r.sec === sec.id)
        return (
          <div key={sec.id} className="bg-white rounded-xl border border-slate-200 mb-4 overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100">
              <span className="text-sm font-medium text-slate-600">{sec.label}</span>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {secRows.map(row => (
                <div key={row.item_id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-700 text-sm">{row.ar}</div>
                      <div className="text-slate-400 text-xs mt-0.5">{row.en}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {row.carry > 0 && (
                        <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">🔵 {row.carry}</span>
                      )}
                      {row.carry_treatment > 0 && (
                        <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded-full">🟡 {row.carry_treatment}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <label className="block">
                      <span className="block text-xs font-medium text-slate-500 mb-1">جديد اليوم</span>
                      <input type="number" min="0" inputMode="numeric" value={row.new_qty || ''}
                        onChange={e => updateRow(row.idx, 'new_qty', e.target.value)}
                        placeholder="0"
                        className="w-full text-center border border-slate-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </label>
                    <label className="block">
                      <span className="block text-xs font-medium text-slate-500 mb-1">مغسولة ✅</span>
                      <input type="number" min="0" inputMode="numeric" value={row.washed || ''}
                        onChange={e => updateRow(row.idx, 'washed', e.target.value)}
                        placeholder="0"
                        className="w-full text-center border border-slate-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </label>
                    <label className="block">
                      <span className="block text-xs font-medium text-slate-500 mb-1">للمعالجة 🟡</span>
                      <input type="number" min="0" inputMode="numeric" value={row.for_treatment || ''}
                        onChange={e => updateRow(row.idx, 'for_treatment', e.target.value)}
                        placeholder="0"
                        className="w-full text-center border border-slate-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </label>
                  </div>

                  {(row.total_received > 0 || row.washed > 0 || row.for_treatment > 0) && (
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-slate-50 p-2">
                        <div className="text-slate-400">الإجمالي</div>
                        <div className="font-semibold text-slate-700 mt-0.5">{row.total_received}</div>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-2">
                        <div className="text-slate-400">عند المغسلة</div>
                        <div className={`font-semibold mt-0.5 ${row.remaining_at_laundry < 0 ? 'text-red-500' : 'text-blue-600'}`}>
                          {row.remaining_at_laundry}
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2">
                        <div className="text-slate-400">المبلغ</div>
                        <div className="font-semibold text-slate-700 mt-0.5">
                          {row.amount > 0 ? `${row.amount.toFixed(2)}` : '—'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[780px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs w-40">الصنف</th>
                    <th className="text-center px-2 py-2.5 font-medium text-blue-400 text-xs">ترحيل 🔵</th>
                    <th className="text-center px-2 py-2.5 font-medium text-yellow-500 text-xs">معالجة 🟡</th>
                    <th className="text-center px-2 py-2.5 font-medium text-slate-500 text-xs">جديد اليوم</th>
                    <th className="text-center px-2 py-2.5 font-medium text-slate-500 text-xs">الإجمالي</th>
                    <th className="text-center px-2 py-2.5 font-medium text-slate-500 text-xs">مغسولة ✅</th>
                    <th className="text-center px-2 py-2.5 font-medium text-slate-500 text-xs">للمعالجة 🟡</th>
                    <th className="text-center px-2 py-2.5 font-medium text-slate-500 text-xs">عند المغسلة 🔵</th>
                    <th className="text-center px-2 py-2.5 font-medium text-slate-500 text-xs">السعر</th>
                    <th className="text-center px-2 py-2.5 font-medium text-slate-500 text-xs">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {secRows.map(row => (
                    <tr key={row.item_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-2">
                        <div className="font-medium text-slate-700 text-xs">{row.ar}</div>
                        <div className="text-slate-400 text-xs">{row.en}</div>
                      </td>
                      {/* ترحيل عادي */}
                      <td className="text-center px-2 py-2">
                        {row.carry > 0
                          ? <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">{row.carry}</span>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      {/* ترحيل معالجة */}
                      <td className="text-center px-2 py-2">
                        {row.carry_treatment > 0
                          ? <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded-full">{row.carry_treatment}</span>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      {/* جديد اليوم - input */}
                      <td className="text-center px-1.5 py-1.5">
                        <input type="number" min="0" inputMode="numeric" value={row.new_qty || ''}
                          onChange={e => updateRow(row.idx, 'new_qty', e.target.value)}
                          placeholder="0"
                          className="w-14 text-center border border-slate-200 rounded-md py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </td>
                      {/* الإجمالي */}
                      <td className="text-center px-2 py-2 font-semibold text-slate-700">
                        {row.total_received > 0 ? row.total_received : <span className="text-slate-300">—</span>}
                      </td>
                      {/* مغسولة - input */}
                      <td className="text-center px-1.5 py-1.5">
                        <input type="number" min="0" inputMode="numeric" value={row.washed || ''}
                          onChange={e => updateRow(row.idx, 'washed', e.target.value)}
                          placeholder="0"
                          className="w-14 text-center border border-slate-200 rounded-md py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </td>
                      {/* للمعالجة - input */}
                      <td className="text-center px-1.5 py-1.5">
                        <input type="number" min="0" inputMode="numeric" value={row.for_treatment || ''}
                          onChange={e => updateRow(row.idx, 'for_treatment', e.target.value)}
                          placeholder="0"
                          className="w-14 text-center border border-slate-200 rounded-md py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </td>
                      {/* متبقية عند المغسلة */}
                      <td className="text-center px-2 py-2">
                        {(row.total_received > 0 || row.washed > 0 || row.for_treatment > 0) ? (
                          <span className={`font-semibold text-sm ${
                            row.remaining_at_laundry < 0 ? 'text-red-500' :
                            row.remaining_at_laundry > 0 ? 'text-blue-600' : 'text-green-600'
                          }`}>
                            {row.remaining_at_laundry}
                          </span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      {/* السعر */}
                      <td className="text-center px-2 py-2 text-xs text-slate-500">
                        {row.price > 0 ? `${row.price} ر.س` : <span className="text-slate-300">—</span>}
                      </td>
                      {/* المبلغ */}
                      <td className="text-center px-2 py-2 text-xs font-medium text-slate-700">
                        {row.amount > 0 ? `${row.amount.toFixed(2)} ر.س` : <span className="text-slate-300 font-normal">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {[
          { label: 'إجمالي المستلم',     value: totals.received,                          color: 'text-slate-800' },
          { label: 'مغسولة نظيف ✅',      value: totals.washed,                            color: 'text-green-700' },
          { label: 'للمعالجة 🟡',         value: totals.for_treatment,                     color: 'text-yellow-600' },
          { label: 'عند المغسلة 🔵',      value: totals.remaining_at_laundry,              color: 'text-blue-600'  },
          { label: 'المتبقي الكلي',       value: totals.remaining,                         color: 'text-slate-700' },
          { label: 'مبلغ اليوم',          value: `${totals.amount.toFixed(2)} ر.س`,        color: 'text-blue-700'  },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-slate-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
        <button onClick={handleNewDay}
          className="w-full sm:w-auto px-4 py-2.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors text-center">
          ➕ يوم جديد
        </button>
        <button onClick={handleSave} disabled={loading}
          className="w-full sm:w-auto px-6 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-60 text-center">
          {loading ? 'جاري الحفظ...' : isSaved ? '💾 تحديث' : '💾 حفظ'}
        </button>
      </div>
    </div>
  )
}

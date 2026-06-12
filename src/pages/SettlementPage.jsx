import { useState, useEffect } from 'react'
import { useLaundry } from '../hooks/useLaundry'
import { ITEMS, SECTIONS, ARABIC_MONTHS } from '../lib/constants'
import toast from 'react-hot-toast'

function getCurrentYearMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonth(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return `${ARABIC_MONTHS[parseInt(m) - 1]} ${y}`
}

export default function SettlementPage() {
  const { fetchMonthRecords, fetchPrices } = useLaundry()
  const [month, setMonth]       = useState(getCurrentYearMonth())
  const [laundryName, setLaundryName] = useState('')
  const [records, setRecords]   = useState([])
  const [priceMap, setPriceMap] = useState({})
  const [loading, setLoading]   = useState(false)

  const load = async (m) => {
    setLoading(true)
    try {
      const [recs, prices] = await Promise.all([
        fetchMonthRecords(m),
        fetchPrices(),
      ])
      setRecords(recs)
      const pm = {}
      prices.forEach(p => { pm[p.item_id] = p.price })
      setPriceMap(pm)
    } catch { toast.error('خطأ في التحميل') }
    finally { setLoading(false) }
  }

  useEffect(() => { load(month) }, [month])

  // Aggregate washed quantities
  // Price priority: prices table (current) → last seen ri.price in records (fallback)
  const agg = {}
  ITEMS.forEach(item => { agg[item.id] = { ...item, totalWashed: 0, totalForTreatment: 0, price: 0 } })
  records.forEach(rec => {
    rec.record_items?.forEach(ri => {
      if (agg[ri.item_id]) {
        agg[ri.item_id].totalWashed       += ri.washed        || 0
        agg[ri.item_id].totalForTreatment += ri.for_treatment || 0
        if ((ri.price || 0) > 0) agg[ri.item_id].price = ri.price
      }
    })
  })
  // Override with current prices table (takes final priority)
  Object.entries(priceMap).forEach(([item_id, price]) => {
    if (agg[item_id] && price > 0) agg[item_id].price = price
  })

  const grandTotal = Object.values(agg).reduce((a, i) => a + i.totalWashed * i.price, 0)
  const totalPieces = Object.values(agg).reduce((a, i) => a + i.totalWashed, 0)
  const totalForTreatment = Object.values(agg).reduce((a, i) => a + i.totalForTreatment, 0)

  // End-of-month remaining
  const lastRec = records[records.length - 1]
  const endRemaining = lastRec?.total_remaining || 0
  const endRemainingAtLaundry = lastRec?.record_items?.reduce((a, ri) => a + (ri.remaining_at_laundry || 0), 0) || 0
  const endForTreatment = lastRec?.record_items?.reduce((a, ri) => a + (ri.for_treatment || 0), 0) || 0

  const handlePrint = () => {
    const rows = Object.values(agg).filter(i => i.totalWashed > 0)
      .map(i => `<tr><td>${i.ar}</td><td>${i.en}</td><td style="text-align:center">${i.totalWashed}</td><td style="text-align:center">${i.price.toFixed(2)}</td><td style="text-align:center">${(i.totalWashed * i.price).toFixed(2)}</td></tr>`)
      .join('')
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>تسوية ${formatMonth(month)}</title>
    <style>body{font-family:Arial;direction:rtl;padding:24px;font-size:13px}h2{text-align:center}
    table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ccc;padding:7px 10px}
    th{background:#f5f5f5;text-align:center}.total{font-size:16px;font-weight:bold;text-align:center;padding:14px;border-top:2px solid #333;margin-top:10px}
    .sigs{display:flex;justify-content:space-between;margin-top:48px;font-size:12px;color:#555}</style></head><body>
    <h2>تسوية شهرية — ${formatMonth(month)}</h2>
    <p style="text-align:center;color:#666;font-size:12px">مع: ${laundryName || 'المغسلة'} | ${records.length} يوم عمل</p>
    <table><thead><tr><th>الصنف</th><th>Item</th><th>عدد القطع</th><th>سعر القطعة (ر.س)</th><th>الإجمالي (ر.س)</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="total">الإجمالي المستحق: ${grandTotal.toFixed(2)} ريال سعودي</div>
    <div class="sigs"><span>توقيع الفندق: _______________</span><span>توقيع المغسلة: _______________</span></div>
    </body></html>`)
    win.document.close()
    win.print()
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-800">التسوية الشهرية</h1>
          <p className="text-sm text-slate-500 mt-0.5">ملخص الشهر والمبلغ المستحق للمغسلة</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">الشهر</label>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">اسم المغسلة</label>
            <input type="text" value={laundryName} onChange={e => setLaundryName(e.target.value)}
              placeholder="اسم المغسلة للطباعة"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">جاري التحميل...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">
          لا توجد بيانات لشهر {formatMonth(month)}
        </div>
      ) : (
        <>
          {endRemaining > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span>⚠️</span>
                <span>تنبيه: {endRemaining} قطعة متبقية كلياً في نهاية الشهر</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span>🔵 متبقي عادي: {endRemainingAtLaundry}</span>
                <span>🟡 للمعالجة: {endForTreatment}</span>
              </div>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5">
            {[
              { label: 'أيام عمل',         value: records.length },
              { label: 'إجمالي القطع المغسولة', value: totalPieces },
              { label: 'للمعالجة (غير محسوبة)', value: totalForTreatment, color: 'text-yellow-600' },
              { label: 'متبقي آخر الشهر',  value: endRemaining, color: endRemaining > 0 ? 'text-amber-600' : 'text-green-600' },
              { label: 'إجمالي التسوية',    value: `${grandTotal.toFixed(2)} ر.س`, color: 'text-blue-700' },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <div className={`text-xl font-bold ${c.color || 'text-slate-800'}`}>{c.value}</div>
                <div className="text-xs text-slate-500 mt-1">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Per section tables */}
          {SECTIONS.map(sec => {
            const items = Object.values(agg).filter(i => i.sec === sec.id && i.totalWashed > 0)
            if (!items.length) return null
            const secTotal = items.reduce((a, i) => a + i.totalWashed * i.price, 0)
            return (
              <div key={sec.id} className="bg-white rounded-xl border border-slate-200 mb-4 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-600">{sec.label}</span>
                </div>
                <div className="sm:hidden divide-y divide-slate-100">
                  {items.map(item => (
                    <div key={item.id} className="p-4">
                      <div className="mb-3">
                        <div className="font-medium text-slate-700 text-sm">{item.ar}</div>
                        <div className="text-slate-400 text-xs mt-0.5">{item.en}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-slate-50 p-2">
                          <div className="text-[11px] text-slate-400">القطع</div>
                          <div className="text-sm font-medium text-slate-700">{item.totalWashed}</div>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-2">
                          <div className="text-[11px] text-slate-400">السعر</div>
                          <div className="text-sm font-medium text-slate-700">{item.price.toFixed(2)}</div>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-2">
                          <div className="text-[11px] text-slate-400">الإجمالي</div>
                          <div className="text-sm font-medium text-slate-800">{(item.totalWashed * item.price).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="bg-slate-50 p-3 text-center text-sm font-bold text-slate-700">
                    {secTotal.toFixed(2)} ر.س
                  </div>
                </div>
                <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm min-w-[360px]">
                  <thead className="border-b border-slate-100">
                    <tr>
                      <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs w-48">الصنف</th>
                      <th className="text-center px-4 py-2.5 font-medium text-slate-500 text-xs">القطع المغسولة</th>
                      <th className="text-center px-4 py-2.5 font-medium text-slate-500 text-xs">سعر القطعة</th>
                      <th className="text-center px-4 py-2.5 font-medium text-slate-500 text-xs">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-slate-700 text-xs">{item.ar}</div>
                          <div className="text-slate-400 text-xs">{item.en}</div>
                        </td>
                        <td className="text-center px-4 py-2.5 text-slate-700">{item.totalWashed}</td>
                        <td className="text-center px-4 py-2.5 text-slate-500 text-xs">{item.price.toFixed(2)} ر.س</td>
                        <td className="text-center px-4 py-2.5 font-medium text-slate-800">{(item.totalWashed * item.price).toFixed(2)} ر.س</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-100">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-xs font-medium text-slate-500 text-right">مجموع القسم</td>
                      <td className="text-center px-4 py-2 font-bold text-slate-700 text-sm">{secTotal.toFixed(2)} ر.س</td>
                    </tr>
                  </tfoot>
                </table>
                </div>
              </div>
            )
          })}

          {/* Grand total */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 text-center mb-4">
            <div className="text-sm text-slate-500 mb-1">الإجمالي المستحق</div>
            <div className="text-3xl font-bold text-blue-700">{grandTotal.toFixed(2)} ريال سعودي</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
            <div className="text-xs text-slate-400 leading-6 break-words">
              توقيع الفندق: _______________   توقيع المغسلة: _______________
            </div>
            <button onClick={handlePrint}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors text-center">
              🖨️ طباعة التسوية
            </button>
          </div>
        </>
      )}
    </div>
  )
}

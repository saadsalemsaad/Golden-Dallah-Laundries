import { useState, useEffect } from 'react'
import { ITEMS, SECTIONS } from '../lib/constants'
import { useLaundry } from '../hooks/useLaundry'

export default function PricesPage() {
  const { fetchPrices, savePrices, loading } = useLaundry()
  const [priceMap, setPriceMap] = useState({})

  useEffect(() => {
    fetchPrices().then(data => {
      const map = {}
      data.forEach(p => { map[p.item_id] = p.price })
      setPriceMap(map)
    })
  }, [])

  const handleSave = () => {
    savePrices(priceMap)
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-800">الأسعار</h1>
          <p className="text-sm text-slate-500 mt-0.5">سعر الغسيل لكل قطعة بالريال السعودي</p>
        </div>
        <button onClick={handleSave} disabled={loading}
          className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-60 text-center">
          {loading ? 'جاري الحفظ...' : '💾 حفظ الأسعار'}
        </button>
      </div>

      {SECTIONS.map(sec => (
        <div key={sec.id} className="bg-white rounded-xl border border-slate-200 mb-4 overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100">
            <span className="text-sm font-medium text-slate-600">{sec.label}</span>
          </div>
          <div className="sm:hidden divide-y divide-slate-100">
            {ITEMS.filter(i => i.sec === sec.id).map(item => (
              <div key={item.id} className="p-4">
                <div className="mb-3">
                  <div className="font-medium text-slate-700 text-sm">{item.ar}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{item.en}</div>
                </div>
                <input
                  type="number" min="0" step="0.5"
                  value={priceMap[item.id] || ''}
                  onChange={e => setPriceMap(prev => ({ ...prev, [item.id]: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  className="w-full text-center border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
          <table className="hidden sm:table w-full text-sm">
            <thead className="border-b border-slate-100">
              <tr>
                <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs w-1/2">الصنف</th>
                <th className="text-center px-4 py-2.5 font-medium text-slate-500 text-xs">السعر (ر.س / قطعة)</th>
              </tr>
            </thead>
            <tbody>
              {ITEMS.filter(i => i.sec === sec.id).map(item => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-700 text-sm">{item.ar}</div>
                    <div className="text-slate-400 text-xs">{item.en}</div>
                  </td>
                  <td className="text-center px-4 py-2">
                    <input
                      type="number" min="0" step="0.5"
                      value={priceMap[item.id] || ''}
                      onChange={e => setPriceMap(prev => ({ ...prev, [item.id]: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      className="w-24 text-center border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

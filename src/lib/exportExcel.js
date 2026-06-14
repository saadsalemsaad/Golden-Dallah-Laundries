import * as XLSX from 'xlsx'
import { ITEMS, ARABIC_MONTHS } from './constants'

const ITEM_NAME = {}
ITEMS.forEach(i => { ITEM_NAME[i.id] = i.ar })

const DETAIL_HEADERS = [
  'التاريخ', 'اليوم', 'اسم الصنف',
  'المستلمة', 'ترحيل عادي', 'ترحيل معالجة', 'جديد اليوم',
  'مغسول نظيف', 'للمعالجة', 'باقي عند المغسلة',
  'السعر', 'المبلغ',
]
const DETAIL_WIDTHS = [13, 9, 20, 10, 12, 15, 12, 12, 10, 20, 9, 12]

const DAY_HEADERS = [
  'التاريخ', 'اليوم',
  'المستلمة', 'مغسول نظيف', 'للمعالجة', 'باقي عند المغسلة', 'المبلغ',
]
const DAY_WIDTHS = [13, 9, 12, 14, 12, 20, 14]

const SETTLE_HEADERS = ['اسم الصنف', 'القطع المغسولة', 'للمعالجة', 'السعر', 'المبلغ']
const SETTLE_WIDTHS  = [22, 16, 12, 10, 14]

// ── helpers ──────────────────────────────────────────────────────────────────

function detailRows(records, priceMap) {
  const rows = []
  let tRec = 0, tCarry = 0, tCarryT = 0, tNew = 0
  let tWash = 0, tTreat = 0, tRem = 0, tAmt = 0

  records.forEach(rec => {
    ;(rec.record_items || []).forEach(ri => {
      const price  = priceMap[ri.item_id] ?? ri.price ?? 0
      const amount = (ri.washed || 0) * price
      rows.push([
        rec.date, rec.day || '',
        ITEM_NAME[ri.item_id] || ri.item_id,
        ri.total_received       || 0,
        ri.carry                || 0,
        ri.carry_treatment      || 0,
        ri.new_qty              || 0,
        ri.washed               || 0,
        ri.for_treatment        || 0,
        ri.remaining_at_laundry || 0,
        price,
        +amount.toFixed(2),
      ])
      tRec   += ri.total_received       || 0
      tCarry += ri.carry                || 0
      tCarryT+= ri.carry_treatment      || 0
      tNew   += ri.new_qty              || 0
      tWash  += ri.washed               || 0
      tTreat += ri.for_treatment        || 0
      tRem   += ri.remaining_at_laundry || 0
      tAmt   += amount
    })
  })

  rows.push(['إجمالي الشهر', '', '', tRec, tCarry, tCarryT, tNew, tWash, tTreat, tRem, '', +tAmt.toFixed(2)])
  return rows
}

function dayRows(records, priceMap) {
  const rows = []
  let tRec = 0, tWash = 0, tTreat = 0, tRem = 0, tAmt = 0

  records.forEach(rec => {
    const items = rec.record_items || []
    const rec_  = items.reduce((a, ri) => a + (ri.total_received       || 0), 0)
    const wash  = items.reduce((a, ri) => a + (ri.washed               || 0), 0)
    const treat = items.reduce((a, ri) => a + (ri.for_treatment        || 0), 0)
    const rem   = items.reduce((a, ri) => a + (ri.remaining_at_laundry || 0), 0)
    const amt   = items.reduce((a, ri) => {
      const p = priceMap[ri.item_id] ?? ri.price ?? 0
      return a + (ri.washed || 0) * p
    }, 0)
    rows.push([rec.date, rec.day || '', rec_, wash, treat, rem, +amt.toFixed(2)])
    tRec += rec_; tWash += wash; tTreat += treat; tRem += rem; tAmt += amt
  })

  rows.push(['إجمالي الشهر', '', tRec, tWash, tTreat, tRem, +tAmt.toFixed(2)])
  return rows
}

function settlementRows(records, priceMap) {
  const agg = {}
  ITEMS.forEach(i => { agg[i.id] = { ar: i.ar, washed: 0, treatment: 0, price: 0 } })

  records.forEach(rec => {
    rec.record_items?.forEach(ri => {
      if (!agg[ri.item_id]) return
      agg[ri.item_id].washed    += ri.washed        || 0
      agg[ri.item_id].treatment += ri.for_treatment || 0
      if ((ri.price || 0) > 0) agg[ri.item_id].price = ri.price
    })
  })
  Object.entries(priceMap).forEach(([id, p]) => { if (agg[id] && p > 0) agg[id].price = p })

  const rows = []
  let tWash = 0, tTreat = 0, tAmt = 0

  Object.values(agg).filter(i => i.washed > 0 || i.treatment > 0).forEach(i => {
    const amt = i.washed * i.price
    rows.push([i.ar, i.washed, i.treatment, i.price, +amt.toFixed(2)])
    tWash += i.washed; tTreat += i.treatment; tAmt += amt
  })

  rows.push(['الإجمالي', tWash, tTreat, '', +tAmt.toFixed(2)])
  return rows
}

function filename(laundryName, monthName, year) {
  return `${(laundryName || 'مغسلة').replace(/\s+/g, '-')}-${monthName}-${year}.xlsx`
}

function makeSheet(headers, rows, widths) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = widths.map(w => ({ wch: w }))
  return ws
}

function singleDayRows(record, priceMap) {
  const rows = []
  let tRec = 0, tCarry = 0, tCarryT = 0, tNew = 0
  let tWash = 0, tTreat = 0, tRem = 0, tAmt = 0

  ;(record.record_items || []).forEach(ri => {
    const price  = priceMap[ri.item_id] ?? ri.price ?? 0
    const amount = (ri.washed || 0) * price
    rows.push([
      ITEM_NAME[ri.item_id] || ri.item_id,
      ri.total_received       || 0,
      ri.carry                || 0,
      ri.carry_treatment      || 0,
      ri.new_qty              || 0,
      ri.washed               || 0,
      ri.for_treatment        || 0,
      ri.remaining_at_laundry || 0,
      price,
      +amount.toFixed(2),
    ])
    tRec   += ri.total_received       || 0
    tCarry += ri.carry                || 0
    tCarryT+= ri.carry_treatment      || 0
    tNew   += ri.new_qty              || 0
    tWash  += ri.washed               || 0
    tTreat += ri.for_treatment        || 0
    tRem   += ri.remaining_at_laundry || 0
    tAmt   += amount
  })

  rows.push(['الإجمالي', tRec, tCarry, tCarryT, tNew, tWash, tTreat, tRem, '', +tAmt.toFixed(2)])
  return rows
}

const DAY_ITEM_HEADERS = [
  'اسم الصنف', 'المستلمة', 'ترحيل عادي', 'ترحيل معالجة', 'جديد اليوم',
  'مغسول نظيف', 'للمعالجة', 'باقي عند المغسلة', 'السعر', 'المبلغ',
]
const DAY_ITEM_WIDTHS = [20, 10, 12, 15, 12, 12, 10, 20, 9, 12]

// ── public exports ────────────────────────────────────────────────────────────

/** LogPage — تفصيلي: صنف بصنف */
export function exportMonthExcel({ records, priceMap, month, laundryName }) {
  const [year, m] = month.split('-')
  const monthName = ARABIC_MONTHS[parseInt(m) - 1]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, makeSheet(DETAIL_HEADERS, detailRows(records, priceMap), DETAIL_WIDTHS), 'تفصيلي')
  XLSX.writeFile(wb, filename(laundryName, monthName, year))
}

/** LogPage — يوم بيوم: صف واحد لكل يوم */
export function exportDayByDayExcel({ records, priceMap, month, laundryName }) {
  const [year, m] = month.split('-')
  const monthName = ARABIC_MONTHS[parseInt(m) - 1]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, makeSheet(DAY_HEADERS, dayRows(records, priceMap), DAY_WIDTHS), 'يوم بيوم')
  XLSX.writeFile(wb, filename(laundryName, monthName, year))
}

/** LogPage — تصدير يوم واحد بتفاصيل أصنافه */
export function exportDayExcel({ record, priceMap, laundryName }) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, makeSheet(DAY_ITEM_HEADERS, singleDayRows(record, priceMap), DAY_ITEM_WIDTHS), record.date)
  const safeName = (laundryName || 'مغسلة').replace(/\s+/g, '-')
  XLSX.writeFile(wb, `${safeName}-${record.date}.xlsx`)
}

/** SettlementPage — ورقتان: بيانات الشهر + التسوية */
export function exportSettlementExcel({ records, priceMap, month, laundryName }) {
  const [year, m] = month.split('-')
  const monthName = ARABIC_MONTHS[parseInt(m) - 1]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, makeSheet(DETAIL_HEADERS, detailRows(records, priceMap), DETAIL_WIDTHS), 'بيانات الشهر')
  XLSX.utils.book_append_sheet(wb, makeSheet(SETTLE_HEADERS, settlementRows(records, priceMap), SETTLE_WIDTHS), 'التسوية')
  XLSX.writeFile(wb, filename(laundryName, monthName, year))
}

import { ITEMS } from './constants'

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function money(value) {
  return Number(value || 0).toFixed(2)
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

function invoiceNumber(record) {
  const suffix = record.id ? String(record.id).slice(0, 8).toUpperCase() : 'LOCAL'
  return `INV-${String(record.date || '').replace(/-/g, '')}-${suffix}`
}

export function printDailyInvoice({ record, organizationName, customerName }) {
  const invoiceItems = (record.record_items || [])
    .filter(item => Number(item.washed || 0) > 0)
    .map(item => {
      const itemDefinition = ITEMS.find(candidate => candidate.id === item.item_id)
      const quantity = Number(item.washed || 0)
      const unitPrice = roundMoney(item.price || 0)
      const amount = roundMoney(quantity * unitPrice)
      return {
        description: itemDefinition?.ar || item.item_id,
        quantity,
        unitPrice,
        amount,
      }
    })

  if (invoiceItems.length === 0) {
    throw new Error('لا توجد أصناف مغسولة لإصدار الفاتورة')
  }

  const subtotal = roundMoney(invoiceItems.reduce((total, item) => total + item.amount, 0))
  const tax = roundMoney(subtotal * 0.15)
  const total = roundMoney(subtotal + tax)
  const invoiceNo = invoiceNumber(record)
  const rows = invoiceItems.map(item => `
    <tr>
      <td>${escapeHtml(item.description)}</td>
      <td>${item.quantity}</td>
      <td>${money(item.unitPrice)} ر.س</td>
      <td>${money(item.amount)} ر.س</td>
    </tr>
  `).join('')

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('يرجى السماح بالنوافذ المنبثقة لإظهار الفاتورة')
  }

  printWindow.document.open()
  printWindow.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>فاتورة ${escapeHtml(invoiceNo)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #1f2937; background: #fff; font-family: Tahoma, Arial, sans-serif; font-size: 13px; }
    .invoice { max-width: 780px; margin: 0 auto; }
    .top { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #1d4ed8; padding-bottom: 18px; }
    .brand h1 { margin: 0 0 7px; color: #1d4ed8; font-size: 26px; }
    .brand p { margin: 3px 0; color: #64748b; }
    .invoice-title { text-align: left; }
    .invoice-title h2 { margin: 0 0 10px; font-size: 24px; color: #111827; }
    .invoice-title p { margin: 4px 0; color: #475569; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 22px 0; }
    .meta-box { border: 1px solid #dbe3ef; border-radius: 6px; padding: 12px 14px; background: #f8fafc; }
    .label { display: block; margin-bottom: 5px; color: #64748b; font-size: 11px; }
    .value { font-weight: 700; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { padding: 11px 10px; background: #1d4ed8; color: #fff; text-align: right; font-weight: 700; }
    td { padding: 11px 10px; border-bottom: 1px solid #e2e8f0; }
    th:not(:first-child), td:not(:first-child) { text-align: center; }
    .summary { width: 330px; margin: 24px 0 0 auto; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    .summary-row.total { border: 0; background: #eff6ff; color: #1d4ed8; font-size: 17px; font-weight: 700; }
    .footer { margin-top: 50px; padding-top: 14px; border-top: 1px solid #cbd5e1; color: #64748b; text-align: center; font-size: 11px; }
    .developer-footer { margin-top: 10px; color: #94a3b8; text-align: center; font-size: 9px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <main class="invoice">
    <header class="top">
      <div class="brand">
        <h1>${escapeHtml(organizationName || 'المغسلة')}</h1>
        <p>فاتورة خدمات غسيل</p>
      </div>
      <div class="invoice-title">
        <h2>فاتورة مبيعات</h2>
        <p><strong>رقم الفاتورة:</strong> ${escapeHtml(invoiceNo)}</p>
        <p><strong>التاريخ:</strong> ${escapeHtml(record.date)}</p>
      </div>
    </header>

    <section class="meta">
      <div class="meta-box"><span class="label">العميل</span><span class="value">${escapeHtml(customerName || 'غير محدد')}</span></div>
      <div class="meta-box"><span class="label">وصف الخدمة</span><span class="value">خدمات الغسيل اليومية</span></div>
    </section>

    <table>
      <thead><tr><th>الوصف</th><th>الكمية</th><th>سعر الوحدة</th><th>المبلغ</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <section class="summary">
      <div class="summary-row"><span>الإجمالي قبل الضريبة</span><strong>${money(subtotal)} ر.س</strong></div>
      <div class="summary-row"><span>ضريبة القيمة المضافة (15%)</span><strong>${money(tax)} ر.س</strong></div>
      <div class="summary-row total"><span>الإجمالي شامل الضريبة</span><strong>${money(total)} ر.س</strong></div>
    </section>

    <footer class="footer">
      <div>شكرًا لتعاملكم معنا</div>
      <div class="developer-footer">تم تطوير النظام بواسطة سعد سالم | للدعم والتواصل: 0507911674</div>
    </footer>
  </main>
</body>
</html>`)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => printWindow.print(), 250)
}

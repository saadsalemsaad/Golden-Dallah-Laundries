export function calculateItemTotals(row) {
  const carry = Number(row.carry || 0)
  const newQty = Number(row.new_qty || 0)
  const washed = Number(row.washed || 0)
  const forTreatment = Number(row.for_treatment || 0)
  const price = Number(row.price || 0)

  const total_received = carry + newQty
  const remaining_at_laundry = Math.max(0, total_received - washed - forTreatment)
  const remaining = remaining_at_laundry + forTreatment
  const amount = washed * price

  return { ...row, total_received, remaining_at_laundry, remaining, amount }
}

export function calculateRecordTotals(record) {
  return (record?.record_items || []).reduce(
    (acc, row) => {
      const item = calculateItemTotals(row)
      return {
        received: acc.received + item.total_received,
        washed: acc.washed + Number(item.washed || 0),
        forTreatment: acc.forTreatment + item.for_treatment,
        atLaundry: acc.atLaundry + item.remaining_at_laundry,
        remaining: acc.remaining + item.remaining,
      }
    },
    { received: 0, washed: 0, forTreatment: 0, atLaundry: 0, remaining: 0 }
  )
}

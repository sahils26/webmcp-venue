export const VENUE_CURRENCY_CODE = 'EUR'

const venueCurrencyFormatter = new Intl.NumberFormat('en-US', {
  currency: VENUE_CURRENCY_CODE,
  maximumFractionDigits: 0,
  style: 'currency',
})

export function formatVenueCurrency(value: number): string {
  return venueCurrencyFormatter.format(value)
}

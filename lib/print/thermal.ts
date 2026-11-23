/**
 * Heaven's Cafe Thermal Receipt Printing System
 * Supports:
 * - 58mm thermal printers (32 chars per line)
 * - 80mm thermal printers (48 chars per line)
 * - Browser-based thermal print with dedicated CSS
 * - QZ Tray / ESC/POS local bridge
 * - PDF export
 */

export interface ReceiptData {
  shopName: string
  shopAddress?: string | null
  shopPhone?: string | null
  invoiceNo: string
  date: string
  time: string
  cashierName: string
  customerName?: string | null
  customerPhone?: string | null
  items: {
    name: string
    quantity: number
    unitPrice: number
    subtotal: number
  }[]
  subtotal: number
  discountAmount: number
  taxEnabled: boolean
  taxRate?: number
  taxLabel?: string
  taxAmount: number
  totalAmount: number
  paymentMethod: string
  amountTendered?: number | null
  changeAmount?: number | null
  paymentRef?: string | null
  isDuplicate?: boolean
  footerLines?: string[]
}

export function formatReceiptPlainText(data: ReceiptData, paperWidth: 58 | 80 = 80): string {
  const width = paperWidth === 58 ? 32 : 44

  const padCenter = (text: string) => {
    if (text.length >= width) return text.substring(0, width)
    const left = Math.floor((width - text.length) / 2)
    return ' '.repeat(left) + text
  }

  const padBetween = (left: string, right: string) => {
    const space = width - left.length - right.length
    if (space <= 0) return `${left} ${right}`
    return left + ' '.repeat(space) + right
  }

  const divider = '='.repeat(width)
  const thinDivider = '-'.repeat(width)

  const lines: string[] = []

  // Header
  lines.push(padCenter(data.shopName.toUpperCase()))
  if (data.shopAddress) lines.push(padCenter(data.shopAddress))
  if (data.shopPhone) lines.push(padCenter(`Tel: ${data.shopPhone}`))
  lines.push(divider)

  if (data.isDuplicate) {
    lines.push(padCenter('*** DUPLICATE / REPRINT ***'))
    lines.push(thinDivider)
  }

  lines.push(padCenter(data.taxEnabled ? 'TAX INVOICE' : 'SALES RECEIPT'))
  lines.push(thinDivider)

  // Meta
  lines.push(padBetween('Bill No:', data.invoiceNo))
  lines.push(padBetween('Date:', `${data.date} ${data.time}`))
  lines.push(padBetween('Cashier:', data.cashierName))
  if (data.customerName) {
    lines.push(padBetween('Customer:', data.customerName))
  }
  if (data.customerPhone) {
    lines.push(padBetween('Phone:', data.customerPhone))
  }
  lines.push(thinDivider)

  // Items Header
  if (paperWidth === 58) {
    lines.push(padBetween('ITEM', 'QTY  RATE   AMT'))
  } else {
    lines.push(padBetween('ITEM', 'QTY    RATE     AMOUNT'))
  }
  lines.push(thinDivider)

  // Items Rows
  for (const item of data.items) {
    const qtyRate = `${item.quantity} x ${item.unitPrice.toFixed(2)}`
    const amt = item.subtotal.toFixed(2)

    if (item.name.length > width - 15) {
      lines.push(item.name)
      lines.push(padBetween(`  ${qtyRate}`, amt))
    } else {
      const right = `${item.quantity.toString().padStart(3)}  ${item.unitPrice.toFixed(2).padStart(6)} ${amt.padStart(7)}`
      lines.push(padBetween(item.name, right))
    }
  }

  lines.push(thinDivider)

  // Totals
  lines.push(padBetween('Subtotal:', `₹${data.subtotal.toFixed(2)}`))
  if (data.discountAmount > 0) {
    lines.push(padBetween('Discount:', `-₹${data.discountAmount.toFixed(2)}`))
  }
  if (data.taxEnabled && data.taxAmount > 0) {
    const taxTitle = `${data.taxLabel || 'Tax'} (${data.taxRate || 0}%):`
    lines.push(padBetween(taxTitle, `₹${data.taxAmount.toFixed(2)}`))
  }

  lines.push(divider)
  lines.push(padBetween('TOTAL:', `₹${data.totalAmount.toFixed(2)}`))
  lines.push(divider)

  // Payment
  lines.push(padBetween('Payment Method:', data.paymentMethod.toUpperCase()))
  if (data.amountTendered) {
    lines.push(padBetween('Cash Tendered:', `₹${data.amountTendered.toFixed(2)}`))
  }
  if (data.changeAmount !== null && data.changeAmount !== undefined && data.changeAmount > 0) {
    lines.push(padBetween('Change Returned:', `₹${data.changeAmount.toFixed(2)}`))
  }
  if (data.paymentRef) {
    lines.push(padBetween('Ref:', data.paymentRef))
  }

  lines.push(thinDivider)

  // Footer
  const footers = data.footerLines && data.footerLines.length > 0
    ? data.footerLines
    : ['Thank you for visiting!', 'Visit us again!']

  for (const f of footers) {
    lines.push(padCenter(f))
  }
  lines.push(divider)
  lines.push('\n') // Clean paper cut feed (avoiding multi-page overflow)

  return lines.join('\n')
}

/**
 * Triggers standard browser printing of the #receipt-print-area element
 */
export function triggerBrowserPrint(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      window.print()
      resolve(true)
    } catch {
      resolve(false)
    }
  })
}

/**
 * QZ Tray ESC/POS Direct Thermal Printing Bridge
 */
export async function printViaQZTray(
  printerName: string,
  receiptText: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if qz is available on window
    const qz = (window as unknown as { qz?: any }).qz
    if (!qz) {
      return {
        success: false,
        error: 'QZ Tray bridge is not loaded. Using browser print fallback.',
      }
    }

    if (!qz.websocket.isActive()) {
      await qz.websocket.connect()
    }

    const config = qz.configs.create(printerName || undefined)
    const data = [
      '\x1B\x40', // ESC @ - Initialize printer
      receiptText,
      '\x1D\x56\x41\x03', // GS V - Cut paper
    ]

    await qz.print(config, data)
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}

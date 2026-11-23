"use client"

import * as React from "react"
import { Printer, Download, CheckCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatReceiptPlainText, triggerBrowserPrint, printViaQZTray, ReceiptData } from "@/lib/print/thermal"
import { logReceiptPrint } from "@/lib/actions/billing"

interface ThermalReceiptProps {
  receipt: ReceiptData
  paperWidth?: 58 | 80
  printerName?: string | null
  connectionType?: 'browser' | 'qz_tray' | 'network'
  onClose?: () => void
}

export function ThermalReceipt({
  receipt,
  paperWidth = 80,
  printerName,
  connectionType = 'browser',
  onClose,
}: ThermalReceiptProps) {
  const [printing, setPrinting] = React.useState(false)
  const [printSuccess, setPrintSuccess] = React.useState(false)
  const [printMsg, setPrintMsg] = React.useState<string | null>(null)

  const receiptText = React.useMemo(() => {
    return formatReceiptPlainText(receipt, paperWidth)
  }, [receipt, paperWidth])

  const handlePrint = async () => {
    setPrinting(true)
    setPrintMsg(null)

    try {
      if (connectionType === 'qz_tray' && printerName) {
        const res = await printViaQZTray(printerName, receiptText)
        if (res.success) {
          setPrintSuccess(true)
          setPrintMsg("Sent to thermal printer successfully.")
          await logReceiptPrint(receipt.invoiceNo, 'qz_tray', !!receipt.isDuplicate, 'success')
        } else {
          // Fallback to browser print
          setPrintMsg(`${res.error} - Falling back to browser print.`)
          await triggerBrowserPrint()
          await logReceiptPrint(receipt.invoiceNo, 'browser', !!receipt.isDuplicate, 'success')
        }
      } else {
        // Standard Browser Print
        await triggerBrowserPrint()
        setPrintSuccess(true)
        setPrintMsg("Print triggered.")
        await logReceiptPrint(receipt.invoiceNo, 'browser', !!receipt.isDuplicate, 'success')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setPrintMsg(`Print error: ${msg}`)
      await logReceiptPrint(receipt.invoiceNo, 'browser', !!receipt.isDuplicate, 'failed', msg)
    } finally {
      setPrinting(false)
    }
  }

  const handleDownloadText = () => {
    const element = document.createElement("a")
    const file = new Blob([receiptText], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `${receipt.invoiceNo}-receipt.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* On-screen visual preview */}
      <Card
        className={`bg-white border-2 border-[#E8DED0] shadow-md p-3.5 sm:p-5 font-mono text-xs text-black leading-tight select-all transition-all w-full overflow-x-auto ${
          paperWidth === 58 ? "max-w-[280px]" : "max-w-[320px] sm:max-w-[360px]"
        }`}
      >
        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-snug">
          {receiptText}
        </pre>
      </Card>

      {/* Hidden container dedicated to print media styling */}
      <div
        id="receipt-print-area"
        className={paperWidth === 58 ? "paper-58mm" : ""}
      >
        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-snug">
          {receiptText}
        </pre>
      </div>

      {printMsg && (
        <p className="text-xs text-[#705B51] text-center font-medium">
          {printMsg}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 justify-center w-full max-w-sm">
        <Button
          onClick={handlePrint}
          disabled={printing}
          className="flex-1 bg-[#43291F] hover:bg-[#341F17] text-white"
        >
          {printing ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <Printer className="h-4 w-4 mr-1.5" />
          )}
          Print Bill
        </Button>

        <Button
          onClick={handleDownloadText}
          variant="outline"
          className="border-[#E8DED0] text-[#43291F]"
        >
          <Download className="h-4 w-4 mr-1.5" />
          Export Text
        </Button>

        {onClose && (
          <Button
            onClick={onClose}
            variant="secondary"
            className="w-full bg-[#EFE7DA] text-[#43291F]"
          >
            Done & New Sale
          </Button>
        )}
      </div>
    </div>
  )
}

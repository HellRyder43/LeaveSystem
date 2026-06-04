'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { bulkImportPublicHolidays } from '@/lib/actions/admin'
import { useSession } from '@/components/providers/SessionProvider'

interface Props {
  open: boolean
  onClose: () => void
  onImported: () => void
}

export function BulkImportDialog({ open, onClose, onImported }: Props) {
  const { id: actorId } = useSession()
  const [isPending, startTransition] = useTransition()
  const [csvText, setCsvText] = useState('')

  // Parse preview
  const previewLines = csvText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 6)

  function handleClose() {
    setCsvText('')
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!csvText.trim()) {
      toast.error('Please paste CSV content.')
      return
    }

    startTransition(async () => {
      const result = await bulkImportPublicHolidays(actorId, csvText.trim())
      if (result.success && result.data) {
        toast.success(`Imported ${result.data.imported} holiday${result.data.imported !== 1 ? 's' : ''} successfully.`)
        handleClose()
        onImported()
      } else {
        toast.error(result.error ?? 'Failed to import holidays.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Import Holidays</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-semibold">CSV Format:</p>
            <code className="block font-mono">name,date</code>
            <code className="block font-mono">National Day,2026-08-31</code>
            <code className="block font-mono">Hari Raya Aidilfitri,2026-03-30</code>
            <p className="mt-1">Date must be in YYYY-MM-DD format. All imported holidays are set as Global.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              placeholder="Paste CSV here…"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={8}
              className="font-mono text-xs"
            />

            {previewLines.length > 0 && (
              <div className="text-xs text-slate-500">
                <span className="font-semibold">Preview:</span> {previewLines.length} row{previewLines.length !== 1 ? 's' : ''} detected
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={isPending || !csvText.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isPending ? 'Importing…' : 'Import'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

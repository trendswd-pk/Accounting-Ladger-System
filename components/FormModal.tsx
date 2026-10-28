'use client'

import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export const formModalOverlayClass =
  'fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50'

export const formModalPanelClass =
  'bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg shadow-xl w-full max-h-[92dvh] sm:max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-600 sm:my-8 overflow-hidden'

export const formModalHeaderClass =
  'flex items-center justify-between gap-3 px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 flex-shrink-0 bg-gradient-to-r from-primary-700 to-primary-600'

export const formModalTitleClass =
  'text-lg sm:text-xl font-semibold text-white min-w-0 truncate'

export const formModalCloseButtonClass =
  'p-2 text-white/90 hover:text-white hover:bg-white/15 rounded-full shrink-0 focus:outline-none focus:ring-2 focus:ring-white/50'

export const formModalBodyClass =
  'overflow-y-auto flex-1 min-h-0 px-4 py-4 sm:px-6 bg-white dark:bg-gray-800'

export const formModalFooterClass =
  'flex-shrink-0 flex flex-wrap gap-2 px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-primary-700 to-primary-600'

export const formModalPrimaryButtonClass =
  'flex-1 sm:flex-none px-4 py-2.5 bg-white text-primary-700 font-medium rounded-md hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed'

export const formModalSecondaryButtonClass =
  'flex-1 sm:flex-none px-4 py-2.5 bg-white/15 text-white font-medium rounded-md hover:bg-white/25 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50'

export const formModalDangerButtonClass =
  'flex-1 sm:flex-none px-4 py-2.5 bg-red-500 text-white font-medium rounded-md hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-white/50'

type FormModalHeaderProps = {
  title: ReactNode
  titleId?: string
  onClose: () => void
}

export function FormModalHeader({ title, titleId, onClose }: FormModalHeaderProps) {
  return (
    <div className={formModalHeaderClass}>
      <h2 id={titleId} className={formModalTitleClass}>
        {title}
      </h2>
      <button type="button" onClick={onClose} className={formModalCloseButtonClass} aria-label="Close">
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}

export function FormModalBody({ children }: { children: ReactNode }) {
  return <div className={formModalBodyClass}>{children}</div>
}

export function FormModalFooter({ children }: { children: ReactNode }) {
  return <div className={formModalFooterClass}>{children}</div>
}

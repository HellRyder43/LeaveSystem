import type { EffectiveLeaveBalance } from '@/lib/types/app'

interface BalanceCardProps {
  balance: EffectiveLeaveBalance
  colorIndex?: number
}

const CARD_COLORS = [
  {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    icon: 'text-purple-600 dark:text-purple-400',
    bar: 'bg-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
  },
  {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
    bar: 'bg-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
  },
  {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    icon: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    icon: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
  },
  {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    icon: 'text-indigo-600 dark:text-indigo-400',
    bar: 'bg-indigo-500',
    text: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    icon: 'text-pink-600 dark:text-pink-400',
    bar: 'bg-pink-500',
    text: 'text-pink-600 dark:text-pink-400',
  },
  {
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    icon: 'text-teal-600 dark:text-teal-400',
    bar: 'bg-teal-500',
    text: 'text-teal-600 dark:text-teal-400',
  },
  {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    icon: 'text-orange-600 dark:text-orange-400',
    bar: 'bg-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
  },
] as const

export function BalanceCard({ balance, colorIndex = 0 }: BalanceCardProps) {
  const color = CARD_COLORS[colorIndex % CARD_COLORS.length]
  const totalAllocated = balance.allocated + balance.carried_forward

  // Progress: used out of total available (allocated + carry-forward)
  const usedPct = totalAllocated > 0
    ? Math.min(100, Math.round((balance.used / totalAllocated) * 100))
    : 0

  const effectiveDisplay = balance.effective_balance % 1 === 0
    ? balance.effective_balance.toString()
    : balance.effective_balance.toFixed(1)

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-150">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-tight pr-2">
          {balance.leave_type.name}
        </p>
        <div className={`w-8 h-8 shrink-0 rounded-xl ${color.bg} flex items-center justify-center`}>
          <span className={`text-xs font-black ${color.icon}`}>
            {balance.leave_type.name.charAt(0)}
          </span>
        </div>
      </div>

      {/* Remaining days */}
      <p className={`text-3xl font-black mb-0.5 ${color.text}`}>{effectiveDisplay}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">days remaining</p>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full ${color.bar} rounded-full transition-all duration-300`}
          style={{ width: `${usedPct}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <span>
          <span className="font-semibold text-slate-600 dark:text-slate-300">{balance.used}</span> used
        </span>
        <span>
          <span className="font-semibold text-slate-600 dark:text-slate-300">{balance.allocated}</span> allocated
        </span>
        {balance.carried_forward > 0 && (
          <span className={`font-semibold ${color.text}`}>
            +{balance.carried_forward} CF
          </span>
        )}
      </div>

      {/* Pending in-flight indicator */}
      {balance.pending_in_flight > 0 && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
          {balance.pending_in_flight} day{balance.pending_in_flight !== 1 ? 's' : ''} pending approval
        </p>
      )}
    </div>
  )
}

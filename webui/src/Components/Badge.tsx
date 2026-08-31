import classNames from 'classnames'
import './Badge.css'

export type BadgeTone = 'good' | 'warning' | 'error' | 'info' | 'neutral' | 'disabled'

const TONE_CLASSES: Record<BadgeTone, string> = {
	good: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 shadow-xs',
	warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 shadow-xs',
	error: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 shadow-xs',
	info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25 shadow-xs',
	neutral: 'bg-surface-muted/60 text-muted border-border/60',
	disabled: 'bg-surface-muted/50 text-muted border-border/40 opacity-75',
}

const DOT_CLASSES: Record<BadgeTone, string> = {
	good: 'bg-emerald-500',
	warning: 'bg-amber-500',
	error: 'bg-rose-500',
	info: 'bg-sky-500',
	neutral: 'bg-muted',
	disabled: 'bg-muted',
}

interface BadgeProps {
	tone: BadgeTone
	/** Optional leading element (a spinner, a pulsing dot); overrides the plain dot. */
	indicator?: React.ReactNode
	/** Render the plain solid dot for this tone as the leading element. */
	dot?: boolean
	className?: string
	children: React.ReactNode
}

export function Badge({ tone, indicator, dot, className, children }: BadgeProps): React.JSX.Element {
	return (
		<span className={classNames('status-badge', TONE_CLASSES[tone], className)}>
			{indicator ?? (dot ? <span className={classNames('status-badge-dot', DOT_CLASSES[tone])} /> : null)}
			{children}
		</span>
	)
}

/** Map an `InstanceStatusEntry['category']` (a free-form string from the module) to a badge tone. */
export function badgeToneForStatusCategory(category: string | null | undefined): BadgeTone {
	switch (category) {
		case 'good':
			return 'good'
		case 'warning':
			return 'warning'
		case 'error':
			return 'error'
		default:
			return 'neutral'
	}
}

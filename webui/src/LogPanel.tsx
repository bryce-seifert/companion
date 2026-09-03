import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useSubscription } from '@trpc/tanstack-react-query'
import classNames from 'classnames'
import dayjs from 'dayjs'
import {
	AlertCircle,
	AlertTriangle,
	Bug,
	Check,
	Copy,
	Download,
	FileText,
	Info,
	Pause,
	Play,
	Search,
	Trash2,
	X,
} from 'lucide-react'
import { nanoid } from 'nanoid'
import { memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ClientLogLine } from '@companion-app/shared/Model/LogLine.js'
import { GenericConfirmModal, type GenericConfirmModalRef } from '~/Components/GenericConfirmModal.js'
import { safeSetLocalStorage } from '~/Helpers/SafeStorage.js'
import { useStickyScroll } from '~/Hooks/useStickyScroll.js'
import { PageHeader } from '~/Layout/PageHeader.js'
import { assertNever, makeAbsolutePath } from '~/Resources/util.js'
import { RootAppStoreContext } from '~/Stores/RootAppStore.js'
import { trpc, useMutationExt } from './Resources/TRPC'
import './log.css'

interface LogConfig {
	error?: boolean
	warn: boolean
	info: boolean
	debug: boolean
}

interface ClientLogLineExt extends Omit<ClientLogLine, 'time'> {
	id?: string
	time: number | null
}

export interface GroupedLogLine extends ClientLogLineExt {
	count: number
}

export const LogPanel = memo(function LogPanel() {
	const [config, setConfig] = useState<LogConfig>(() => loadConfig())
	const [searchQuery, setSearchQuery] = useState('')
	const [deduplicate, setDeduplicate] = useState(true)
	const [autoScroll, setAutoScroll] = useState(true)
	const [copiedAll, setCopiedAll] = useState(false)

	const exportRef = useRef<GenericConfirmModalRef>(null)
	const { notifier } = useContext(RootAppStoreContext)

	// Save the config when it changes
	useEffect(() => {
		safeSetLocalStorage('debug_config', JSON.stringify(config))
	}, [config])

	const clearLogMutation = useMutationExt(trpc.logs.clear.mutationOptions())
	const doClearLog = useCallback(() => {
		clearLogMutation
			.mutateAsync()
			.then(() => {
				notifier.show('Logs Cleared', 'All log history has been cleared', 2500)
			})
			.catch((e) => {
				console.error('Log clear failed', e)
			})
	}, [clearLogMutation, notifier])

	const doToggleConfig = useCallback((key: keyof LogConfig) => {
		setConfig((oldConfig) => ({
			...oldConfig,
			[key]: !oldConfig[key],
		}))
	}, [])

	const exportSupportModal = useCallback(() => {
		exportRef.current?.show(
			'Export Support Bundle',
			[
				'This packages up your recent Companion logs, configuration and backups.',
				'This may contain sensitive information, such as connection information to online services. It is not recommended to post this publicly, rather you should send it privately to a trusted party who is able to help you with an issue.',
			],
			'Export',
			() => {
				window.open(makeAbsolutePath('/int/export/support'))
			}
		)
	}, [])

	const { history } = useLogHistory()

	// Compute live counts
	const counts = useMemo(() => {
		const c = { error: 0, warn: 0, info: 0, debug: 0 }
		for (const item of history) {
			if (item.level === 'error' || item.level === 'fatal') c.error++
			else if (item.level === 'warn') c.warn++
			else if (item.level === 'info') c.info++
			else if (item.level === 'debug') c.debug++
		}
		return c
	}, [history])

	// Filter and deduplicate
	const processedMessages = useMemo(() => {
		const filtered = history.filter((msg) => {
			if (msg.level === 'error' || msg.level === 'fatal') {
				if (config.error === false) return false
			} else if (msg.level === 'warn') {
				if (!config.warn) return false
			} else if (msg.level === 'info') {
				if (!config.info) return false
			} else if (msg.level === 'debug') {
				if (!config.debug) return false
			}

			if (searchQuery) {
				const q = searchQuery.toLowerCase()
				const matchMsg = msg.message?.toLowerCase().includes(q)
				const matchSrc = msg.source?.toLowerCase().includes(q)
				const matchLvl = msg.level?.toLowerCase().includes(q)
				if (!matchMsg && !matchSrc && !matchLvl) return false
			}

			return true
		})

		if (!deduplicate) {
			return filtered.map((line) => ({ ...line, count: 1 }))
		}

		// Deduplicate consecutive identical messages
		const grouped: GroupedLogLine[] = []
		for (const line of filtered) {
			const prev = grouped[grouped.length - 1]
			if (prev && prev.level === line.level && prev.source === line.source && prev.message === line.message) {
				prev.count += 1
				prev.time = line.time
			} else {
				grouped.push({ ...line, count: 1 })
			}
		}
		return grouped
	}, [history, config, searchQuery, deduplicate])

	const handleCopyAll = useCallback(() => {
		const dump = processedMessages
			.map(
				(m) =>
					`[${m.time ? dayjs(m.time).format('YYYY-MM-DD HH:mm:ss.SSS') : 'SYS'}] [${(m.level || 'INFO').toUpperCase()}] [${m.source}] ${m.message}${m.count > 1 ? ` (x${m.count})` : ''}`
			)
			.join('\n')

		void navigator.clipboard.writeText(dump).then(() => {
			setCopiedAll(true)
			notifier.show('Logs Copied', `Copied ${processedMessages.length} log lines to clipboard`, 2500)
			setTimeout(() => setCopiedAll(false), 2000)
		})
	}, [processedMessages, notifier])

	return (
		<>
			<GenericConfirmModal ref={exportRef} />
			<div className="page-shell">
				<PageHeader title="System Log" helpAction="/user-guide/log" />

				{/* Top Controls Bar */}
				<div className="bg-surface-muted/60 border border-border/80 p-3 rounded-xl flex flex-col gap-3 shrink-0 shadow-xs">
					<div className="flex items-center justify-between gap-3 flex-wrap">
						{/* Severity Filter Pills */}
						<div className="flex items-center gap-1.5 flex-wrap">
							<span className="text-xs font-semibold text-body me-1">Filters:</span>

							<button
								type="button"
								onClick={() => doToggleConfig('error')}
								className={classNames('log-filter-pill', config.error !== false && 'active-error')}
							>
								<AlertCircle className="w-3.5 h-3.5" />
								<span>Error ({counts.error})</span>
							</button>

							<button
								type="button"
								onClick={() => doToggleConfig('warn')}
								className={classNames('log-filter-pill', config.warn && 'active-warn')}
							>
								<AlertTriangle className="w-3.5 h-3.5" />
								<span>Warn ({counts.warn})</span>
							</button>

							<button
								type="button"
								onClick={() => doToggleConfig('info')}
								className={classNames('log-filter-pill', config.info && 'active-info')}
							>
								<Info className="w-3.5 h-3.5" />
								<span>Info ({counts.info})</span>
							</button>

							<button
								type="button"
								onClick={() => doToggleConfig('debug')}
								className={classNames('log-filter-pill', config.debug && 'active-debug')}
							>
								<Bug className="w-3.5 h-3.5" />
								<span>Debug ({counts.debug})</span>
							</button>
						</div>

						{/* Top Actions */}
						<div className="flex items-center gap-2 flex-wrap">
							<button
								type="button"
								onClick={() => setDeduplicate(!deduplicate)}
								className={classNames('log-action-btn', deduplicate && 'active-toggle')}
								title="Collapse repetitive consecutive log lines"
							>
								<span>Group Repeats</span>
							</button>

							<button
								type="button"
								onClick={() => setAutoScroll(!autoScroll)}
								className={classNames('log-action-btn', autoScroll ? 'active-toggle' : 'text-amber-500')}
								title={autoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}
							>
								{autoScroll ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
								<span>{autoScroll ? 'Live Stream' : 'Paused'}</span>
							</button>

							<button
								type="button"
								onClick={handleCopyAll}
								className="log-action-btn"
								title="Copy filtered logs to clipboard"
							>
								{copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
								<span>Copy</span>
							</button>

							<button
								type="button"
								onClick={doClearLog}
								className="log-action-btn hover:text-rose-500"
								title="Clear active log history"
							>
								<Trash2 className="w-3.5 h-3.5" />
								<span>Clear</span>
							</button>

							<a
								href={makeAbsolutePath('/int/export/log')}
								target="_blank"
								rel="noopener noreferrer"
								className="log-action-btn"
								title="Download raw log file"
							>
								<FileText className="w-3.5 h-3.5" />
								<span>Export Log</span>
							</a>

							<button
								type="button"
								onClick={exportSupportModal}
								className="log-action-btn"
								title="Download full support bundle"
							>
								<Download className="w-3.5 h-3.5" />
								<span>Support Bundle</span>
							</button>
						</div>
					</div>

					{/* Search Filter Bar */}
					<div className="relative flex items-center">
						<Search className="w-4 h-4 absolute left-3 text-muted pointer-events-none" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search logs by keyword, source, or message (e.g. atem, connection, timeout)..."
							className="w-full bg-surface border border-border rounded-lg pl-9 pr-8 py-1.5 text-xs text-body placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery('')}
								className="absolute right-2.5 text-muted hover:text-body p-0.5"
								title="Clear search"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						)}
					</div>
				</div>

				{/* Log Content Terminal Window */}
				<div className="flex-1 min-h-0 bg-surface rounded-xl border border-border/80 shadow-xs overflow-hidden flex flex-col p-2">
					<LogPanelContents messages={processedMessages} autoScroll={autoScroll} />
				</div>
			</div>
		</>
	)
})

function useLogHistory() {
	const [history, setHistory] = useState<ClientLogLineExt[]>([])

	useSubscription(
		trpc.logs.watch.subscriptionOptions(undefined, {
			onStarted: () => {
				setHistory([])
			},
			onData: (data) => {
				switch (data.type) {
					case 'clear':
						setHistory([])
						break
					case 'lines': {
						if (data.lines.length === 0) return

						const newItems: ClientLogLineExt[] = data.lines.map((item) => ({ ...item, id: nanoid() }))

						setHistory((history) => {
							const newArray = [...history, ...newItems]
							if (newArray.length > 5000) {
								return newArray.slice(-4500)
							} else {
								return newArray
							}
						})
						break
					}

					default:
						assertNever(data)
						break
				}
			},
			onError: (error) => {
				console.error('Log subscription error', error)
			},
		})
	)

	return { history }
}

interface LogPanelContentsProps {
	messages: GroupedLogLine[]
	autoScroll: boolean
}

function LogPanelContents({ messages, autoScroll }: LogPanelContentsProps) {
	const parentRef = useRef<HTMLDivElement>(null)

	const { data: appInfo } = useQuery(trpc.appInfo.version.queryOptions())
	const infoLine = useMemo<GroupedLogLine>(
		() => ({
			time: null,
			level: 'debug',
			source: 'log',
			count: 1,
			message: appInfo?.logsDir
				? `Older logs on disk: ${appInfo.logsDir}`
				: 'For older logs check the console output or system logs where Companion was started.',
		}),
		[appInfo?.logsDir]
	)

	const count = messages.length + 1

	// eslint-disable-next-line react-hooks/incompatible-library
	const virtualizer = useVirtualizer({
		count: count,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 28,
		overscan: 10,
	})

	const onScroll = useStickyScroll(parentRef, virtualizer, count)

	// Auto-scroll when new items arrive if autoScroll is enabled
	useEffect(() => {
		if (autoScroll && parentRef.current && count > 1) {
			virtualizer.scrollToIndex(count - 1, { align: 'end' })
		}
	}, [count, autoScroll, virtualizer])

	const items = virtualizer.getVirtualItems()

	return (
		<div
			ref={parentRef}
			className="w-full h-full overflow-auto font-mono text-xs select-text scrollbar-thin"
			onScroll={onScroll}
		>
			<div
				style={{
					height: virtualizer.getTotalSize(),
					width: '100%',
					position: 'relative',
				}}
			>
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						transform: `translateY(${items[0]?.start ?? 0}px)`,
					}}
				>
					{items.map((virtualRow) => (
						<div key={virtualRow.key} data-index={virtualRow.index} ref={virtualizer.measureElement}>
							<LogLineInner line={virtualRow.index === 0 ? infoLine : messages[virtualRow.index - 1]} />
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

interface LogLineInnerProps {
	line: GroupedLogLine
}

const LogLineInner = memo(({ line }: LogLineInnerProps) => {
	const [copied, setCopied] = useState(false)

	if (line.time === null) {
		return (
			<div className="flex items-center gap-2 py-1.5 px-3 mb-1 rounded-lg bg-surface-muted/60 border border-border/70 text-xs text-muted font-sans">
				<Info className="w-4 h-4 text-sky-500 shrink-0" />
				<span className="break-words min-w-0 flex-1">{line.message}</span>
			</div>
		)
	}

	const time_format = dayjs(line.time).format('HH:mm:ss.SSS')

	let levelBadge = null
	let lineBgColor = 'bg-transparent'

	if (line.level === 'error' || line.level === 'fatal') {
		levelBadge = (
			<span className="px-1.5 py-0.5 rounded text-3xs font-bold uppercase bg-rose-500/15 text-rose-500 border border-rose-500/30 shrink-0 select-none">
				ERROR
			</span>
		)
		lineBgColor = 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20'
	} else if (line.level === 'warn') {
		levelBadge = (
			<span className="px-1.5 py-0.5 rounded text-3xs font-bold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0 select-none">
				WARN
			</span>
		)
		lineBgColor = 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20'
	} else if (line.level === 'info') {
		levelBadge = (
			<span className="px-1.5 py-0.5 rounded text-3xs font-bold uppercase bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 shrink-0 select-none">
				INFO
			</span>
		)
		lineBgColor = 'hover:bg-surface-hover/60 border-transparent'
	} else if (line.level === 'debug') {
		levelBadge = (
			<span className="px-1.5 py-0.5 rounded text-3xs font-bold uppercase bg-zinc-500/15 text-zinc-400 border border-zinc-500/25 shrink-0 select-none">
				DEBUG
			</span>
		)
		lineBgColor = 'hover:bg-surface-hover/60 border-transparent'
	}

	const handleCopy = (e: React.MouseEvent) => {
		e.stopPropagation()
		const str = `[${dayjs(line.time).format('YYYY-MM-DD HH:mm:ss.SSS')}] [${line.level?.toUpperCase()}] [${line.source}] ${line.message}`
		void navigator.clipboard.writeText(str).then(() => {
			setCopied(true)
			setTimeout(() => setCopied(false), 1500)
		})
	}

	return (
		<div
			className={classNames(
				'group relative flex items-start gap-2.5 py-1 px-2.5 rounded-md transition-colors text-xs font-mono border my-0.5 leading-relaxed',
				lineBgColor
			)}
		>
			<span className="text-muted shrink-0 select-none text-2xs tabular-nums whitespace-nowrap pt-0.5">
				{time_format}
			</span>

			<div className="shrink-0 flex items-center gap-1.5">
				{levelBadge}
				{line.count > 1 && (
					<span className="px-1.5 py-0.2 rounded-full text-3xs font-bold bg-primary/20 text-primary border border-primary/30 shrink-0 select-none">
						x{line.count}
					</span>
				)}
			</div>

			<span
				className="font-semibold text-body shrink-0 max-w-[140px] truncate select-none text-2xs pt-0.5"
				title={line.source}
			>
				{line.source}
			</span>

			<span className="text-body whitespace-pre-wrap break-words min-w-0 flex-1">{line.message}</span>

			{/* Copy Line Action Button */}
			<button
				type="button"
				onClick={handleCopy}
				className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted hover:text-body shrink-0 cursor-pointer bg-transparent border-0 shadow-none outline-none inline-flex items-center justify-center rounded hover:bg-surface-muted"
				title="Copy log line"
			>
				{copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
			</button>
		</div>
	)
})

function loadConfig(): LogConfig {
	try {
		const rawConfig = window.localStorage.getItem('debug_config')
		if (!rawConfig) throw new Error()
		const config = JSON.parse(rawConfig)
		if (!config) throw new Error()
		return {
			error: config.error !== false,
			warn: config.warn ?? true,
			info: config.info ?? false,
			debug: config.debug ?? false,
		}
	} catch (_e) {
		const config: LogConfig = {
			error: true,
			warn: true,
			info: false,
			debug: false,
		}

		safeSetLocalStorage('debug_config', JSON.stringify(config))
		return config
	}
}

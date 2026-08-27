import { faCheck, faClipboardList, faDownload, faFileExport, faTrash } from '@fortawesome/free-solid-svg-icons'
import './log.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useSubscription } from '@trpc/tanstack-react-query'
import classNames from 'classnames'
import dayjs from 'dayjs'
import { nanoid } from 'nanoid'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ClientLogLine } from '@companion-app/shared/Model/LogLine.js'
import { GenericConfirmModal, type GenericConfirmModalRef } from '~/Components/GenericConfirmModal.js'
import { safeSetLocalStorage } from '~/Helpers/SafeStorage.js'
import { useStickyScroll } from '~/Hooks/useStickyScroll.js'
import { PageHeader } from '~/Layout/PageHeader.js'
import { assertNever, makeAbsolutePath } from '~/Resources/util.js'
import { Button, ButtonGroup, LinkButtonExternal } from './Components/Button'
import { trpc, useMutationExt } from './Resources/TRPC'

interface LogConfig {
	debug: boolean | undefined
	info: boolean | undefined
	warn: boolean | undefined
}

interface ClientLogLineExt extends Omit<ClientLogLine, 'time'> {
	time: number | null
}

export const LogPanel = memo(function LogPanel() {
	const [config, setConfig] = useState<LogConfig>(() => loadConfig())
	const exportRef = useRef<GenericConfirmModalRef>(null)

	// Save the config when it changes
	useEffect(() => {
		safeSetLocalStorage('debug_config', JSON.stringify(config))
	}, [config])

	const clearLogMutation = useMutationExt(trpc.logs.clear.mutationOptions())
	const doClearLog = useCallback(() => {
		clearLogMutation.mutateAsync().catch((e) => {
			console.error('Log clear failed', e)
		})
	}, [clearLogMutation])

	const doToggleConfig = useCallback((key: keyof LogConfig) => {
		setConfig((oldConfig) => ({
			...oldConfig,
			[key]: !oldConfig[key],
		}))
	}, [])

	const doToggleWarn = useCallback(() => doToggleConfig('warn'), [doToggleConfig])
	const doToggleInfo = useCallback(() => doToggleConfig('info'), [doToggleConfig])
	const doToggleDebug = useCallback(() => doToggleConfig('debug'), [doToggleConfig])

	const exportSupportModal = useCallback(() => {
		exportRef.current?.show(
			'Export Support Bundle',
			[
				'This packages up your recent Companion logs, configuration and backups.',
				'This may contain sensitive information, such as connection information to online services.  It is not recommended to post this publicly, rather you should send it privately to a trusted party who is able to help you with an issue.',
			],
			'Export',
			() => {
				window.open(makeAbsolutePath('/int/export/support'))
			}
		)
	}, [])

	return (
		<>
			<GenericConfirmModal ref={exportRef} />
			<div className="page-shell">
				<PageHeader icon={faClipboardList} title="System Log" helpAction="/user-guide/log" />

				{/* Top Header Card: Filters & Actions */}
				<div className="bg-surface-muted/50 border border-border/70 p-3 rounded-lg flex items-center justify-between gap-3 flex-wrap shrink-0">
					<div className="flex items-center gap-2">
						<span className="text-xs font-semibold text-body me-1">Levels:</span>
						<ButtonGroup>
							<Button color="warning" size="sm" variant={config.warn ? undefined : 'outline'} onClick={doToggleWarn}>
								{config.warn && <FontAwesomeIcon icon={faCheck} className="me-1 text-xs" />}
								Warning
							</Button>
							<Button color="info" size="sm" variant={config.info ? undefined : 'outline'} onClick={doToggleInfo}>
								{config.info && <FontAwesomeIcon icon={faCheck} className="me-1 text-xs" />}
								Info
							</Button>
							<Button
								color="secondary"
								size="sm"
								variant={config.debug ? undefined : 'outline'}
								onClick={doToggleDebug}
							>
								{config.debug && <FontAwesomeIcon icon={faCheck} className="me-1 text-xs" />}
								Debug
							</Button>
						</ButtonGroup>
					</div>

					<div className="flex items-center gap-2">
						<Button color="secondary" size="sm" onClick={doClearLog} title="Clear log history">
							<FontAwesomeIcon icon={faTrash} className="me-1.5" />
							Clear Log
						</Button>
						<LinkButtonExternal
							color="secondary"
							size="sm"
							href={makeAbsolutePath('/int/export/log')}
							title="Download log file"
						>
							<FontAwesomeIcon icon={faFileExport} className="me-1.5" />
							Export Log
						</LinkButtonExternal>
						<Button color="secondary" size="sm" onClick={exportSupportModal} title="Download support diagnostic bundle">
							<FontAwesomeIcon icon={faDownload} className="me-1.5" />
							Support Bundle
						</Button>
					</div>
				</div>

				{/* Log Content Terminal Window */}
				<div className="flex-1 min-h-0 bg-surface rounded-lg border border-border/70 shadow-xs overflow-hidden flex flex-col p-2">
					<LogPanelContents config={config} />
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
				// Reset history on start
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
	config: LogConfig
}
function LogPanelContents({ config }: LogPanelContentsProps) {
	const { history } = useLogHistory()

	const parentRef = useRef<HTMLDivElement>(null)

	const { data: appInfo } = useQuery(trpc.appInfo.version.queryOptions())
	const infoLine = useMemo<ClientLogLineExt>(
		() => ({
			time: null,
			level: 'debug',
			source: 'log',
			message: appInfo?.logsDir
				? `You can view older logs on disk at: ${appInfo.logsDir}`
				: 'For older logs check the console output or system logs where Companion was started (e.g. `docker logs`, `journalctl`).',
		}),
		[appInfo?.logsDir]
	)

	const messages = useMemo(() => {
		return history.filter((msg) => msg.level === 'error' || !!config[msg.level as keyof LogConfig])
	}, [history, config])

	const count = messages.length + 1

	// eslint-disable-next-line react-hooks/incompatible-library
	const virtualizer = useVirtualizer({
		count: count,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 24,
		overscan: 5,
	})

	const onScroll = useStickyScroll(parentRef, virtualizer, count)

	const items = virtualizer.getVirtualItems()

	return (
		<div ref={parentRef} className="w-full h-full overflow-auto" onScroll={onScroll}>
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
	line: ClientLogLineExt
}
const LogLineInner = memo(({ line }: LogLineInnerProps) => {
	const time_format = line.time === null ? '' : dayjs(line.time).format('YYYY-MM-DD HH:mm:ss.SSS')

	let levelBadge = null
	let lineBgColor = 'bg-transparent'

	if (line.level === 'error' || line.level === 'fatal') {
		levelBadge = (
			<span className="px-1.5 py-0.5 rounded text-3xs font-bold uppercase bg-rose-500/20 text-rose-500 border border-rose-500/30 shrink-0 select-none">
				ERROR
			</span>
		)
		lineBgColor = 'bg-rose-500/10 border-rose-500/20'
	} else if (line.level === 'warn') {
		levelBadge = (
			<span className="px-1.5 py-0.5 rounded text-3xs font-bold uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0 select-none">
				WARN
			</span>
		)
		lineBgColor = 'bg-amber-500/10 border-amber-500/20'
	} else if (line.level === 'info') {
		levelBadge = (
			<span className="px-1.5 py-0.5 rounded text-3xs font-bold uppercase bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 shrink-0 select-none">
				INFO
			</span>
		)
		lineBgColor = 'bg-sky-500/10 border-sky-500/20'
	} else if (line.level === 'debug') {
		levelBadge = (
			<span className="px-1.5 py-0.5 rounded text-3xs font-bold uppercase bg-zinc-500/15 text-zinc-400 border border-zinc-500/20 shrink-0 select-none">
				DEBUG
			</span>
		)
		lineBgColor = 'bg-transparent'
	}

	return (
		<div
			className={classNames(
				'flex items-start gap-2 py-1 px-2.5 rounded transition-colors text-xs font-mono border border-transparent my-0.5 leading-relaxed',
				lineBgColor
			)}
		>
			{time_format && <span className="text-muted shrink-0 select-none text-2xs">{time_format}</span>}
			{levelBadge}
			<span className="font-semibold text-body shrink-0">{line.source}:</span>
			<span className="text-body break-words min-w-0 flex-1">{line.message}</span>
		</div>
	)
})

function loadConfig(): LogConfig {
	try {
		const rawConfig = window.localStorage.getItem('debug_config')
		if (!rawConfig) throw new Error()
		const config = JSON.parse(rawConfig)
		if (!config) throw new Error()
		return config
	} catch (_e) {
		// setup defaults
		const config: LogConfig = {
			debug: false,
			info: false,
			warn: true,
		}

		safeSetLocalStorage('debug_config', JSON.stringify(config))

		return config
	}
}

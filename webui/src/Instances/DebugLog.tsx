import { faBug, faCheck, faFileExport, faInfoCircle, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useSubscription } from '@trpc/tanstack-react-query'
import classNames from 'classnames'
import { stringify as csvStringify } from 'csv-stringify/browser/esm/sync'
import dayjs from 'dayjs'
import { observer } from 'mobx-react-lite'
import { memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ClientConnectionConfig } from '@companion-app/shared/Model/Connections.js'
import type { InstanceStatusEntry } from '@companion-app/shared/Model/InstanceStatus.js'
import { Button, ButtonGroup } from '~/Components/Button'
import { safeSetLocalStorage } from '~/Helpers/SafeStorage.js'
import { useStickyScroll } from '~/Hooks/useStickyScroll.js'
import { InstanceTableStatusCell } from '~/Instances/List/InstanceTableStatusCell.js'
import { PageHeader } from '~/Layout/PageHeader.js'
import { trpc } from '~/Resources/TRPC'
import { RootAppStoreContext } from '~/Stores/RootAppStore.js'

interface DebugLogLine {
	time: number | null
	source: string | null
	level: string
	message: string
}

interface DebugConfig {
	debug: boolean | undefined
	info: boolean | undefined
	warn: boolean | undefined
	error: boolean | undefined
	console: boolean | undefined
}

const LogsOnDiskInfoLine: DebugLogLine = {
	time: null,
	source: 'System',
	level: 'system',
	message: 'Starting log. Only lines generated since opening the page are shown here',
}

export interface InstanceDebugLogProps {
	instanceId: string
	instanceTypeStr: string
	setEnabled: (enabled: boolean) => void
}

export const InstanceDebugLog = observer(function InstanceDebugLog({
	instanceId,
	instanceTypeStr,
	setEnabled,
}: InstanceDebugLogProps): React.JSX.Element {
	const rootAppStore = useContext(RootAppStoreContext)
	const [connectionInfo, setConnectionInfo] = useState<ClientConnectionConfig | null>(null)
	const [connectionStatus, setConnectionStatus] = useState<InstanceStatusEntry | null>(null)

	useSubscription(
		trpc.instances.connections.watch.subscriptionOptions(undefined, {
			enabled: instanceTypeStr === 'connection',
			onData: (changes) => {
				for (const change of changes) {
					if (change.type === 'init') {
						if (change.info[instanceId]) {
							setConnectionInfo(change.info[instanceId])
						}
					} else if (change.type === 'update') {
						if (change.id === instanceId) {
							setConnectionInfo(change.info)
						}
					} else if (change.type === 'remove') {
						if (change.id === instanceId) {
							setConnectionInfo(null)
						}
					}
				}
			},
		})
	)

	useSubscription(
		trpc.instances.surfaces.watch.subscriptionOptions(undefined, {
			enabled: instanceTypeStr !== 'connection',
			onData: (changes) => {
				for (const change of changes) {
					if (change.type === 'init') {
						if (change.info[instanceId]) {
							setConnectionInfo(change.info[instanceId] as unknown as ClientConnectionConfig)
						}
					} else if (change.type === 'update') {
						if (change.id === instanceId) {
							setConnectionInfo(change.info as unknown as ClientConnectionConfig)
						}
					} else if (change.type === 'remove') {
						if (change.id === instanceId) {
							setConnectionInfo(null)
						}
					}
				}
			},
		})
	)

	useSubscription(
		trpc.instances.statuses.watch.subscriptionOptions(undefined, {
			onData: (data) => {
				if (!data) return
				if (data.type === 'init') {
					if (data.statuses[instanceId]) {
						setConnectionStatus(data.statuses[instanceId])
					}
				} else if (data.type === 'update') {
					if (data.instanceId === instanceId) {
						setConnectionStatus(data.status)
					}
				} else if (data.type === 'remove') {
					if (data.instanceId === instanceId) {
						setConnectionStatus(null)
					}
				}
			},
		})
	)

	const isEnabled = connectionInfo ? connectionInfo.enabled !== false : true
	const label = connectionInfo?.label ?? rootAppStore?.connections?.getInfo(instanceId)?.label ?? instanceId

	// const [loadError, setLoadError]=useState(null)
	const [linesBuffer, setLinesBuffer] = useState<DebugLogLine[]>([])

	useSubscription(
		trpc.instances.debugLog.subscriptionOptions(
			{
				instanceId: instanceId,
			},
			{
				enabled: !!instanceId,
				onStarted: () => {
					setLinesBuffer([])
					console.log('Subscribed to connection debug log', instanceId)
				},
				onData: (data) => {
					setLinesBuffer((oldLines) => [...oldLines, data])
				},
				onError: (err) => {
					console.error('Error in connection debug log subscription', err)
					setLinesBuffer((oldLines) => [
						...oldLines,
						{ time: null, source: 'System', level: 'system', message: `Log subscription failed: ${err.message}` },
					])
				},
			}
		)
	)

	const doClearLog = useCallback(() => {
		setLinesBuffer([{ time: null, source: 'System', level: 'system', message: '** Log cleared **' }])
	}, [])

	const doExportLog = useCallback(() => {
		const csv = csvStringify([
			['Date', 'Type', 'Source', 'Log'],
			...linesBuffer.map((line) => [
				line.time ? new Date(line.time).toISOString() : '',
				line.level,
				line.source ?? '',
				line.message,
			]),
		])

		const blob = new Blob([csv], { type: 'text/csv' })
		const link = document.createElement('a')
		link.setAttribute(
			'download',
			`module-log-${new Date().toLocaleDateString()}-${new Date().toLocaleTimeString()}.csv`
		)
		// @ts-expect-error `oneTimeOnly` not defined in typings
		link.href = window.URL.createObjectURL(blob, { oneTimeOnly: true })
		document.body.appendChild(link)
		link.click()
		link.remove()
	}, [linesBuffer])

	const doStopInstance = useCallback(() => setEnabled(false), [setEnabled])
	const doStartInstance = useCallback(() => setEnabled(true), [setEnabled])

	const [config, setConfig] = useState<DebugConfig>(() => loadConfig(instanceId ?? ''))
	// Save the config when it changes
	useEffect(() => {
		safeSetLocalStorage(`module_debug:${instanceId}`, JSON.stringify(config))
	}, [config, instanceId])

	const doToggleConfig = useCallback((key: keyof DebugConfig) => {
		setConfig((oldConfig) => ({
			...oldConfig,
			[key]: !oldConfig[key],
		}))
	}, [])

	const doToggleError = useCallback(() => doToggleConfig('error'), [doToggleConfig])
	const doToggleWarn = useCallback(() => doToggleConfig('warn'), [doToggleConfig])
	const doToggleInfo = useCallback(() => doToggleConfig('info'), [doToggleConfig])
	const doToggleDebug = useCallback(() => doToggleConfig('debug'), [doToggleConfig])
	const doToggleConsole = useCallback(() => doToggleConfig('console'), [doToggleConfig])

	return (
		<div className="page-shell bg-app-frame-bg h-screen max-h-screen text-body pt-3">
			<PageHeader icon={faBug} title={`Debug Log: ${label}`} helpAction="/user-guide/config/connections" />

			{/* Top Header Card: Filters & Actions */}
			<div className="bg-surface-muted/50 border border-border/70 p-3 rounded-lg flex items-center justify-between gap-3 flex-wrap shrink-0">
				<div className="flex items-center gap-2">
					<span className="text-xs font-semibold text-body me-1">Levels:</span>
					<ButtonGroup>
						<Button color="danger" size="sm" onClick={doToggleError} variant={config.error ? undefined : 'outline'}>
							{config.error && <FontAwesomeIcon icon={faCheck} className="me-1 text-xs" />}
							Error
						</Button>
						<Button color="warning" size="sm" onClick={doToggleWarn} variant={config.warn ? undefined : 'outline'}>
							{config.warn && <FontAwesomeIcon icon={faCheck} className="me-1 text-xs" />}
							Warning
						</Button>
						<Button color="info" size="sm" onClick={doToggleInfo} variant={config.info ? undefined : 'outline'}>
							{config.info && <FontAwesomeIcon icon={faCheck} className="me-1 text-xs" />}
							Info
						</Button>
						<Button color="secondary" size="sm" onClick={doToggleDebug} variant={config.debug ? undefined : 'outline'}>
							{config.debug && <FontAwesomeIcon icon={faCheck} className="me-1 text-xs" />}
							Debug
						</Button>
						<Button
							color="secondary"
							size="sm"
							onClick={doToggleConsole}
							variant={config.console ? undefined : 'outline'}
						>
							{config.console && <FontAwesomeIcon icon={faCheck} className="me-1 text-xs" />}
							Console
						</Button>
					</ButtonGroup>
				</div>

				<div className="flex items-center gap-2">
					<InstanceTableStatusCell isEnabled={isEnabled} status={connectionStatus ?? undefined} />
					<Button color="secondary" size="sm" onClick={doClearLog} title="Clear log history">
						<FontAwesomeIcon icon={faTrash} className="me-1.5" />
						Clear Log
					</Button>
					<Button color="secondary" size="sm" onClick={doExportLog} title="Download log file">
						<FontAwesomeIcon icon={faFileExport} className="me-1.5" />
						Export Log
					</Button>
					<ButtonGroup>
						<Button color="danger" size="sm" onClick={doStopInstance} disabled={!isEnabled}>
							Stop {instanceTypeStr}
						</Button>
						<Button color="success" size="sm" onClick={doStartInstance} disabled={isEnabled}>
							Start {instanceTypeStr}
						</Button>
					</ButtonGroup>
				</div>
			</div>

			{/* Log Content Terminal Window */}
			<div className="flex-1 min-h-0 bg-surface rounded-lg border border-border/70 shadow-xs overflow-hidden flex flex-col p-2">
				<LogPanelContents linesBuffer={linesBuffer} config={config} />
			</div>
		</div>
	)
})

interface LogPanelContentsProps {
	linesBuffer: DebugLogLine[]
	config: DebugConfig
}

function LogPanelContents({ linesBuffer, config }: LogPanelContentsProps) {
	const parentRef = useRef<HTMLDivElement>(null)

	const messages = useMemo(() => {
		return linesBuffer.filter((msg) => msg.level === 'system' || !!config[msg.level as keyof DebugConfig])
	}, [linesBuffer, config])

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
							<LogLineInner line={virtualRow.index === 0 ? LogsOnDiskInfoLine : messages[virtualRow.index - 1]} />
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

interface LogLineInnerProps {
	line: DebugLogLine
}
const LogLineInner = memo(({ line }: LogLineInnerProps) => {
	if (line.time === null || line.level === 'system') {
		return (
			<div className="flex items-center gap-2 py-1.5 px-3 mb-1 rounded bg-surface-muted/60 border border-border/70 text-xs text-muted font-sans">
				<FontAwesomeIcon icon={faInfoCircle} className="text-sky-500 shrink-0" />
				<span className="break-words min-w-0 flex-1">{line.message}</span>
			</div>
		)
	}

	const time_format = dayjs(line.time).format('YYYY-MM-DD HH:mm:ss.SSS')

	let levelBadge = null
	let lineBgColor = 'bg-transparent'

	if (line.level === 'error' || line.level === 'fatal') {
		levelBadge = (
			<span className="w-12 text-center py-0.5 rounded text-3xs font-bold uppercase bg-rose-500/20 text-rose-500 border border-rose-500/30 shrink-0 select-none">
				ERROR
			</span>
		)
		lineBgColor = 'bg-rose-500/10 border-rose-500/20'
	} else if (line.level === 'warn') {
		levelBadge = (
			<span className="w-12 text-center py-0.5 rounded text-3xs font-bold uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0 select-none">
				WARN
			</span>
		)
		lineBgColor = 'bg-amber-500/10 border-amber-500/20'
	} else if (line.level === 'info') {
		levelBadge = (
			<span className="w-12 text-center py-0.5 rounded text-3xs font-bold uppercase bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 shrink-0 select-none">
				INFO
			</span>
		)
		lineBgColor = 'bg-sky-500/10 border-sky-500/20'
	} else if (line.level === 'console') {
		levelBadge = (
			<span className="w-12 text-center py-0.5 rounded text-3xs font-bold uppercase bg-purple-500/20 text-purple-500 border border-purple-500/30 shrink-0 select-none">
				CONSOLE
			</span>
		)
		lineBgColor = 'bg-transparent'
	} else if (line.level === 'debug') {
		levelBadge = (
			<span className="w-12 text-center py-0.5 rounded text-3xs font-bold uppercase bg-zinc-500/15 text-zinc-400 border border-zinc-500/20 shrink-0 select-none">
				DEBUG
			</span>
		)
		lineBgColor = 'bg-transparent'
	}

	return (
		<div
			className={classNames(
				'flex items-start gap-2.5 py-1 px-2.5 rounded hover:bg-surface-hover/50 transition-colors text-xs font-mono border border-transparent my-0.5 leading-relaxed',
				lineBgColor
			)}
		>
			<span className="text-muted shrink-0 select-none text-2xs tabular-nums whitespace-nowrap w-[160px] pt-0.5">
				{time_format}
			</span>
			{levelBadge}
			{line.source ? (
				<span className="font-semibold text-body shrink-0 w-48 truncate select-none" title={line.source}>
					{line.source}
				</span>
			) : (
				<span className="shrink-0 w-48 select-none" />
			)}
			<span className="text-body whitespace-pre-wrap break-words min-w-0 flex-1">{line.message}</span>
		</div>
	)
})

function loadConfig(instanceId: string): DebugConfig {
	const saveId = `module_debug:${instanceId}`
	try {
		const rawConfig = window.localStorage.getItem(saveId)
		if (!rawConfig) throw new Error()
		const config = JSON.parse(rawConfig)
		if (!config) throw new Error()
		return config
	} catch (_e) {
		// setup defaults
		const config: DebugConfig = {
			debug: true,
			info: true,
			warn: true,
			error: true,
			console: true,
		}

		safeSetLocalStorage(saveId, JSON.stringify(config))

		return config
	}
}

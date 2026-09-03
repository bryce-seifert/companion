import { faBug, faCheck, faFileExport, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useSubscription } from '@trpc/tanstack-react-query'
import { stringify as csvStringify } from 'csv-stringify/browser/esm/sync'
import { observer } from 'mobx-react-lite'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ClientConnectionConfig } from '@companion-app/shared/Model/Connections.js'
import type { InstanceStatusEntry } from '@companion-app/shared/Model/InstanceStatus.js'
import { Button, ButtonGroup, type ButtonProps } from '~/Components/Button'
import { LogLine, LogNoticeLine, VirtualLogList } from '~/Components/LogViewer.js'
import { safeSetLocalStorage } from '~/Helpers/SafeStorage.js'
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

const DEBUG_LEVELS = [
	{ key: 'error', label: 'Error', color: 'danger' },
	{ key: 'warn', label: 'Warning', color: 'warning' },
	{ key: 'info', label: 'Info', color: 'info' },
	{ key: 'debug', label: 'Debug', color: 'secondary' },
	{ key: 'console', label: 'Console', color: 'secondary' },
] as const satisfies readonly { key: keyof DebugConfig; label: string; color: ButtonProps['color'] }[]

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

	return (
		<div className="page-shell bg-app-frame-bg h-screen max-h-screen text-body pt-3">
			<PageHeader icon={faBug} title={`Debug Log: ${label}`} helpAction="/user-guide/config/connections" />

			{/* Top Header Card: Filters & Actions */}
			<div className="bg-surface-muted/50 border border-border/70 p-3 rounded-lg flex items-center justify-between gap-3 flex-wrap shrink-0">
				<div className="flex items-center gap-2">
					<span className="text-xs font-semibold text-body me-1">Levels:</span>
					<ButtonGroup>
						{DEBUG_LEVELS.map(({ key, label: levelLabel, color }) => (
							<Button
								key={key}
								color={color}
								size="sm"
								onClick={() => doToggleConfig(key)}
								variant={config[key] ? undefined : 'outline'}
							>
								{config[key] && <FontAwesomeIcon icon={faCheck} className="me-1 text-xs" />}
								{levelLabel}
							</Button>
						))}
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
	const messages = useMemo(() => {
		return linesBuffer.filter((msg) => msg.level === 'system' || !!config[msg.level as keyof DebugConfig])
	}, [linesBuffer, config])

	return (
		<VirtualLogList
			lines={messages}
			header={<LogNoticeLine message={LogsOnDiskInfoLine.message} />}
			renderLine={(line) => (
				<LogLine
					line={line}
					timeFormat="YYYY-MM-DD HH:mm:ss.SSS"
					timeClassName="log-timestamp-cell"
					sourceClassName="w-48"
					alwaysReserveSource
				/>
			)}
			estimateSize={24}
			autoScroll
			className="w-full h-full overflow-auto"
		/>
	)
}

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

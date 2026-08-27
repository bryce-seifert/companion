import { faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { observer } from 'mobx-react-lite'
import type { InstanceStatusEntry } from '@companion-app/shared/Model/InstanceStatus.js'
import { Badge, type BadgeTone } from '~/Components/Badge.js'
import { InlineHelpCustom } from '~/Components/InlineHelp.js'
import { Spinner } from '~/Components/Spinner.js'

interface InstanceTableStatusCellProps {
	isEnabled: boolean
	status: InstanceStatusEntry | undefined
}
export const InstanceTableStatusCell = observer(function InstanceTableStatusCell({
	isEnabled,
	status,
}: InstanceTableStatusCellProps) {
	if (!isEnabled) {
		return (
			<Badge tone="disabled" dot>
				Disabled
			</Badge>
		)
	}

	const messageStr =
		!!status &&
		(typeof status.message === 'string' || typeof status.message === 'number' || !status.message
			? status.message || ''
			: JSON.stringify(status.message))

	const levelStr =
		status?.level ||
		(status?.category === 'error'
			? 'Error'
			: status?.category === 'warning'
				? 'Warning'
				: status?.category === 'good'
					? 'OK'
					: 'Connecting')

	const hasExtraDetails = !!messageStr && messageStr !== levelStr
	const helpText = hasExtraDetails ? `${levelStr}: ${messageStr}` : levelStr || messageStr || 'Connecting'

	const infoBadge = hasExtraDetails ? (
		<FontAwesomeIcon icon={faInfoCircle} className="text-2xs opacity-70 shrink-0 ms-0.5" />
	) : null

	const isConnecting = !status?.category || (status.category === 'error' && status.level === 'Connecting')

	let tone: BadgeTone
	let label: string
	let indicator: React.ReactNode = undefined
	if (isConnecting) {
		tone = status?.category === 'error' ? 'info' : 'neutral'
		label = 'Connecting'
		indicator = <Spinner color={tone === 'info' ? 'primary' : 'secondary'} className="status-badge-spinner" />
	} else if (status.category === 'good') {
		tone = 'good'
		label = 'OK'
		indicator = (
			<span className="relative flex h-2 w-2 shrink-0">
				<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
				<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
			</span>
		)
	} else if (status.category === 'warning') {
		tone = 'warning'
		label = status.level || 'Warning'
	} else {
		tone = 'error'
		label = status.level || 'Error'
	}

	return (
		<InlineHelpCustom help={helpText}>
			<Badge tone={tone} dot indicator={indicator}>
				<span>{label}</span>
				{infoBadge}
			</Badge>
		</InlineHelpCustom>
	)
})

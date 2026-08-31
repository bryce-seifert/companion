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
	} else if (status.category === 'warning') {
		tone = 'warning'
		label = status.level || 'Warning'
	} else {
		tone = 'error'
		label = status.level || 'Error'
	}

	// Only the rows with something more to say get a tooltip: the label is already on screen, and a
	// tooltip per row is a floating-state machine per row.
	const hasExtraDetails = !!messageStr && messageStr !== label
	if (!hasExtraDetails) {
		return (
			<Badge tone={tone} dot indicator={indicator}>
				<span>{label}</span>
			</Badge>
		)
	}

	return (
		<InlineHelpCustom help={`${label}: ${messageStr}`}>
			<Badge tone={tone} dot indicator={indicator}>
				<span>{label}</span>
				<FontAwesomeIcon icon={faInfoCircle} className="text-2xs opacity-70 shrink-0 ms-0.5" />
			</Badge>
		</InlineHelpCustom>
	)
})

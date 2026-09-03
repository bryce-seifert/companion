import { observer } from 'mobx-react-lite'
import type { InstanceStatusEntry } from '@companion-app/shared/Model/InstanceStatus.js'
import { Badge, type BadgeTone } from '~/Components/Badge.js'
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
		return <Badge tone="disabled">Disabled</Badge>
	}

	// The module's own status message is the only explanation of *why* a connection is failing, and it
	// is too long for the badge, so it is surfaced as hover text.
	const messageStr =
		typeof status?.message === 'string' || typeof status?.message === 'number'
			? String(status.message)
			: status?.message
				? JSON.stringify(status.message)
				: ''

	const isConnecting = !status?.category || (status.category === 'error' && status.level === 'Connecting')

	let tone: BadgeTone
	let label: string
	let indicator: React.ReactNode = undefined
	if (isConnecting) {
		tone = status?.category === 'error' ? 'info' : 'neutral'
		label = 'Connecting'
		indicator = <Spinner size="sm" color={tone === 'info' ? 'primary' : 'secondary'} className="status-badge-spinner" />
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

	return (
		<Badge tone={tone} indicator={indicator} title={messageStr ? `${label}: ${messageStr}` : label}>
			<span>{label}</span>
		</Badge>
	)
})

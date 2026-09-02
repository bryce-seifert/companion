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
		return (
			<Badge tone="disabled" dot>
				Disabled
			</Badge>
		)
	}

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
		<Badge tone={tone} dot indicator={indicator}>
			<span>{label}</span>
		</Badge>
	)
})

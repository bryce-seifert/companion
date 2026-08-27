import { faCog, faFloppyDisk, faNetworkWired, faTh, faWarning } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link } from '@tanstack/react-router'
import classnames from 'classnames'

interface SettingsNavProps {
	activeTab: 'general' | 'buttons' | 'protocols' | 'backups' | 'advanced'
}

export function SettingsNav({ activeTab }: SettingsNavProps): React.JSX.Element {
	const tabs = [
		{ id: 'general', label: 'General', path: '/settings/general', icon: faCog },
		{ id: 'buttons', label: 'Buttons', path: '/settings/buttons', icon: faTh },
		{ id: 'protocols', label: 'Protocols', path: '/settings/protocols', icon: faNetworkWired },
		{ id: 'backups', label: 'Backups', path: '/settings/backups', icon: faFloppyDisk },
		{ id: 'advanced', label: 'Advanced', path: '/settings/advanced', icon: faWarning },
	] as const

	return (
		<div className="flex items-center gap-1 bg-surface-muted/60 p-1 rounded-lg border border-border/60 shrink-0 mb-3 overflow-x-auto">
			{tabs.map((tab) => {
				const active = activeTab === tab.id
				return (
					<Link
						key={tab.id}
						to={tab.path}
						className={classnames(
							'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all no-underline whitespace-nowrap',
							active
								? 'bg-surface text-primary shadow-sm border border-border/40 font-bold'
								: 'text-muted hover:text-body hover:bg-surface/50'
						)}
					>
						<FontAwesomeIcon icon={tab.icon} className={active ? 'text-primary' : 'text-muted/70'} />
						<span>{tab.label}</span>
					</Link>
				)
			})}
		</div>
	)
}

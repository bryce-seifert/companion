import { faCog, faFloppyDisk, faNetworkWired, faTh, faWarning } from '@fortawesome/free-solid-svg-icons'
import { PageTabs, type PageTab } from '~/Layout/PageTabs'

const TABS: readonly PageTab[] = [
	{ id: 'general', label: 'General', path: '/settings/general', icon: faCog },
	{ id: 'buttons', label: 'Buttons', path: '/settings/buttons', icon: faTh },
	{ id: 'protocols', label: 'Protocols', path: '/settings/protocols', icon: faNetworkWired },
	{ id: 'backups', label: 'Backups', path: '/settings/backups', icon: faFloppyDisk },
	{ id: 'advanced', label: 'Advanced', path: '/settings/advanced', icon: faWarning },
]

interface SettingsNavProps {
	activeTab: 'general' | 'buttons' | 'protocols' | 'backups' | 'advanced'
}

export function SettingsNav({ activeTab }: SettingsNavProps): React.JSX.Element {
	return <PageTabs tabs={TABS} activeTab={activeTab} />
}

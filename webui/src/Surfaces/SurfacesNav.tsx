import { faCogs, faGamepad, faGlobe } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link, useLocation } from '@tanstack/react-router'
import classnames from 'classnames'

export function SurfacesNav(): React.JSX.Element {
	const location = useLocation()
	const pathname = location.pathname

	let activeTab = 'configured'
	if (pathname.includes('/surfaces/integrations')) {
		activeTab = 'integrations'
	} else if (pathname.includes('/surfaces/remote') || pathname.includes('/surfaces/discover')) {
		activeTab = 'remote'
	}

	const tabs = [
		{ id: 'configured', label: 'Surfaces & Groups', path: '/surfaces', icon: faGamepad },
		{ id: 'integrations', label: 'Integrations & Settings', path: '/surfaces/integrations', icon: faCogs },
		{ id: 'remote', label: 'Remote & Discover', path: '/surfaces/remote', icon: faGlobe },
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

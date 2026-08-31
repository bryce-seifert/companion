import { faCogs, faGamepad, faGlobe } from '@fortawesome/free-solid-svg-icons'
import { useLocation } from '@tanstack/react-router'
import { PageTabs, type PageTab } from '~/Layout/PageTabs'

const TABS: readonly PageTab[] = [
	{ id: 'configured', label: 'Surfaces & Groups', path: '/surfaces', icon: faGamepad },
	{ id: 'integrations', label: 'Integrations & Settings', path: '/surfaces/integrations', icon: faCogs },
	{ id: 'remote', label: 'Remote & Discover', path: '/surfaces/remote', icon: faGlobe },
]

export function SurfacesNav(): React.JSX.Element {
	const pathname = useLocation().pathname

	let activeTab = 'configured'
	if (pathname.includes('/surfaces/integrations')) {
		activeTab = 'integrations'
	} else if (pathname.includes('/surfaces/remote') || pathname.includes('/surfaces/discover')) {
		activeTab = 'remote'
	}

	return <PageTabs tabs={TABS} activeTab={activeTab} />
}

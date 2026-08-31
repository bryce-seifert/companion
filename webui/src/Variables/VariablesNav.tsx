import { faDollarSign, faNetworkWired, faSquareRootVariable } from '@fortawesome/free-solid-svg-icons'
import { PageTabs, type PageTab } from '~/Layout/PageTabs'

const TABS: readonly PageTab[] = [
	{ id: 'connections', label: 'Connection Variables', path: '/variables', icon: faNetworkWired },
	{ id: 'custom', label: 'Custom Variables', path: '/variables/custom', icon: faDollarSign },
	{ id: 'expression', label: 'Expression Variables', path: '/variables/expression', icon: faSquareRootVariable },
]

interface VariablesNavProps {
	activeTab: 'connections' | 'custom' | 'expression'
}

export function VariablesNav({ activeTab }: VariablesNavProps): React.JSX.Element {
	return <PageTabs tabs={TABS} activeTab={activeTab} />
}

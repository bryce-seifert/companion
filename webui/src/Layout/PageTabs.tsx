import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './PageTabs.css'
import { Link } from '@tanstack/react-router'
import classnames from 'classnames'

export interface PageTab {
	id: string
	label: string
	path: string
	icon: IconDefinition
}

export interface PageTabsProps {
	tabs: readonly PageTab[]
	activeTab: string
}

/**
 * The pill nav strip a page shows under its PageHeader, to move between the sub-pages of a section
 * (settings, variables, surfaces).
 */
export function PageTabs({ tabs, activeTab }: PageTabsProps): React.JSX.Element {
	return (
		<div className="page-tabs">
			{tabs.map((tab) => {
				const active = activeTab === tab.id
				return (
					<Link
						key={tab.id}
						to={tab.path}
						activeOptions={{ exact: true }}
						className={classnames('page-tab', active && 'active')}
					>
						<FontAwesomeIcon icon={tab.icon} />
						<span>{tab.label}</span>
					</Link>
				)
			})}
		</div>
	)
}

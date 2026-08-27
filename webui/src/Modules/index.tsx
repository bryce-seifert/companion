import { faBoxes } from '@fortawesome/free-solid-svg-icons'
import { Outlet, useMatchRoute, useNavigate } from '@tanstack/react-router'
import { memo, useCallback } from 'react'
import { Grid } from '~/Components/Grid'
import { PageHeader } from '~/Layout/PageHeader.js'
import { MyErrorBoundary } from '~/Resources/Error.js'
import { ModulesList, type ModuleTypeAndIdPair } from './ModulesList.js'

export const ModulesPage = memo(function ModulesPage() {
	const matchRoute = useMatchRoute()
	const routeMatch = matchRoute({ to: '/modules/$moduleType/$moduleId' })
	const selectedModuleInfo: ModuleTypeAndIdPair | null = routeMatch ? (routeMatch as ModuleTypeAndIdPair) : null

	const navigate = useNavigate({ from: '/modules' })

	const doManageModule = useCallback(
		(moduleInfo: ModuleTypeAndIdPair | null) => {
			if (moduleInfo) {
				void navigate({ to: '/modules/$moduleType/$moduleId', params: moduleInfo })
			} else {
				void navigate({ to: '/modules' })
			}
		},
		[navigate]
	)

	const isDetailOpen = !!selectedModuleInfo
	const showPrimaryPanel = !isDetailOpen

	return (
		<div className="page-shell">
			<PageHeader icon={faBoxes} title="Modules Manager" helpAction="/user-guide/config/modules" />

			<Grid.Row className="connections-page split-panels flex-1 min-h-0 !h-auto">
				<Grid.Col
					xs={12}
					xl={isDetailOpen ? 6 : 12}
					className={`connections-panel primary-panel h-full min-h-0 ${showPrimaryPanel ? 'block' : 'hidden xl:block'}`}
				>
					<ModulesList doManageModule={doManageModule} selectedModuleInfo={selectedModuleInfo} />
				</Grid.Col>

				{isDetailOpen && (
					<Grid.Col xs={12} xl={6} className="connections-panel secondary-panel h-full min-h-0 block">
						<div className="secondary-panel-simple h-full min-h-0 flex flex-col overflow-hidden">
							<MyErrorBoundary>
								<Outlet />
							</MyErrorBoundary>
						</div>
					</Grid.Col>
				)}
			</Grid.Row>
		</div>
	)
})

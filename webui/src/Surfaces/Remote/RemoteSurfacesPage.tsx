import { faGamepad } from '@fortawesome/free-solid-svg-icons'
import { Outlet, useMatchRoute } from '@tanstack/react-router'
import { observer } from 'mobx-react-lite'
import { Grid } from '~/Components/Grid'
import { PageHeader } from '~/Layout/PageHeader'
import { MyErrorBoundary } from '~/Resources/Error.js'
import { SurfaceDiscoveryContextProvider } from '../Discovery/SurfaceDiscoveryContext.js'
import { SurfacesNav } from '../SurfacesNav.js'
import { RemoteSurfacesList } from './RemoteSurfaces/RemoteSurfacesList.js'

export const RemoteSurfacesPage = observer(function RemoteSurfacesPage(): React.JSX.Element {
	const matchRoute = useMatchRoute()
	const routeMatch = matchRoute({ to: '/surfaces/remote/$connectionId' })
	const selectedRemoteConnectionId = routeMatch ? routeMatch.connectionId : null

	const showPrimaryPanel = !routeMatch
	const showSecondaryPanel = !!routeMatch

	return (
		<div className="page-shell">
			<PageHeader icon={faGamepad} title="Surfaces" helpAction="/user-guide/config/surfaces#remote" />

			<div className="flex flex-col h-full min-h-0 flex-1 overflow-hidden">
				<SurfacesNav />

				<div className="flex-1 min-h-0 overflow-y-auto">
					<Grid.Row className="split-panels flex-1 min-h-0">
						<Grid.Col
							xs={12}
							xl={selectedRemoteConnectionId ? 6 : 12}
							className={`primary-panel ${showPrimaryPanel ? 'block' : 'hidden xl:block'}`}
						>
							<div className="rounded-lg border border-border/70 bg-surface p-4">
								<MyErrorBoundary>
									<RemoteSurfacesList selectedRemoteConnectionId={selectedRemoteConnectionId} />
								</MyErrorBoundary>
							</div>
						</Grid.Col>

						{showSecondaryPanel && (
							<Grid.Col xs={12} xl={6} className="secondary-panel block">
								<div className="secondary-panel-simple h-full min-h-0 flex flex-col overflow-hidden border border-border/70 rounded-lg bg-surface">
									<SurfaceDiscoveryContextProvider>
										<Outlet />
									</SurfaceDiscoveryContextProvider>
								</div>
							</Grid.Col>
						)}
					</Grid.Row>
				</div>
			</div>
		</div>
	)
})

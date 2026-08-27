import { faGamepad } from '@fortawesome/free-solid-svg-icons'
import { PageHeader } from '~/Layout/PageHeader'
import { MyErrorBoundary } from '~/Resources/Error'
import { SurfacesNav } from '../SurfacesNav'
import { SurfaceDiscoveryTable } from './SurfaceDiscoveryTable'

export function SurfaceDiscoveryPage(): React.JSX.Element {
	return (
		<div className="page-shell">
			<PageHeader icon={faGamepad} title="Surfaces" helpAction="/user-guide/config/surfaces#discover" />

			<div className="flex flex-col h-full min-h-0 flex-1 overflow-hidden">
				<SurfacesNav />

				<div className="flex-1 min-h-0 overflow-y-auto">
					<div className="bg-surface-muted/30 border border-border/70 rounded-lg p-3.5 mb-3">
						<h4 className="text-base font-bold text-body mb-1">Discover Surfaces</h4>
						<p className="text-xs text-muted mb-0">
							Discovered remote surfaces (such as Companion Satellite 1.9.0+, Stream Deck Studio, or Network Dock) will
							appear below.
						</p>
					</div>

					<div className="rounded-lg border border-border/70 bg-surface p-4">
						<MyErrorBoundary>
							<SurfaceDiscoveryTable />
						</MyErrorBoundary>
					</div>
				</div>
			</div>
		</div>
	)
}

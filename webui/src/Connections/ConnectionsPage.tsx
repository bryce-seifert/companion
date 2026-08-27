import { faPlug } from '@fortawesome/free-solid-svg-icons'
import { Outlet, useMatchRoute, useNavigate } from '@tanstack/react-router'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect } from 'react'
import { Grid } from '~/Components/Grid'
import { Modal } from '~/Components/Modal.js'
import { AddConnectionsPanel } from '~/Connections/AddConnectionPanel.js'
import { PageHeader } from '~/Layout/PageHeader.js'
import { MyErrorBoundary } from '~/Resources/Error.js'
import { ConnectionsList } from './ConnectionList/ConnectionList.js'

export const ConnectionsPage = observer(function ConnectionsPage(): React.JSX.Element {
	const navigate = useNavigate()
	const matchRoute = useMatchRoute()
	const addConnectionsMatch = !!matchRoute({ to: '/connections/add' })
	const routeMatch = matchRoute({ to: '/connections/$connectionId' })
	const selectedConnectionId = routeMatch && routeMatch.connectionId !== 'add' ? routeMatch.connectionId : null

	const handleCloseModal = useCallback(() => {
		void navigate({ to: '/connections' })
	}, [navigate])

	// Close configuration panel on Escape key
	useEffect(() => {
		if (!selectedConnectionId) return

		const handleKeyDown = (e: KeyboardEvent) => {
			// Don't close if a modal is open or typing in a form input that might want Esc to clear
			if (addConnectionsMatch) return
			if (e.key === 'Escape') {
				void navigate({ to: '/connections' })
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [selectedConnectionId, addConnectionsMatch, navigate])

	// On narrow screens, show only one panel at a time (list or edit)
	const isDetailOpen = !!selectedConnectionId
	const showPrimaryPanel = !isDetailOpen

	return (
		<div className="page-shell">
			<PageHeader icon={faPlug} title="Connections" helpAction="/user-guide/config/connections" />

			<Grid.Row className="connections-page split-panels flex-1 min-h-0 !h-auto">
				<Grid.Col
					xl={isDetailOpen ? 6 : 12}
					className={`connections-panel primary-panel h-full min-h-0 ${showPrimaryPanel ? 'block' : 'hidden xl:block'}`}
				>
					<ConnectionsList selectedConnectionId={selectedConnectionId} />
				</Grid.Col>

				{isDetailOpen && (
					<Grid.Col xl={6} className="connections-panel secondary-panel h-full min-h-0 block">
						<div className="secondary-panel-simple h-full min-h-0 flex flex-col overflow-hidden">
							<MyErrorBoundary>
								<Outlet />
							</MyErrorBoundary>
						</div>
					</Grid.Col>
				)}
			</Grid.Row>

			<Modal.Root
				open={addConnectionsMatch}
				onOpenChange={(open) => {
					if (!open) handleCloseModal()
				}}
			>
				<Modal.Portal>
					<Modal.Backdrop />
					<Modal.Viewport>
						<Modal.Popup size="xl" scrollable>
							<Modal.Header closeButton>
								<Modal.Title>Add Connection</Modal.Title>
							</Modal.Header>
							<Modal.Body>
								<MyErrorBoundary>
									<AddConnectionsPanel isModal={true} />
								</MyErrorBoundary>
							</Modal.Body>
						</Modal.Popup>
					</Modal.Viewport>
				</Modal.Portal>
			</Modal.Root>
		</div>
	)
})

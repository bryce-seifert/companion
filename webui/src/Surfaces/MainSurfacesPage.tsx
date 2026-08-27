import { faAdd, faGamepad, faSync } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useMutation } from '@tanstack/react-query'
import { Outlet, useMatchRoute, useNavigate } from '@tanstack/react-router'
import classnames from 'classnames'
import { observer } from 'mobx-react-lite'
import { useCallback, useRef, useState } from 'react'
import { StaticAlert } from '~/Components/Alert'
import { Button, ButtonGroup } from '~/Components/Button'
import { Grid } from '~/Components/Grid'
import { useTwoPanelMode } from '~/Hooks/useLayoutMode'
import { PageHeader } from '~/Layout/PageHeader'
import { MyErrorBoundary } from '~/Resources/Error'
import { trpc } from '~/Resources/TRPC'
import { AddEmulatorModal, type AddEmulatorModalRef } from './AddEmulatorModal'
import { AddSurfaceGroupModal, type AddSurfaceGroupModalRef } from './AddGroupModal'
import { KnownSurfacesTable } from './KnownSurfacesTable'
import { SurfacesNav } from './SurfacesNav'
import { UdevRulesAlert } from './UdevRulesAlert'

export const MainSurfacesPage = observer(function MainSurfacesPage(): React.JSX.Element {
	const twoPanelMode = useTwoPanelMode()

	const navigate = useNavigate()
	const matchRoute = useMatchRoute()

	const routeMatch = matchRoute({ to: '/surfaces/$itemId' })
	const selectedSurfaceId = routeMatch ? routeMatch.itemId : null

	const addGroupModalRef = useRef<AddSurfaceGroupModalRef>(null)
	const addEmulatorModalRef = useRef<AddEmulatorModalRef>(null)

	const [scanError, setScanError] = useState<string | null>(null)

	const rescanUsbMutation = useMutation(trpc.surfaces.rescanUsb.mutationOptions())
	const rescanUsbMutationAsync = rescanUsbMutation.mutateAsync

	const refreshUSB = useCallback(() => {
		setScanError(null)

		rescanUsbMutationAsync()
			.then((errorMsg) => {
				setScanError(errorMsg || null)
			})
			.catch((err) => {
				console.error('Refresh USB failed', err)
				setScanError('Rescanning USB devices failed! Please try again.')
			})
	}, [rescanUsbMutationAsync])

	const addEmulator = useCallback(() => {
		addEmulatorModalRef.current?.show()
	}, [])
	const addGroup = useCallback(() => {
		addGroupModalRef.current?.show()
	}, [])

	const selectKnownSurface = useCallback(
		(itemId: string | null) => {
			if (itemId === null || selectedSurfaceId === itemId) {
				void navigate({ to: '/surfaces' })
			} else {
				void navigate({
					to: '/surfaces/$itemId',
					params: {
						itemId: itemId,
					},
				})
			}
		},
		[navigate, selectedSurfaceId]
	)

	const showPrimaryPanel = twoPanelMode || !selectedSurfaceId
	const showSecondaryPanel = twoPanelMode || !!selectedSurfaceId

	return (
		<div className="page-shell">
			<PageHeader icon={faGamepad} title="Surfaces" helpAction="/user-guide/config/surfaces" />

			<div className="flex flex-col h-full min-h-0 flex-1 overflow-hidden">
				<SurfacesNav />

				<Grid.Row className="surfaces-page split-panels flex-1 min-h-0 !h-auto">
					<Grid.Col
						xs={12}
						xl={selectedSurfaceId ? 6 : 12}
						className={classnames('primary-panel h-full min-h-0', showPrimaryPanel ? 'flex' : 'hidden xl:flex')}
					>
						<div className="flex flex-col h-full min-h-0 gap-2.5 w-full">
							{scanError && (
								<StaticAlert color="warning" role="alert">
									{scanError}
								</StaticAlert>
							)}

							<UdevRulesAlert />

							{/* Top Header Card: Actions & Rescan */}
							<div className="bg-surface-muted/50 border border-border/70 p-3 rounded-lg flex items-center justify-between gap-2 flex-wrap shrink-0">
								<ButtonGroup>
									<Button color="primary" size="sm" onClick={refreshUSB}>
										<FontAwesomeIcon icon={faSync} spin={rescanUsbMutation.isPending} className="me-1.5" />
										{rescanUsbMutation.isPending ? 'Rescanning USB...' : 'Rescan USB'}
									</Button>
									<Button color="secondary" size="sm" onClick={addEmulator}>
										<FontAwesomeIcon icon={faAdd} className="me-1.5" /> Add Emulator
									</Button>
									<Button color="secondary" size="sm" onClick={addGroup}>
										<FontAwesomeIcon icon={faAdd} className="me-1.5" /> Add Group
									</Button>
								</ButtonGroup>
							</div>

							<AddSurfaceGroupModal ref={addGroupModalRef} />
							<AddEmulatorModal ref={addEmulatorModalRef} />

							{/* Surfaces Table Container */}
							<div className="flex-1 min-h-0 scrollable-content rounded-md border border-border/70 bg-surface">
								<KnownSurfacesTable selectedItemId={selectedSurfaceId} selectItem={selectKnownSurface} />
							</div>
						</div>
					</Grid.Col>

					{showSecondaryPanel && (
						<Grid.Col xs={12} xl={6} className={'secondary-panel h-full min-h-0 block'}>
							<div className="secondary-panel-simple h-full min-h-0 flex flex-col overflow-hidden border border-border/70 rounded-lg bg-surface">
								<MyErrorBoundary>
									<Outlet />
								</MyErrorBoundary>
							</div>
						</Grid.Col>
					)}
				</Grid.Row>
			</div>
		</div>
	)
})

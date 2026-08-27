import { faImages } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Outlet, useMatchRoute, useNavigate } from '@tanstack/react-router'
import './image-library.css'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import { useCallback } from 'react'
import { Grid } from '~/Components/Grid'
import { useTwoPanelMode } from '~/Hooks/useLayoutMode'
import { PageHeader } from '~/Layout/PageHeader'
import { CloseButton, ContextHelpButton } from '~/Layout/PanelIcons'
import { MyErrorBoundary } from '~/Resources/Error'
import { ImageLibraryGrid } from './ImageLibraryGrid'

export const ImageLibraryPage = observer(function ImageLibraryPage() {
	const matchRoute = useMatchRoute()
	const routeMatch = matchRoute({ to: '/image-library/$imageName' })

	const navigate = useNavigate({ from: '/image-library' })

	const selectedImageName = routeMatch ? routeMatch.imageName : null

	const handleSelectImage = useCallback(
		(imageName: string | null) => {
			if (imageName === null) {
				void navigate({ to: '/image-library' })
			} else {
				void navigate({
					to: `/image-library/$imageName`,
					params: {
						imageName,
					},
				})
			}
		},
		[navigate]
	)

	const doCloseImage = useCallback(() => {
		void navigate({ to: '/image-library' })
	}, [navigate])

	const twoPanelMode = useTwoPanelMode()
	const showPrimaryPanel = twoPanelMode || !selectedImageName

	return (
		<div className="page-shell">
			<PageHeader icon={faImages} title="Image Library" helpAction="/user-guide/config/image-library" />

			<div className="flex-1 min-h-0 overflow-y-auto">
				<Grid.Row className="image-library-page split-panels flex-1 min-h-0 !h-auto">
					<Grid.Col
						xs={12}
						xl={selectedImageName ? 6 : 12}
						className={classNames('primary-panel h-full min-h-0', showPrimaryPanel ? 'block' : 'hidden xl:block')}
					>
						<MyErrorBoundary>
							<ImageLibraryGrid selectedImageName={selectedImageName} onSelectImage={handleSelectImage} />
						</MyErrorBoundary>
					</Grid.Col>

					{!!selectedImageName && (
						<Grid.Col xs={12} xl={6} className={'secondary-panel h-full min-h-0 block'}>
							<div className="secondary-panel-simple h-full min-h-0 flex flex-col overflow-hidden border border-border/70 rounded-lg bg-surface">
								<ImageEditPanelHeading doClose={doCloseImage} twoPanelMode={twoPanelMode} />
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

interface ImageEditPanelHeadingProps {
	doClose: () => void
	twoPanelMode: boolean
}

function ImageEditPanelHeading({ doClose, twoPanelMode }: ImageEditPanelHeadingProps) {
	return (
		<div className="flex items-center justify-between gap-3 p-3 bg-surface-muted/40 border-b border-border/70 shrink-0">
			<div className="flex items-center gap-2">
				<span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-surface-muted text-muted text-xs">
					<FontAwesomeIcon icon={faImages} />
				</span>
				<h3 className="text-sm font-bold text-body mb-0">Edit Image</h3>
			</div>
			<div className="flex items-center gap-1.5">
				<ContextHelpButton action="/user-guide/config/image-library#editing">Define your image here.</ContextHelpButton>
				{!twoPanelMode && <CloseButton closeFn={doClose} />}
			</div>
		</div>
	)
}

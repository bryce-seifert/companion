import { faFileExport, faHome, faPencil, faTableCells } from '@fortawesome/free-solid-svg-icons'
import './ButtonGridPanel.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { observer } from 'mobx-react-lite'
import React, { useCallback, useContext, useRef } from 'react'
import type { ControlLocation } from '@companion-app/shared/Model/Common.js'
import { Button } from '~/Components/Button.js'
import { ConfirmExportModal, type ConfirmExportModalRef } from '~/Components/ConfirmExportModal.js'
import { Grid } from '~/Components/Grid'
import { useHasBeenRendered } from '~/Hooks/useHasBeenRendered.js'
import { PageHeader } from '~/Layout/PageHeader.js'
import { KeyReceiver, makeAbsolutePath } from '~/Resources/util.js'
import { RootAppStoreContext } from '~/Stores/RootAppStore.js'
import { ButtonGridActions, type ButtonGridActionsRef } from './ButtonGridActions.js'
import { ButtonGridHeader } from './ButtonGridHeader.js'
import { ButtonGridResizePrompt } from './ButtonGridResizePrompt.js'
import { ButtonInfiniteGrid, PrimaryButtonGridIcon, type ButtonInfiniteGridRef } from './ButtonInfiniteGrid.js'
import { EditPagePropertiesModal, type EditPagePropertiesModalRef } from './EditPageProperties.js'

interface ButtonsGridPanelProps {
	pageNumber: number
	onKeyDown: (event: React.KeyboardEvent) => void
	isHot: boolean
	buttonGridClick: (location: ControlLocation, pressed: boolean) => void
	changePage: (pageNumber: number) => void
	selectedButton: ControlLocation | null
	clearSelectedButton: () => void
	copySourceButton?: ControlLocation | null
	contextMenuButton?: ControlLocation | null
	onButtonContextMenu?: (location: ControlLocation, x: number, y: number) => void
}

export const ButtonsGridPanel = observer(function ButtonsPage({
	pageNumber,
	onKeyDown,
	isHot,
	buttonGridClick,
	changePage,
	selectedButton,
	clearSelectedButton,
	copySourceButton,
	contextMenuButton,
	onButtonContextMenu,
}: ButtonsGridPanelProps) {
	const { pages, userConfig } = useContext(RootAppStoreContext)

	const actionsRef = useRef<ButtonGridActionsRef>(null)

	const buttonClick = useCallback(
		(location: ControlLocation, isDown: boolean) => {
			if (!actionsRef.current?.buttonClick(location, isDown)) {
				buttonGridClick(location, isDown)
			}
		},
		[buttonGridClick]
	)

	const setPage = useCallback(
		(newPage: number) => {
			if (newPage >= 1 && newPage <= pages.data.length) {
				changePage(newPage)
			}
		},
		[changePage, pages]
	)

	const changePage2 = useCallback(
		(delta: number) => {
			const pageCount = pages.data.length

			let newPage = pageNumber + delta
			if (newPage < 1) newPage += pageCount
			if (newPage > pageCount) newPage -= pageCount

			if (!isNaN(newPage)) {
				changePage(newPage)
			}
		},
		[changePage, pageNumber, pages]
	)

	const pageInfo = pages.get(pageNumber)

	const gridRef = useRef<ButtonInfiniteGridRef>(null)
	const editRef = useRef<EditPagePropertiesModalRef>(null)

	const exportModalRef = useRef<ConfirmExportModalRef>(null)
	const showExportModal = useCallback(() => {
		exportModalRef.current?.show(makeAbsolutePath(`/int/export/page/${pageNumber}`))
	}, [pageNumber])

	const resetPosition = useCallback(() => {
		gridRef.current?.resetPosition()
	}, [gridRef])

	const configurePage = useCallback(() => {
		editRef.current?.show(Number(pageNumber), pageInfo)
	}, [pageNumber, pageInfo])

	const gridSize = userConfig.properties?.gridSize

	const [hasBeenInView, isInViewRef] = useHasBeenRendered()

	return (
		<KeyReceiver onKeyDown={onKeyDown} tabIndex={0} className="button-grid-panel">
			<div className="button-grid-panel-header" ref={isInViewRef}>
				<ConfirmExportModal ref={exportModalRef} title="Export Page" />
				<EditPagePropertiesModal ref={editRef} includeName />

				<PageHeader icon={faTableCells} title="Buttons" helpAction="/user-guide/config/buttons/" />

				<ButtonGridResizePrompt />

				<Grid.Row>
					<Grid.Col sm={12}>
						<ButtonGridHeader pageNumber={pageNumber} changePage={changePage2} setPage={setPage}>
							<Button color="light" onClick={resetPosition} title="Home Position" className="ms-1">
								<FontAwesomeIcon icon={faHome} className="me-1.5" />
								<span>Home</span>
							</Button>
							<Button color="light" onClick={configurePage} title="Edit Page" className="ms-1">
								<FontAwesomeIcon icon={faPencil} className="me-1.5" />
								<span>Edit Page</span>
							</Button>
							<Button color="light" onClick={showExportModal} title="Export Page" className="ms-1">
								<FontAwesomeIcon icon={faFileExport} className="me-1.5" />
								<span>Export</span>
							</Button>
						</ButtonGridHeader>
					</Grid.Col>
				</Grid.Row>
			</div>
			<div className="button-grid-panel-content">
				{hasBeenInView && gridSize && (
					<ButtonInfiniteGrid
						ref={gridRef}
						isHot={isHot}
						pageNumber={pageNumber}
						buttonClick={buttonClick}
						selectedButton={selectedButton}
						copySourceButton={copySourceButton}
						contextMenuButton={contextMenuButton}
						onButtonContextMenu={onButtonContextMenu}
						gridSize={gridSize}
						ButtonIconFactory={PrimaryButtonGridIcon}
					/>
				)}
			</div>
			<div className="button-grid-panel-footer">
				<ButtonGridActions
					ref={actionsRef}
					isHot={isHot}
					pageNumber={pageNumber}
					clearSelectedButton={clearSelectedButton}
				/>
			</div>
		</KeyReceiver>
	)
})

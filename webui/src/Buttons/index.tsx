import { useDragDropMonitor } from '@dnd-kit/react'
import { faCalculator, faDollarSign, faGift, faThLarge, faVideoCamera } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useMatchRoute, useNavigate, type UseNavigateResult } from '@tanstack/react-router'
import { observer } from 'mobx-react-lite'
import { nanoid } from 'nanoid'
import { useCallback, useContext, useRef, useState } from 'react'
import { formatLocation } from '@companion-app/shared/ControlId.js'
import type { ControlLocation } from '@companion-app/shared/Model/Common.js'
import { ContextMenu } from '~/Components/ContextMenu.js'
import { GenericConfirmModal, type GenericConfirmModalRef } from '~/Components/GenericConfirmModal.js'
import { TabArea } from '~/Components/TabArea.js'
import { safeSetSessionStorage } from '~/Helpers/SafeStorage.js'
import { useTwoPanelMode } from '~/Hooks/useLayoutMode.js'
import { SplitPanels } from '~/Layout/SplitPanels.js'
import { MyErrorBoundary } from '~/Resources/Error.js'
import { trpc, useMutationExt } from '~/Resources/TRPC.js'
import { RootAppStoreContext } from '~/Stores/RootAppStore.js'
import { ActionRecorder } from './ActionRecorder/index.js'
import { ButtonsGridPanel } from './ButtonGridPanel.js'
import { EditButton } from './EditButton/EditButton.js'
import { parseGridButtonDroppableId } from './GridButtonDroppableId.js'
import { PageVariablesPanel } from './PageVariablesPanel.js'
import type { PresetDragItem } from './Presets/PresetDragItem.js'
import { ConnectionPresets } from './Presets/Presets.js'
import { useButtonContextMenu } from './useButtonContextMenu.js'

const SESSION_STORAGE_LAST_BUTTONS_PAGE = 'lastButtonsPage'

function useUrlPageNumber(): number | null {
	const matchRoute = useMatchRoute()
	const match = matchRoute({ to: '/buttons/$page' })

	const pageIndex = match ? Number(match.page) : NaN
	if (isNaN(pageIndex) || pageIndex <= 0) return 0

	return pageIndex
}

function navigateToButtonsPage(navigate: UseNavigateResult<'/buttons'>, pageNumber: number): void {
	void navigate({ to: `/buttons/${pageNumber}` })
	safeSetSessionStorage(SESSION_STORAGE_LAST_BUTTONS_PAGE, pageNumber.toString())
}

function getLastPageNumber(): number {
	const lastPage = Number(window.sessionStorage.getItem(SESSION_STORAGE_LAST_BUTTONS_PAGE))
	if (!isNaN(lastPage) && lastPage > 0) {
		return lastPage
	}
	return 1
}

export const ButtonsPage = observer(function ButtonsPage() {
	const { userConfig, pages, viewControl } = useContext(RootAppStoreContext)

	const clearModalRef = useRef<GenericConfirmModalRef>(null)

	const isLargeScreen = useTwoPanelMode()

	const [tabResetToken, setTabResetToken] = useState(nanoid())
	const [activeTab, setActiveTab] = useState('grid')

	const [selectedButton, setSelectedButton] = useState<ControlLocation | null>(null)
	const [copyFromButton, setCopyFromButton] = useState<[ControlLocation, string] | null>(null)

	const navigate = useNavigate({ from: '/buttons' })
	let pageNumber = useUrlPageNumber()
	const setPageNumber = useCallback(
		(pageNumber: number) => {
			navigateToButtonsPage(navigate, pageNumber)
		},
		[navigate]
	)

	const doChangeTab = useCallback((newTab: string) => {
		setActiveTab((oldTab) => {
			if (newTab !== 'edit' && newTab !== 'grid' && oldTab !== newTab) {
				setSelectedButton(null)
				setTabResetToken(nanoid())
			}
			return newTab
		})
	}, [])

	const hotPressMutation = useMutationExt(trpc.controls.hotPressControl.mutationOptions())
	const doButtonGridClick = useCallback(
		(location: ControlLocation, isDown: boolean) => {
			if (viewControl.buttonGridHotPress) {
				hotPressMutation
					.mutateAsync({ location, direction: isDown, surfaceId: 'grid' })
					.catch((e) => console.error(`Hot press failed: ${e}`))
			} else if (isDown) {
				setActiveTab('edit')
				console.log('set selected', location)
				setSelectedButton(location)
				setTabResetToken(nanoid())
			}
		},
		[hotPressMutation, viewControl]
	)
	const navigateToControl = useCallback(
		(location: ControlLocation) => {
			setPageNumber(location.pageNumber)
			setActiveTab('edit')
			setSelectedButton(location)
			setTabResetToken(nanoid())
		},
		[setPageNumber]
	)
	const clearSelectedButton = useCallback(() => {
		setSelectedButton(null)
		if (!isLargeScreen) {
			doChangeTab('grid')
		} else {
			doChangeTab('page-variables') // Fallback tab on large screens when no button is selected
		}
	}, [doChangeTab, isLargeScreen])

	// When screen becomes large, we can allow activeTab to be 'grid' which will collapse the right panel.
	// We don't force it away anymore.

	const gridSize = userConfig.properties?.gridSize

	const resetControlsMutation = useMutationExt(trpc.controls.resetControls.mutationOptions())
	const gridTransferMutation = useMutationExt(trpc.controls.gridBatchTransfer.mutationOptions())

	// Dropping a preset (from the Presets tab) onto a grid button imports it at that location.
	// Subscribed via the global dnd-kit provider; we filter to preset drags by `type`.
	const importPresetMutation = useMutationExt(trpc.controls.importPreset.mutationOptions())
	useDragDropMonitor({
		onDragEnd(event) {
			if (event.canceled) return
			const { source, target } = event.operation
			if (!source || !target || source.type !== 'preset') return

			const location = parseGridButtonDroppableId(target.id)
			if (!location) return

			const dropData = source.data as PresetDragItem
			importPresetMutation
				.mutateAsync({
					connectionId: dropData.connectionId,
					presetId: dropData.presetId,
					location,
					variableValues: dropData.variableValues,
					mode: dropData.mode,
				})
				.catch(() => {
					console.error('Preset import failed')
				})
		},
	})

	const {
		contextMenuOpen,
		setContextMenuOpen,
		contextMenuPosition,
		contextMenuLocation,
		contextMenuItems,
		doButtonContextMenu,
	} = useButtonContextMenu({
		copyFromButton,
		setCopyFromButton,
		clearModalRef,
		setTabResetToken,
	})

	const handleKeyDownInButtons = useCallback(
		(e: React.KeyboardEvent) => {
			const isControlOrCommandCombo = (e.ctrlKey || e.metaKey) && !e.altKey

			// e.target is the actual element where the event happened, e.currentTarget is the element where the event listener is attached
			const targetElement = e.target as HTMLElement

			// TODO - this feels messy, perhaps this can be done cleaner?
			if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA') {
				// Don't interfere with typing in inputs
				return
			}
			if (targetElement.classList.contains('native-edit-context')) {
				// Don't interfere with typing in the expression editor
				return
			}

			switch (e.key) {
				case 'Escape':
					setCopyFromButton(null)
					break
				case 'ArrowDown':
					setSelectedButton((selectedButton) => {
						if (selectedButton && gridSize) {
							return {
								...selectedButton,
								row: selectedButton.row >= gridSize.maxRow ? gridSize.minRow : selectedButton.row + 1,
							}
						} else {
							return selectedButton
						}
					})
					// TODO - ensure kept in view
					break
				case 'ArrowUp':
					setSelectedButton((selectedButton) => {
						if (selectedButton && gridSize) {
							return {
								...selectedButton,
								row: selectedButton.row <= gridSize.minRow ? gridSize.maxRow : selectedButton.row - 1,
							}
						} else {
							return selectedButton
						}
					})
					// TODO - ensure kept in view
					break
				case 'ArrowLeft':
					setSelectedButton((selectedButton) => {
						if (selectedButton && gridSize) {
							return {
								...selectedButton,
								column: selectedButton.column <= gridSize.minColumn ? gridSize.maxColumn : selectedButton.column - 1,
							}
						} else {
							return selectedButton
						}
					})
					// TODO - ensure kept in view
					break
				case 'ArrowRight':
					setSelectedButton((selectedButton) => {
						if (selectedButton && gridSize) {
							return {
								...selectedButton,
								column: selectedButton.column >= gridSize.maxColumn ? gridSize.minColumn : selectedButton.column + 1,
							}
						} else {
							return selectedButton
						}
					})
					// TODO - ensure kept in view
					break
				case 'PageUp':
					setSelectedButton((selectedButton) => {
						if (selectedButton) {
							const newPageNumber = selectedButton.pageNumber >= pages.data.length ? 1 : selectedButton.pageNumber + 1
							setPageNumber(newPageNumber)
							return {
								...selectedButton,
								pageNumber: newPageNumber,
							}
						} else {
							return selectedButton
						}
					})
					break
				case 'PageDown':
					setSelectedButton((selectedButton) => {
						if (selectedButton) {
							const newPageNumber = selectedButton.pageNumber <= 1 ? pages.data.length : selectedButton.pageNumber - 1
							setPageNumber(newPageNumber)
							return {
								...selectedButton,
								pageNumber: newPageNumber,
							}
						} else {
							return selectedButton
						}
					})
					break
			}

			if (selectedButton) {
				// keyup with button selected

				if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'Backspace' || e.key === 'Delete')) {
					clearModalRef.current?.show(
						`Clear button ${formatLocation(selectedButton)}`,
						`This will clear the style, feedbacks and all actions`,
						'Clear',
						() => {
							resetControlsMutation.mutateAsync({ locations: [selectedButton], newType: null }).catch((e) => {
								console.error(`Reset failed: ${e}`)
							})
						}
					)
				}
				if (isControlOrCommandCombo && e.key.toLowerCase() === 'c') {
					console.log('prepare copy', selectedButton)
					setCopyFromButton([selectedButton, 'copy'])
				}
				if (isControlOrCommandCombo && e.key.toLowerCase() === 'x') {
					console.log('prepare cut', selectedButton)
					setCopyFromButton([selectedButton, 'cut'])
				}
				if (isControlOrCommandCombo && e.key.toLowerCase() === 'v' && copyFromButton) {
					console.log('do paste', copyFromButton, selectedButton)

					if (copyFromButton[1] === 'copy') {
						gridTransferMutation
							.mutateAsync({
								operation: 'copy',
								pairs: [{ fromLocation: copyFromButton[0], toLocation: selectedButton }],
							})
							.catch((e) => {
								console.error(`copy failed: ${e}`)
							})
						setTabResetToken(nanoid())
					} else if (copyFromButton[1] === 'cut') {
						gridTransferMutation
							.mutateAsync({
								operation: 'move',
								pairs: [{ fromLocation: copyFromButton[0], toLocation: selectedButton }],
							})
							.catch((e) => {
								console.error(`move failed: ${e}`)
							})
						setCopyFromButton(null)
						setTabResetToken(nanoid())
					} else if (copyFromButton[1] === 'swap') {
						gridTransferMutation
							.mutateAsync({
								operation: 'swap',
								pairs: [{ fromLocation: copyFromButton[0], toLocation: selectedButton }],
							})
							.catch((e) => {
								console.error(`swap failed: ${e}`)
							})
						setCopyFromButton(null)
						setTabResetToken(nanoid())
					} else {
						console.error('unknown paste operation:', copyFromButton[1])
					}
				}
			}
		},
		[
			resetControlsMutation,
			gridTransferMutation,
			selectedButton,
			copyFromButton,
			gridSize,
			setPageNumber,
			pages.data.length,
		]
	)

	if (pageNumber === null) {
		return <></>
	} else if (pageNumber <= 0) {
		setTimeout(() => navigateToButtonsPage(navigate, getLastPageNumber()), 0)
		// Force the number and let it render
		pageNumber = 1
	} else if (pageNumber > pages.pageCount) {
		const newPageNumber = pages.pageCount
		setTimeout(() => navigateToButtonsPage(navigate, newPageNumber), 0)
		// Force the number and let it render
		pageNumber = newPageNumber
	}

	const gridPanel = (
		<MyErrorBoundary>
			<ButtonsGridPanel
				buttonGridClick={doButtonGridClick}
				isHot={viewControl.buttonGridHotPress}
				selectedButton={selectedButton}
				copySourceButton={copyFromButton?.[0] ?? null}
				contextMenuButton={contextMenuOpen ? contextMenuLocation : null}
				onButtonContextMenu={doButtonContextMenu}
				pageNumber={pageNumber}
				changePage={setPageNumber}
				onKeyDown={handleKeyDownInButtons}
				clearSelectedButton={clearSelectedButton}
			/>
		</MyErrorBoundary>
	)

	return (
		<SplitPanels.Root
			showing={activeTab === 'grid' && isLargeScreen ? 'primary' : null}
			resize={{ storageKey: 'buttons' }}
		>
			<GenericConfirmModal ref={clearModalRef} />
			<ContextMenu
				open={contextMenuOpen}
				onOpenChange={setContextMenuOpen}
				position={contextMenuPosition}
				menuItems={contextMenuItems}
			/>

			{/* On large screens, show the grid in its own column */}
			{isLargeScreen && <SplitPanels.Primary>{gridPanel}</SplitPanels.Primary>}

			<SplitPanels.Secondary>
				<div className="secondary-panel-inner">
					<TabArea.Root value={activeTab} onValueChange={setActiveTab}>
						<TabArea.List>
							<TabArea.Tab value="grid" className={isLargeScreen ? 'hidden' : ''}>
								<FontAwesomeIcon icon={faThLarge} /> Buttons
							</TabArea.Tab>
							{selectedButton && (
								<TabArea.Tab value="edit">
									<FontAwesomeIcon icon={faCalculator} /> Edit Button{' '}
									{selectedButton ? `${formatLocation(selectedButton)}` : '?'}
								</TabArea.Tab>
							)}
							<TabArea.Tab value="page-variables">
								<FontAwesomeIcon icon={faDollarSign} /> Page Variables
							</TabArea.Tab>
							<TabArea.Tab value="presets">
								<FontAwesomeIcon icon={faGift} /> Presets
							</TabArea.Tab>
							<TabArea.Tab value="action-recorder">
								<FontAwesomeIcon icon={faVideoCamera} /> Recorder
							</TabArea.Tab>
						</TabArea.List>

						{/* On small screens, show the grid in its own tab */}
						{!isLargeScreen && <TabArea.Panel value="grid">{gridPanel}</TabArea.Panel>}
						<TabArea.Panel value="edit">
							<MyErrorBoundary>
								{selectedButton && (
									<EditButton
										key={`${formatLocation(selectedButton)}-${tabResetToken}`}
										location={selectedButton}
										onKeyUp={handleKeyDownInButtons}
										navigateToControl={navigateToControl}
									/>
								)}
							</MyErrorBoundary>
						</TabArea.Panel>
						<TabArea.Panel value="page-variables">
							<MyErrorBoundary>
								<PageVariablesPanel pageNumber={pageNumber} />
							</MyErrorBoundary>
						</TabArea.Panel>
						<TabArea.Panel value="presets">
							<MyErrorBoundary>
								<ConnectionPresets resetToken={tabResetToken} />
							</MyErrorBoundary>
						</TabArea.Panel>
						<TabArea.Panel value="action-recorder" className="pt-0">
							<MyErrorBoundary>
								<ActionRecorder />
							</MyErrorBoundary>
						</TabArea.Panel>
					</TabArea.Root>
				</div>
			</SplitPanels.Secondary>
		</SplitPanels.Root>
	)
})

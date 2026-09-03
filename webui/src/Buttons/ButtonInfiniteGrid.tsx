import { useDragOperation, useDroppable } from '@dnd-kit/react'
import classNames from 'classnames'
import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { formatLocation } from '@companion-app/shared/ControlId.js'
import type { ControlLocation } from '@companion-app/shared/Model/Common.js'
import type { UserConfigGridSize } from '@companion-app/shared/Model/UserConfigModel.js'
import { ButtonPreview } from '~/Components/ButtonPreview.js'
import { useButtonImageForLocation } from '~/Hooks/useButtonImageForLocation.js'
import useElementInnerSize from '~/Hooks/useElementClientSize.js'
import useScrollPosition from '~/Hooks/useScrollPosition.js'
import { makeGridButtonDroppableId } from './GridButtonDroppableId.js'

export interface ButtonInfiniteGridRef {
	resetPosition(): void
}

export interface ButtonInfiniteGridButtonProps {
	pageNumber: number
	column: number
	row: number

	image: string | null
	left: number
	top: number
	style: React.CSSProperties
	onContextMenu?: (location: ControlLocation, x: number, y: number) => void
	copySource?: boolean
}

interface ButtonInfiniteGridProps {
	isHot?: boolean
	pageNumber: number
	buttonClick?: (location: ControlLocation, pressed: boolean) => void
	selectedButton?: ControlLocation | null
	copySourceButton?: ControlLocation | null
	contextMenuButton?: ControlLocation | null
	onButtonContextMenu?: (location: ControlLocation, x: number, y: number) => void
	gridSize: UserConfigGridSize
	ButtonIconFactory: React.ClassType<ButtonInfiniteGridButtonProps, any, any> // TODO - this type is flawed
	maxHeightToMatchCanvas?: boolean
}

export const ButtonInfiniteGrid = forwardRef<ButtonInfiniteGridRef, ButtonInfiniteGridProps>(
	function ButtonInfiniteGrid(
		{
			isHot,
			pageNumber,
			buttonClick,
			selectedButton,
			copySourceButton,
			contextMenuButton,
			onButtonContextMenu,
			gridSize,
			ButtonIconFactory,
			maxHeightToMatchCanvas,
		},
		ref
	) {
		const { minColumn, maxColumn, minRow, maxRow } = gridSize
		const countColumns = maxColumn - minColumn + 1
		const countRows = maxRow - minRow + 1

		const [setSizeElement, windowSizeRaw] = useElementInnerSize()
		const { scrollX: scrollXRaw, scrollY: scrollYRaw, setRef: setScrollRef } = useScrollPosition<HTMLDivElement>()

		const autoScale = useMemo(() => {
			if (windowSizeRaw.width <= 10 || windowSizeRaw.height <= 10) return 1
			const SCROLLBAR_ESTIMATE = 16
			const availableWidth = windowSizeRaw.width - SCROLLBAR_ESTIMATE
			const availableHeight = windowSizeRaw.height - SCROLLBAR_ESTIMATE
			// 72 is the base inner size, plus 2*3.6 approx padding
			const baseTileSize = 79.2
			const fitWidth = availableWidth / (countColumns * baseTileSize)
			const fitHeight = availableHeight / (countRows * baseTileSize)

			// Use the smaller scale so it fully fits, but cap at 300% to avoid absurdly huge buttons.
			// Quantised to 1% steps so that dragging a resize handle doesn't re-lay out every tile per frame.
			const scale = Math.min(3, Math.max(0.2, Math.min(fitWidth, fitHeight)))
			return Math.round(scale * 100) / 100
		}, [windowSizeRaw, countColumns, countRows])

		// Auto scale replaces the manually passed drawScale
		const effectiveDrawScale = autoScale

		const tileInnerSize = 72 * effectiveDrawScale
		const tilePadding = Math.min(6, tileInnerSize * 0.05)
		const tileSize = tileInnerSize + tilePadding * 2
		const SCROLLBAR_PADDING = 15

		// Freeze visible area when hidden: keep last known valid (non-zero) size/scroll
		// This prevents visible buttons from being unmounted when the grid is hidden (e.g., tab switch)
		const lastValidWindowSize = useRef<{ width: number; height: number } | null>(null)
		const lastValidScroll = useRef<{ x: number; y: number } | null>(null)
		useEffect(() => {
			if (windowSizeRaw.width > 10 && windowSizeRaw.height > 10) {
				lastValidWindowSize.current = windowSizeRaw
			}
		}, [windowSizeRaw])

		useEffect(() => {
			if (
				lastValidWindowSize.current &&
				lastValidWindowSize.current.width > 10 &&
				lastValidWindowSize.current.height > 10
			) {
				lastValidScroll.current = { x: scrollXRaw, y: scrollYRaw }
			}
		}, [scrollXRaw, scrollYRaw])

		// Use frozen values if current size is zero/tiny (grid is hidden), otherwise use live values
		const isHidden = windowSizeRaw.width <= 10 || windowSizeRaw.height <= 10
		const windowSize = isHidden && lastValidWindowSize.current ? lastValidWindowSize.current : windowSizeRaw
		const scrollX = isHidden && lastValidScroll.current ? lastValidScroll.current.x : scrollXRaw
		const scrollY = isHidden && lastValidScroll.current ? lastValidScroll.current.y : scrollYRaw

		// Reposition the window to have 0/0 in the top left
		const [scrollerRef, setScrollerRef] = useState<HTMLDivElement | null>(null)
		const resetScrollPosition = useCallback(() => {
			if (scrollerRef) {
				scrollerRef.scrollTop = -minRow * tileSize
				scrollerRef.scrollLeft = -minColumn * tileSize
			}
		}, [scrollerRef, minColumn, minRow, tileSize])

		// Make the scroll position sticky when zooming
		const tmpScrollerPosition = useRef<{ left: number; top: number }>({ left: 0, top: 0 })
		useEffect(() => {
			if (!scrollerRef) return
			const scrollerRef2 = scrollerRef
			const drawScale2 = effectiveDrawScale ?? 1

			// The maths isn't 100% pixel accurate, but its only a slight shift so is acceptable

			if (tmpScrollerPosition.current) {
				scrollerRef2.scrollLeft = tmpScrollerPosition.current.left * drawScale2
				scrollerRef2.scrollTop = tmpScrollerPosition.current.top * drawScale2
			}

			return () => {
				tmpScrollerPosition.current = {
					left: scrollerRef2.scrollLeft / drawScale2,
					top: scrollerRef2.scrollTop / drawScale2,
				}
			}
		}, [effectiveDrawScale, scrollerRef])

		const setRef = useCallback(
			(ref: HTMLDivElement) => {
				setSizeElement(ref)
				setScrollRef(ref)

				setScrollerRef(ref)
			},
			[setSizeElement, setScrollRef]
		)

		// Reset the position when the element changes
		// eslint-disable-next-line react-hooks/exhaustive-deps
		useEffect(() => resetScrollPosition(), [scrollerRef])

		// Expose reload to the parent
		useImperativeHandle(
			ref,
			() => ({
				resetPosition() {
					resetScrollPosition()
				},
			}),
			[resetScrollPosition]
		)

		const visibleColumns = windowSize.width / tileSize
		const visibleRows = windowSize.height / tileSize

		// Calculate the extents of what is visible
		const scrollColumn = scrollX / tileSize
		const scrollRow = scrollY / tileSize
		const visibleMinX = minColumn + scrollColumn
		const visibleMaxX = visibleMinX + visibleColumns
		const visibleMinY = minRow + scrollRow
		const visibleMaxY = visibleMinY + visibleRows

		// Calculate the bounds of what to draw in the DOM
		// Include some spill to make scrolling smoother, but not too much to avoid being a performance drain
		const drawMinColumn = Math.max(Math.floor(visibleMinX - visibleColumns / 2), minColumn)
		const drawMaxColumn = Math.min(Math.ceil(visibleMaxX + visibleColumns / 2), maxColumn)
		const drawMinRow = Math.max(Math.floor(visibleMinY - visibleRows / 2), minRow)
		const drawMaxRow = Math.min(Math.ceil(visibleMaxY + visibleRows / 2), maxRow)

		const visibleButtons: React.JSX.Element[] = []
		for (let row = drawMinRow; row <= drawMaxRow; row++) {
			for (let column = drawMinColumn; column <= drawMaxColumn; column++) {
				visibleButtons.push(
					<ButtonIconFactory
						key={`${column}_${row}`}
						fixedSize={true}
						row={row}
						column={column}
						pageNumber={pageNumber}
						onClick={buttonClick}
						onContextMenu={onButtonContextMenu}
						selected={
							selectedButton?.pageNumber === pageNumber &&
							selectedButton?.column === column &&
							selectedButton?.row === row
						}
						copySource={
							copySourceButton?.pageNumber === pageNumber &&
							copySourceButton?.column === column &&
							copySourceButton?.row === row
						}
						contextMenuOpen={
							contextMenuButton?.pageNumber === pageNumber &&
							contextMenuButton?.column === column &&
							contextMenuButton?.row === row
						}
						left={(column - minColumn) * tileSize}
						top={(row - minRow) * tileSize}
					/>
				)
			}
		}

		const canvasWidth = countColumns * tileSize
		const canvasHeight = countRows * tileSize

		const gridCanvasStyle = useMemo(
			() => ({
				width: canvasWidth,
				height: canvasHeight,
				'--tile-inner-size': tileInnerSize,
				'--grid-scale': effectiveDrawScale,
			}),
			[canvasWidth, canvasHeight, tileInnerSize, effectiveDrawScale]
		)
		const gridWrapperStyle = useMemo(
			() => ({
				maxHeight: maxHeightToMatchCanvas ? countRows * tileSize + 2 * SCROLLBAR_PADDING : 'none', // Pad for possible scrollbar
			}),
			[maxHeightToMatchCanvas, countRows, tileSize]
		)

		return (
			<div
				ref={setRef}
				className={classNames('button-infinite-grid', {
					'button-armed': isHot,
				})}
				style={gridWrapperStyle}
			>
				<div className="button-grid-canvas" style={gridCanvasStyle}>
					{visibleButtons}
				</div>
			</div>
		)
	}
)

export const PrimaryButtonGridIcon = memo(function PrimaryButtonGridIcon({ ...props }: ButtonInfiniteGridButtonProps) {
	const { ref: drop, isDropTarget } = useDroppable({
		id: makeGridButtonDroppableId(props.pageNumber, props.column, props.row),
		accept: 'preset',
	})

	// A preset is being dragged somewhere within the provider - highlight all valid targets
	const { source } = useDragOperation()
	const canDrop = source?.type === 'preset'

	return <ButtonGridIcon {...props} dropRef={drop} dropHover={isDropTarget} canDrop={canDrop} />
})

type ButtonGridIconProps = ButtonGridIconBaseProps

export const ButtonGridIcon = memo(function ButtonGridIcon({ ...props }: ButtonGridIconProps) {
	const { image, isUsed } = useButtonImageForLocation({
		pageNumber: Number(props.pageNumber),
		column: props.column,
		row: props.row,
	})

	return <ButtonGridIconBase {...props} image={isUsed ? image : null} />
})

interface ButtonGridIconBaseProps {
	pageNumber: number
	column: number
	row: number
	image: string | null
	left: number
	top: number
	style: React.CSSProperties

	dropRef?: React.RefCallback<HTMLDivElement>
	dropHover?: boolean
	canDrop?: boolean
	onContextMenu?: (location: ControlLocation, x: number, y: number) => void
	copySource?: boolean
	contextMenuOpen?: boolean
}

export const ButtonGridIconBase = memo(function ButtonGridIcon({
	pageNumber,
	column,
	row,
	image,
	left,
	top,
	style,
	...props
}: ButtonGridIconBaseProps) {
	const location: ControlLocation = useMemo(() => ({ pageNumber, column, row }), [pageNumber, column, row])

	const title = formatLocation(location)
	return (
		<ButtonPreview
			{...props}
			style={{
				...style,
				left,
				top,
			}}
			location={location}
			title={title}
			placeholder={`${location.row}/${location.column}`}
			preview={image}
		/>
	)
})

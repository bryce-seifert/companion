import { faCheck, faMagnifyingGlass, faPencil, faTableCells } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { observer } from 'mobx-react-lite'
import { forwardRef, useCallback, useContext, useImperativeHandle, useMemo, useState } from 'react'
import { Modal } from '~/Components/Modal.js'
import type { PagesStoreModel } from '~/Stores/PagesStore.js'
import { RootAppStoreContext } from '~/Stores/RootAppStore.js'

export interface PageMatrixModalRef {
	show(): void
}

interface PageMatrixModalProps {
	currentPageNumber: number
	onSelectPage: (pageNumber: number) => void
	onConfigurePage?: (pageNumber: number, pageInfo: PagesStoreModel | undefined) => void
}

type FilterMode = 'all' | 'active' | 'named'

export const PageMatrixModal = observer(
	forwardRef<PageMatrixModalRef, PageMatrixModalProps>(function PageMatrixModal(
		{ currentPageNumber, onSelectPage, onConfigurePage },
		ref
	) {
		const [isOpen, setIsOpen] = useState(false)
		const [searchQuery, setSearchQuery] = useState('')
		const [filterMode, setFilterMode] = useState<FilterMode>('all')

		const { pages } = useContext(RootAppStoreContext)

		useImperativeHandle(
			ref,
			() => ({
				show() {
					setIsOpen(true)
				},
			}),
			[]
		)

		// Calculate page metadata (button count, mini grid representation)
		const pageCardsData = useMemo(() => {
			return pages.data.map((pageModel, index) => {
				const pageNumber = index + 1
				let buttonCount = 0

				// Count occupied cells
				if (pageModel?.controls) {
					for (const rowMap of pageModel.controls.values()) {
						if (rowMap) {
							buttonCount += rowMap.size
						}
					}
				}

				return {
					pageNumber,
					pageModel,
					name: pageModel?.name ?? '',
					buttonCount,
					hasButtons: buttonCount > 0,
					hasName: Boolean(pageModel?.name?.trim()),
				}
			})
		}, [pages.data])

		// Filter cards by search query and filter pill
		const filteredPages = useMemo(() => {
			const query = searchQuery.trim().toLowerCase()

			return pageCardsData.filter((item) => {
				// Filter Mode
				if (filterMode === 'active' && !item.hasButtons) return false
				if (filterMode === 'named' && !item.hasName) return false

				// Search query
				if (query) {
					const matchesNumber = String(item.pageNumber).includes(query)
					const matchesName = item.name.toLowerCase().includes(query)
					return matchesNumber || matchesName
				}

				return true
			})
		}, [pageCardsData, searchQuery, filterMode])

		const activeCount = useMemo(() => pageCardsData.filter((p) => p.hasButtons).length, [pageCardsData])
		const namedCount = useMemo(() => pageCardsData.filter((p) => p.hasName).length, [pageCardsData])

		const handleSelect = useCallback(
			(pageNumber: number) => {
				onSelectPage(pageNumber)
				setIsOpen(false)
			},
			[onSelectPage]
		)

		return (
			<Modal.Root open={isOpen} onOpenChange={setIsOpen}>
				<Modal.Portal>
					<Modal.Backdrop />
					<Modal.Viewport>
						<Modal.Popup size="xl">
							<Modal.Header closeButton>
								<div className="flex items-center gap-2.5">
									<div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
										<FontAwesomeIcon icon={faTableCells} className="text-sm" />
									</div>
									<div>
										<Modal.Title>Page Matrix & Spatial Studio</Modal.Title>
										<p className="text-2xs text-muted m-0">
											Visual overview of all 99 pages in your broadcast configuration
										</p>
									</div>
								</div>
							</Modal.Header>

							<Modal.Body className="p-0 flex flex-col min-h-[60vh] max-h-[75vh]">
								{/* Search Bar & Category Filters */}
								<div className="p-3 border-b border-border bg-surface-subtle flex items-center justify-between gap-3 flex-wrap">
									<div className="relative grow max-w-md">
										<FontAwesomeIcon
											icon={faMagnifyingGlass}
											className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs pointer-events-none"
										/>
										<input
											type="text"
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											placeholder="Search pages by number or name (e.g. 1, Cameras, Audio)..."
											className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-body placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
										/>
									</div>

									<div className="flex items-center gap-1.5">
										<button
											type="button"
											onClick={() => setFilterMode('all')}
											className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
												filterMode === 'all'
													? 'bg-primary text-white shadow-xs'
													: 'bg-surface hover:bg-surface-hover text-muted hover:text-body border border-border'
											}`}
										>
											All ({pageCardsData.length})
										</button>
										<button
											type="button"
											onClick={() => setFilterMode('active')}
											className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
												filterMode === 'active'
													? 'bg-primary text-white shadow-xs'
													: 'bg-surface hover:bg-surface-hover text-muted hover:text-body border border-border'
											}`}
										>
											Active ({activeCount})
										</button>
										<button
											type="button"
											onClick={() => setFilterMode('named')}
											className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
												filterMode === 'named'
													? 'bg-primary text-white shadow-xs'
													: 'bg-surface hover:bg-surface-hover text-muted hover:text-body border border-border'
											}`}
										>
											Named ({namedCount})
										</button>
									</div>
								</div>

								{/* Matrix Grid Cards */}
								<div className="p-4 overflow-y-auto grow grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-surface-muted/30">
									{filteredPages.map((item) => (
										<PageMatrixCard
											key={item.pageNumber}
											pageNumber={item.pageNumber}
											pageModel={item.pageModel}
											name={item.name}
											buttonCount={item.buttonCount}
											isCurrent={item.pageNumber === currentPageNumber}
											onSelect={() => handleSelect(item.pageNumber)}
											onConfigure={() => onConfigurePage?.(item.pageNumber, item.pageModel)}
										/>
									))}

									{filteredPages.length === 0 && (
										<div className="col-span-full py-12 text-center text-muted">
											<FontAwesomeIcon icon={faTableCells} className="text-3xl mb-2 opacity-30" />
											<p className="text-sm font-medium">No pages match your filter</p>
										</div>
									)}
								</div>
							</Modal.Body>

							<Modal.Footer>
								<Modal.Close>Close</Modal.Close>
							</Modal.Footer>
						</Modal.Popup>
					</Modal.Viewport>
				</Modal.Portal>
			</Modal.Root>
		)
	})
)

interface PageMatrixCardProps {
	pageNumber: number
	pageModel: PagesStoreModel | undefined
	name: string
	buttonCount: number
	isCurrent: boolean
	onSelect: () => void
	onConfigure: () => void
}

const PageMatrixCard = observer(function PageMatrixCard({
	pageNumber,
	name,
	buttonCount,
	isCurrent,
	onSelect,
	onConfigure,
}: PageMatrixCardProps) {
	return (
		<div
			onClick={onSelect}
			className={`group relative flex flex-col p-3 rounded-xl border bg-surface transition-all cursor-pointer select-none hover:shadow-md ${
				isCurrent ? 'border-primary ring-2 ring-primary/20 shadow-sm' : 'border-border hover:border-primary/50'
			}`}
		>
			{/* Card Header: Page Number + Name + Badge */}
			<div className="flex items-center justify-between gap-2 mb-2.5">
				<div className="flex items-center gap-1.5 min-w-0">
					<span
						className={`px-1.5 py-0.5 rounded text-3xs font-bold font-mono uppercase ${
							isCurrent ? 'bg-primary text-white' : 'bg-surface-muted text-muted border border-border'
						}`}
					>
						P{pageNumber}
					</span>
					<span className="text-xs font-semibold text-body truncate" title={name || `Page ${pageNumber}`}>
						{name || `Page ${pageNumber}`}
					</span>
				</div>

				{isCurrent ? (
					<span className="px-1.5 py-0.2 rounded-full text-3xs font-semibold bg-primary/15 text-primary shrink-0 flex items-center gap-1">
						<FontAwesomeIcon icon={faCheck} className="text-3xs" />
						Current
					</span>
				) : buttonCount > 0 ? (
					<span className="px-1.5 py-0.2 rounded text-3xs font-medium bg-surface-muted text-muted shrink-0">
						{buttonCount} btn
					</span>
				) : (
					<span className="text-3xs text-muted/60 shrink-0">Empty</span>
				)}
			</div>

			{/* Mini Visual Grid Canvas Representation (4 rows x 8 columns) */}
			<div className="w-full h-20 rounded-lg bg-surface-muted/60 border border-border/60 p-1.5 grid grid-rows-4 grid-cols-8 gap-1 mb-2">
				{Array.from({ length: 32 }).map((_, i) => {
					const isOccupied = i < buttonCount

					return (
						<div
							key={i}
							className={`rounded-xs transition-colors ${
								isOccupied
									? isCurrent
										? 'bg-primary/80 group-hover:bg-primary'
										: 'bg-zinc-400 dark:bg-zinc-500 group-hover:bg-primary/70'
									: 'bg-border/30'
							}`}
						/>
					)
				})}
			</div>

			{/* Card Footer: Quick action buttons on hover */}
			<div className="flex items-center justify-between mt-auto pt-1 text-3xs text-muted">
				<span>Click to open</span>
				<div
					className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
					onClick={(e) => e.stopPropagation()}
				>
					<button
						type="button"
						onClick={onConfigure}
						title="Rename page"
						className="p-1 rounded hover:bg-surface-muted hover:text-body text-muted"
					>
						<FontAwesomeIcon icon={faPencil} />
					</button>
				</div>
			</div>
		</div>
	)
})

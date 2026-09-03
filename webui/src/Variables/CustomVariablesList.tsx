import { faAnglesDown, faAnglesUp, faDollarSign, faLayerGroup, faList } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { observer } from 'mobx-react-lite'
import { useCallback, useContext, useRef, useState } from 'react'
import { isCustomVariableValid } from '@companion-app/shared/CustomVariable.js'
import type { CustomVariableDefinition } from '@companion-app/shared/Model/CustomVariableModel.js'
import { Button } from '~/Components/Button'
import {
	CollectionsNestingTable,
	UNGROUPED_PANEL_ID,
} from '~/Components/CollectionsNestingTable/CollectionsNestingTable'
import type {
	CollectionsNestingTableCollection,
	CollectionsNestingTableItem,
} from '~/Components/CollectionsNestingTable/Types'
import { Form, InputGroup } from '~/Components/Form.js'
import { GenericConfirmModal, type GenericConfirmModalRef } from '~/Components/GenericConfirmModal.js'
import { NonIdealState } from '~/Components/NonIdealState.js'
import { SearchBox } from '~/Components/SearchBox'
import { TextInputFieldSimple } from '~/Components/TextInputField'
import { PanelCollapseHelperProvider, usePanelCollapseHelperContext } from '~/Helpers/CollapseHelper.js'
import { PageHeader } from '~/Layout/PageHeader'
import { trpc, useMutationExt } from '~/Resources/TRPC'
import { useComputed } from '~/Resources/util.js'
import { RootAppStoreContext } from '~/Stores/RootAppStore.js'
import { useCustomVariablesApi } from './CustomVariablesApi'
import { useCustomVariablesCollectionsApi } from './CustomVariablesCollectionsApi'
import { CustomVariableRow } from './CustomVariablesListRow'
import { CustomVariablesTableContextProvider } from './CustomVariablesTableContext'
import { useVariablesValuesForLabel } from './useVariablesValuesForLabel'
import { VariablesNav } from './VariablesNav.js'

export type CustomVariableDefinitionExt = Omit<CustomVariableDefinition, 'collectionId'> & CollectionsNestingTableItem
type CustomVariableCollectionExt = CollectionsNestingTableCollection

export const CustomVariablesListPage = observer(function CustomVariablesList() {
	const { variablesStore: customVariables } = useContext(RootAppStoreContext)

	const customVariableValues = useVariablesValuesForLabel('custom')

	const allVariableNames = useComputed(
		() => [
			...Array.from(customVariables.customVariables.keys()),
			...customVariables.allCustomVariableCollectionIds,
			UNGROUPED_PANEL_ID,
		],
		[customVariables]
	)

	const [filter, setFilter] = useState('')

	let filterRegexp: RegExp | null = null
	if (filter) {
		try {
			filterRegexp = new RegExp(filter, 'i')
		} catch (e) {
			console.error('Failed to compile filter regexp:', e)
		}
	}

	const CustomVariableItemRow = (item: CustomVariableDefinitionExt) => {
		if (filterRegexp && !item.id.match(filterRegexp)) return null

		return <CustomVariableRow info={item} />
	}

	const allCustomVariables: CustomVariableDefinitionExt[] = useComputed(() => {
		const defs: CustomVariableDefinitionExt[] = []
		for (const [name, variable] of customVariables.customVariables.entries()) {
			defs.push({
				...variable,
				id: name,
				collectionId: variable.collectionId ?? null,
			})
		}

		return defs
	}, [])

	const confirmModalRef = useRef<GenericConfirmModalRef>(null)
	const collectionsApi = useCustomVariablesCollectionsApi(confirmModalRef)

	const customVariablesApi = useCustomVariablesApi(confirmModalRef)

	return (
		<div className="page-shell">
			<GenericConfirmModal ref={confirmModalRef} />

			<PanelCollapseHelperProvider storageId="custom_variables" knownPanelIds={allVariableNames}>
				<PageHeader
					icon={faDollarSign}
					title="Custom Variables"
					helpAction="/user-guide/config/variables#custom-variables"
				/>

				<div className="flex flex-col h-full min-h-0 flex-1 overflow-hidden">
					<VariablesNav activeTab="custom" />

					<div className="flex flex-col flex-1 min-h-0 overflow-hidden gap-2">
						{/* Top Header Card: Toolbar & Search */}
						<div className="bg-surface-muted/50 border border-border/70 p-3 rounded-lg flex flex-col gap-2.5 shrink-0">
							<div className="flex items-center justify-between gap-2 flex-wrap">
								<div className="flex items-center gap-2">
									<CreateCollectionButton />
									{(customVariables.customVariables.size > 0 || customVariables.customVariableCollections.size > 0) && (
										<ExpandCollapseButtons />
									)}
								</div>
								<div className="list-toolbar-panel">
									<AddVariablePanel />
								</div>
							</div>

							<SearchBox
								placeholder="Search custom variables..."
								filter={filter}
								setFilter={setFilter}
								className="w-full h-9"
							/>
						</div>

						{/* Custom Variables Table Container */}
						<div className="flex-1 min-h-0 scrollable-content rounded-md border border-border/70 bg-surface">
							<CustomVariablesTableContextProvider
								customVariablesApi={customVariablesApi}
								customVariableValues={customVariableValues}
							>
								<div className="variables-table">
									<CollectionsNestingTable<CustomVariableCollectionExt, CustomVariableDefinitionExt>
										NoContent={CustomVariableListNoContent}
										ItemRow={CustomVariableItemRow}
										showCollapseButtons
										itemName="custom variable"
										dragId="custom-variable"
										collectionsApi={collectionsApi}
										collections={customVariables.rootCustomVariableCollections()}
										items={allCustomVariables}
										selectedItemId={null}
									/>
								</div>
							</CustomVariablesTableContextProvider>
						</div>
					</div>
				</div>
			</PanelCollapseHelperProvider>
		</div>
	)
})

function CustomVariableListNoContent() {
	return <NonIdealState icon={faList} text="No custom variables are defined" />
}

const ExpandCollapseButtons = observer(function ExpandCollapseButtons() {
	const { variablesStore: customVariables } = useContext(RootAppStoreContext)

	const rootCustomVariables = Array.from(customVariables.customVariables.keys()) // TODO - filter
	const rootPanels = [
		...customVariables.rootCustomVariableCollections().map((c) => c.id),
		...rootCustomVariables,
		UNGROUPED_PANEL_ID,
	]

	const panelCollapseHelper = usePanelCollapseHelperContext()

	return (
		<>
			{panelCollapseHelper.canExpandAll(null, rootPanels) && (
				<Button
					color="secondary"
					size="sm"
					onClick={() => panelCollapseHelper.setAllExpanded(null, rootPanels)}
					title="Expand all"
					className="flex items-center gap-1.5"
				>
					<FontAwesomeIcon icon={faAnglesDown} className="text-2xs" /> Expand All
				</Button>
			)}
			{panelCollapseHelper.canCollapseAll(null, rootPanels) && (
				<Button
					color="secondary"
					size="sm"
					onClick={() => panelCollapseHelper.setAllCollapsed(null, rootPanels)}
					title="Collapse all"
					className="flex items-center gap-1.5"
				>
					<FontAwesomeIcon icon={faAnglesUp} className="text-2xs" /> Collapse All
				</Button>
			)}
		</>
	)
})

function AddVariablePanel() {
	const { notifier } = useContext(RootAppStoreContext)
	const panelCollapseHelper = usePanelCollapseHelperContext()

	const [newName, setNewName] = useState('')

	const createMutation = useMutationExt(trpc.customVariables.create.mutationOptions())

	const doCreateNew = useCallback(
		(e: React.FormEvent) => {
			e?.preventDefault()

			if (!isCustomVariableValid(newName)) return
			createMutation
				.mutateAsync({ name: newName, defaultVal: '' })
				.then((res) => {
					console.log('done with', res)
					if (res) {
						notifier.show(`Failed to create variable`, res, 5000)
					}

					// clear value
					setNewName('')

					// Make sure the panel is open and wont be forgotten on first render
					setTimeout(() => panelCollapseHelper.setPanelCollapsed(newName, false), 10)
				})
				.catch((e) => {
					console.error('Failed to create variable')
					notifier.show(`Failed to create variable`, e?.toString?.() ?? e ?? 'Failed', 5000)
				})
		},
		[createMutation, notifier, panelCollapseHelper, newName]
	)

	return (
		<Form onSubmit={doCreateNew}>
			<InputGroup>
				<TextInputFieldSimple
					id={undefined}
					setValue={setNewName}
					value={newName}
					placeholder="variableName"
					immediateValue
				/>
				<Button color="primary" onClick={doCreateNew} disabled={!isCustomVariableValid(newName)}>
					Add
				</Button>
			</InputGroup>
		</Form>
	)
}

function CreateCollectionButton() {
	const createMutation = useMutationExt(trpc.customVariables.collections.add.mutationOptions())

	const doCreateCollection = useCallback(() => {
		createMutation.mutateAsync({ collectionName: 'New Collection' }).catch((e) => {
			console.error('Failed to add collection', e)
		})
	}, [createMutation])

	return (
		<Button color="secondary" size="sm" onClick={doCreateCollection}>
			<FontAwesomeIcon icon={faLayerGroup} className="me-1.5" /> Create Collection
		</Button>
	)
}

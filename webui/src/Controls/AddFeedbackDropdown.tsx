import React, { useCallback, useContext } from 'react'
import { useComputed } from '../util.js'
import Select, { createFilter } from 'react-select'
import { MenuPortalContext } from '../Components/DropdownInputField.js'
import { RootAppStoreContext } from '../Stores/RootAppStore.js'
import { observer } from 'mobx-react-lite'
import { prepare as fuzzyPrepare, single as fuzzySingle } from 'fuzzysort'

const filterOptions: ReturnType<typeof createFilter<AddFeedbackOption>> = (candidate, input) => {
	if (input) {
		return !candidate.data.isRecent && (fuzzySingle(input, candidate.data.fuzzy)?.score ?? 0) >= 0.5
	} else {
		return candidate.data.isRecent
	}
}

const noOptionsMessage = ({ inputValue }: { inputValue: string }) => {
	if (inputValue) {
		return 'No feedbacks found'
	} else {
		return 'No recently used feedbacks'
	}
}

export interface AddFeedbackOption {
	isRecent: boolean
	value: string
	label: string
	fuzzy: ReturnType<typeof fuzzyPrepare>
}
interface AddFeedbackGroup {
	label: string
	options: AddFeedbackOption[]
}
interface AddFeedbackDropdownProps {
	onSelect: (feedbackType: string) => void
	booleanOnly: boolean
	addPlaceholder: string
}
export const AddFeedbackDropdown = observer(function AddFeedbackDropdown({
	onSelect,
	booleanOnly,
	addPlaceholder,
}: AddFeedbackDropdownProps) {
	const { connections, feedbackDefinitions, recentlyAddedFeedbacks } = useContext(RootAppStoreContext)
	const menuPortal = useContext(MenuPortalContext)

	const options = useComputed(() => {
		const options: Array<AddFeedbackOption | AddFeedbackGroup> = []
		for (const [connectionId, instanceFeedbacks] of feedbackDefinitions.connections.entries()) {
			for (const [feedbackId, feedback] of instanceFeedbacks.entries()) {
				if (!booleanOnly || feedback.type === 'boolean') {
					const connectionLabel = connections.getLabel(connectionId) ?? connectionId
					const optionLabel = `${connectionLabel}: ${feedback.label}`
					options.push({
						isRecent: false,
						value: `${connectionId}:${feedbackId}`,
						label: optionLabel,
						fuzzy: fuzzyPrepare(optionLabel),
					})
				}
			}
		}

		const recents: AddFeedbackOption[] = []
		for (const feedbackType of recentlyAddedFeedbacks.recentIds) {
			if (feedbackType) {
				const [connectionId, feedbackId] = feedbackType.split(':', 2)
				const feedbackInfo = feedbackDefinitions.connections.get(connectionId)?.get(feedbackId)
				if (feedbackInfo) {
					const connectionLabel = connections.getLabel(connectionId) ?? connectionId
					const optionLabel = `${connectionLabel}: ${feedbackInfo.label}`
					recents.push({
						isRecent: true,
						value: `${connectionId}:${feedbackId}`,
						label: optionLabel,
						fuzzy: fuzzyPrepare(optionLabel),
					})
				}
			}
		}

		options.push({
			label: 'Recently Used',
			options: recents,
		})

		return options
	}, [feedbackDefinitions, connections, booleanOnly, recentlyAddedFeedbacks.recentIds])

	const innerChange = useCallback(
		(e: AddFeedbackOption | null) => {
			if (e?.value) {
				recentlyAddedFeedbacks.trackId(e.value)

				onSelect(e.value)
			}
		},
		[onSelect, recentlyAddedFeedbacks]
	)

	return (
		<Select
			menuShouldBlockScroll={!!menuPortal} // The dropdown doesn't follow scroll when in a modal
			menuPortalTarget={menuPortal || document.body}
			menuPosition={'fixed'}
			classNamePrefix="select-control"
			menuPlacement="auto"
			isClearable={false}
			isSearchable={true}
			isMulti={false}
			options={options}
			placeholder={addPlaceholder || '+ Add feedback'}
			value={null}
			onChange={innerChange}
			filterOption={filterOptions}
			noOptionsMessage={noOptionsMessage}
		/>
	)
})

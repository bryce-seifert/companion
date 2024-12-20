import { ButtonControlBase } from './Base.js'
import { cloneDeep } from 'lodash-es'
import { FragmentActions } from '../../Fragments/FragmentActions.js'
import { GetStepIds } from '@companion-app/shared/Controls.js'
import { VisitorReferencesCollector } from '../../../Resources/Visitors/ReferencesCollector.js'
import type {
	ControlWithActionSets,
	ControlWithActions,
	ControlWithSteps,
	ControlWithoutEvents,
} from '../../IControlFragments.js'
import { ReferencesVisitors } from '../../../Resources/Visitors/ReferencesVisitors.js'
import type {
	NormalButtonModel,
	NormalButtonOptions,
	NormalButtonSteps,
} from '@companion-app/shared/Model/ButtonModel.js'
import type {
	ActionInstance,
	ActionOwner,
	ActionSetId,
	ActionSetsModel,
	ActionStepOptions,
} from '@companion-app/shared/Model/ActionModel.js'
import type { DrawStyleButtonModel } from '@companion-app/shared/Model/StyleModel.js'
import type { ControlDependencies } from '../../ControlDependencies.js'

/**
 * Class for the stepped button control.
 *
 * @author Håkon Nessjøen <haakon@bitfocus.io>
 * @author Keith Rocheck <keith.rocheck@gmail.com>
 * @author William Viker <william@bitfocus.io>
 * @author Julian Waller <me@julusian.co.uk>
 * @since 3.0.0
 * @copyright 2022 Bitfocus AS
 * @license
 * This program is free software.
 * You should have received a copy of the MIT licence as well as the Bitfocus
 * Individual Contributor License Agreement for Companion along with
 * this program.
 *
 * You can be released from the requirements of the license by purchasing
 * a commercial license. Buying such a license is mandatory as soon as you
 * develop commercial activities involving the Companion software without
 * disclosing the source code of your own applications.
 */
export class ControlButtonNormal
	extends ButtonControlBase<NormalButtonModel, NormalButtonOptions>
	implements ControlWithSteps, ControlWithActions, ControlWithoutEvents, ControlWithActionSets
{
	readonly type = 'button'

	readonly supportsActions = true
	readonly supportsSteps = true
	readonly supportsEvents = false
	readonly supportsActionSets = true

	/**
	 * The defaults options for a step
	 */
	static DefaultStepOptions: ActionStepOptions = {
		runWhileHeld: [], // array of set ids
	}

	/**
	 * The id of the currently selected (next to be executed) step
	 */
	#current_step_id: string = '0'

	/**
	 * Button hold state for each surface
	 */
	#surfaceHoldState = new Map<string, SurfaceHoldState>()

	constructor(deps: ControlDependencies, controlId: string, storage: NormalButtonModel | null, isImport: boolean) {
		super(deps, controlId, `Controls/Button/Normal/${controlId}`)

		this.options = {
			...cloneDeep(ButtonControlBase.DefaultOptions),
			rotaryActions: false,
			stepAutoProgress: true,
		}
		this.steps = {
			0: this.#getNewStepValue(null, null),
		}
		this.#current_step_id = '0'

		if (!storage) {
			// New control

			// Save the change
			this.commitChange()
			this.sendRuntimePropsChange()
		} else {
			if (storage.type !== 'button') throw new Error(`Invalid type given to ControlButtonStep: "${storage.type}"`)

			this.options = Object.assign(this.options, storage.options || {})
			this.feedbacks.baseStyle = Object.assign(this.feedbacks.baseStyle, storage.style || {})
			this.feedbacks.loadStorage(storage.feedbacks || [], isImport, isImport)

			if (storage.steps) {
				this.steps = {}
				for (const [id, stepObj] of Object.entries(storage.steps)) {
					this.steps[id] = this.#getNewStepValue(stepObj.action_sets, stepObj.options)
				}
			}

			this.#current_step_id = GetStepIds(this.steps)[0]

			// Ensure control is stored before setup
			if (isImport) setImmediate(() => this.postProcessImport())
		}
	}

	/**
	 * Abort any running 'while held' timers
	 */
	private abortRunningHoldTimers(surfaceId: string | undefined): void {
		if (surfaceId) {
			const existingState = this.#surfaceHoldState.get(surfaceId)
			if (existingState) {
				// Cancel any pending 'runWhileHeld' timers
				for (const timer of existingState.timers) {
					clearTimeout(timer)
				}
			}
			this.#surfaceHoldState.delete(surfaceId)
		} else {
			for (const holdState of this.#surfaceHoldState.values()) {
				if (holdState) {
					// Cancel any pending 'runWhileHeld' timers
					for (const timer of holdState.timers) {
						clearTimeout(timer)
					}
				}
			}
			this.#surfaceHoldState.clear()
		}
	}

	/**
	 * Add an action to this control
	 */
	actionAdd(stepId: string, setId: ActionSetId, actionItem: ActionInstance, ownerId: ActionOwner | null): boolean {
		const step = this.steps[stepId]
		if (step) {
			return step.actionAdd(setId, actionItem, ownerId)
		} else {
			return false
		}
	}

	/**
	 * Append some actions to this button
	 * @param stepId
	 * @param setId the action_set id to update
	 * @param newActions actions to append
	 */
	actionAppend(stepId: string, setId: ActionSetId, newActions: ActionInstance[], ownerId: ActionOwner | null): boolean {
		const step = this.steps[stepId]
		if (step) {
			return step.actionAppend(setId, newActions, ownerId)
		} else {
			return false
		}
	}

	/**
	 * Duplicate an action on this control
	 */
	actionDuplicate(stepId: string, setId: ActionSetId, id: string): string | null {
		const step = this.steps[stepId]
		if (step) {
			return step.actionDuplicate(setId, id)
		} else {
			return null
		}
	}

	/**
	 * Enable or disable an action
	 */
	actionEnabled(stepId: string, setId: ActionSetId, id: string, enabled: boolean): boolean {
		const step = this.steps[stepId]
		if (step) {
			return step.actionEnabled(setId, id, enabled)
		} else {
			return false
		}
	}

	/**
	 * Set action headline
	 */
	actionHeadline(stepId: string, setId: ActionSetId, id: string, headline: string): boolean {
		const step = this.steps[stepId]
		if (step) {
			return step.actionHeadline(setId, id, headline)
		} else {
			return false
		}
	}

	/**
	 * Learn the options for an action, by asking the instance for the current values
	 */
	async actionLearn(stepId: string, setId: ActionSetId, id: string): Promise<boolean> {
		const step = this.steps[stepId]
		if (step) {
			return step.actionLearn(setId, id)
		} else {
			return false
		}
	}

	/**
	 * Remove an action from this control
	 */
	actionRemove(stepId: string, setId: ActionSetId, id: string): boolean {
		const step = this.steps[stepId]
		if (step) {
			return step.actionRemove(setId, id)
		} else {
			return false
		}
	}

	/**
	 * Reorder an action in the list or move between sets
	 */
	actionMoveTo(
		dragStepId: string,
		dragSetId: ActionSetId,
		dragActionId: string,
		hoverStepId: string,
		hoverSetId: ActionSetId,
		hoverOwnerId: ActionOwner | null,
		hoverIndex: number
	): boolean {
		const oldStep = this.steps[dragStepId]
		if (!oldStep) return false

		const oldItem = oldStep.findParentAndIndex(dragSetId, dragActionId)
		if (!oldItem) return false

		if (
			dragStepId === hoverStepId &&
			dragSetId === hoverSetId &&
			oldItem.parent.ownerId?.parentActionId === hoverOwnerId?.parentActionId &&
			oldItem.parent.ownerId?.childGroup === hoverOwnerId?.childGroup
		) {
			oldItem.parent.moveAction(oldItem.index, hoverIndex)

			this.commitChange(false)

			return true
		} else {
			const newStep = this.steps[hoverStepId]
			if (!newStep) return false

			const newSet = newStep.getActionSet(hoverSetId)
			if (!newSet) return false

			const newParent = hoverOwnerId ? newSet?.findById(hoverOwnerId.parentActionId) : null
			if (hoverOwnerId && !newParent) return false

			// Ensure the new parent is not a child of the action being moved
			if (hoverOwnerId && oldItem.item.findChildById(hoverOwnerId.parentActionId)) return false

			// Check if the new parent can hold the action being moved
			if (newParent && !newParent.canAcceptChild(hoverOwnerId!.childGroup, oldItem.item)) return false

			const poppedAction = oldItem.parent.popAction(oldItem.index)
			if (!poppedAction) return false

			if (newParent) {
				newParent.pushChild(poppedAction, hoverOwnerId!.childGroup, hoverIndex)
			} else {
				newSet.pushAction(poppedAction, hoverIndex)
			}

			this.commitChange(false)

			return true
		}
	}

	/**
	 * Remove an action from this control
	 */
	actionReplace(newProps: Pick<ActionInstance, 'id' | 'action' | 'options'>, skipNotifyModule = false): boolean {
		for (const step of Object.values(this.steps)) {
			if (step.actionReplace(newProps, skipNotifyModule)) return true
		}
		return false
	}

	/**
	 * Replace all the actions in a set
	 */
	actionReplaceAll(stepId: string, setId: ActionSetId, newActions: ActionInstance[]): boolean {
		const step = this.steps[stepId]
		if (step) {
			return step.actionReplaceAll(setId, newActions)
		} else {
			return false
		}
	}

	/**
	 * Set the connection of an action
	 */
	actionSetConnection(stepId: string, setId: ActionSetId, id: string, connectionId: string): boolean {
		const step = this.steps[stepId]
		if (step) {
			return step.actionSetConnection(setId, id, connectionId)
		} else {
			return false
		}
	}

	/**
	 * Set an option of an action
	 */
	actionSetOption(stepId: string, setId: ActionSetId, id: string, key: string, value: any): boolean {
		const step = this.steps[stepId]
		if (step) {
			return step.actionSetOption(setId, id, key, value)
		} else {
			return false
		}
	}

	/**
	 * Add an action set to this control
	 */
	actionSetAdd(stepId: string): boolean {
		const step = this.steps[stepId]
		if (step) {
			step.actionSetAdd()

			return true
		}

		return false
	}

	/**
	 * Remove an action-set from this control
	 */
	actionSetRemove(stepId: string, setId0: ActionSetId): boolean {
		const setId = Number(setId0)

		// Ensure valid
		if (isNaN(setId)) return false

		const step = this.steps[stepId]
		if (!step) return false

		return step.actionSetRemove(setId)
	}

	/**
	 * Rename an action-sets
	 */
	actionSetRename(stepId: string, oldSetId0: ActionSetId, newSetId0: ActionSetId): boolean {
		const step = this.steps[stepId]
		if (step) {
			const newSetId = Number(newSetId0)
			const oldSetId = Number(oldSetId0)

			// Only valid when both are numbers
			if (isNaN(newSetId) || isNaN(oldSetId)) return false

			if (!step.actionSetRename(oldSetId, newSetId)) return false

			this.commitChange(false)

			return true
		}

		return false
	}

	actionSetRunWhileHeld(stepId: string, setId0: ActionSetId, runWhileHeld: boolean): boolean {
		const step = this.steps[stepId]
		if (step) {
			// Ensure it is a number
			const setId = Number(setId0)

			// Only valid when step is a number
			if (isNaN(setId)) return false

			// Ensure set exists
			if (!step.getActionSet(setId)) return false

			const runWhileHeldIndex = step.options.runWhileHeld.indexOf(setId)
			if (runWhileHeld && runWhileHeldIndex === -1) {
				step.options.runWhileHeld.push(setId)
			} else if (!runWhileHeld && runWhileHeldIndex !== -1) {
				step.options.runWhileHeld.splice(runWhileHeldIndex, 1)
			}

			this.commitChange(false)

			return true
		}

		return false
	}

	/**
	 * Prepare this control for deletion
	 */
	destroy(): void {
		this.abortRunningHoldTimers(undefined)

		super.destroy()
	}

	/**
	 * Get the index of the current (next to execute) step
	 * @returns The index of current step
	 */
	getActiveStepIndex(): number {
		const out = GetStepIds(this.steps).indexOf(this.#current_step_id)
		return out !== -1 ? out : 0
	}

	/**
	 * Get the complete style object of a button
	 */
	override getDrawStyle(): DrawStyleButtonModel {
		const style = super.getDrawStyle()
		if (!style) return style

		if (GetStepIds(this.steps).length > 1) {
			style.step_cycle = this.getActiveStepIndex() + 1
		}

		return style
	}

	#getNewStepValue(existingActions: ActionSetsModel | null, existingOptions: ActionStepOptions | null) {
		const action_sets: ActionSetsModel = existingActions || {
			down: [],
			up: [],
			rotate_left: undefined,
			rotate_right: undefined,
		}

		const options = existingOptions || cloneDeep(ControlButtonNormal.DefaultStepOptions)

		action_sets.down = action_sets.down || []
		action_sets.up = action_sets.up || []

		if (this.options.rotaryActions) {
			action_sets.rotate_left = action_sets.rotate_left || []
			action_sets.rotate_right = action_sets.rotate_right || []
		}

		const actions = new FragmentActions(
			this.deps.instance.definitions,
			this.deps.internalModule,
			this.deps.instance.moduleHost,
			this.controlId,
			this.commitChange.bind(this)
		)

		actions.options = options
		actions.loadStorage(action_sets, true, !!existingActions)

		return actions
	}

	/**
	 * Collect the instance ids and labels referenced by this control
	 * @param foundConnectionIds - instance ids being referenced
	 * @param foundConnectionLabels - instance labels being referenced
	 */
	collectReferencedConnections(foundConnectionIds: Set<string>, foundConnectionLabels: Set<string>): void {
		const allFeedbacks = this.feedbacks.getAllFeedbacks()
		const allActions = []

		for (const step of Object.values(this.steps)) {
			allActions.push(...step.getAllActions())
		}

		for (const feedback of allFeedbacks) {
			foundConnectionIds.add(feedback.connectionId)
		}
		for (const action of allActions) {
			foundConnectionIds.add(action.connectionId)
		}

		const visitor = new VisitorReferencesCollector(foundConnectionIds, foundConnectionLabels)

		ReferencesVisitors.visitControlReferences(
			this.deps.internalModule,
			visitor,
			this.feedbacks.baseStyle,
			[],
			[],
			allActions,
			allFeedbacks,
			[]
		)
	}

	/**
	 * Inform the control that it has been moved, and anything relying on its location must be invalidated
	 */
	triggerLocationHasChanged(): void {
		this.feedbacks.resubscribeAllFeedbacks('internal')
	}

	/**
	 * Update an option field of this control
	 */
	optionsSetField(key: string, value: any): boolean {
		// Check if rotary_actions should be added/remove
		if (key === 'rotaryActions') {
			for (const step of Object.values(this.steps)) {
				step.setupRotaryActionSets(!!value, true)
			}
		}

		return super.optionsSetField(key, value)
	}

	/**
	 * Execute a press of this control
	 * @param pressed Whether the control is pressed
	 * @param surfaceId The surface that initiated this press
	 * @param force Trigger actions even if already in the state
	 */
	pressControl(pressed: boolean, surfaceId: string | undefined, force: boolean): void {
		const [this_step_id, next_step_id] = this.#validateCurrentStepId()

		let pressedDuration = 0
		let pressedStep = this_step_id
		let holdState: SurfaceHoldState | undefined = undefined
		if (surfaceId) {
			// Calculate the press duration, or track when the press started
			if (pressed) {
				this.abortRunningHoldTimers(surfaceId)

				holdState = {
					pressed: Date.now(),
					step: this_step_id,
					timers: [],
				}
				this.#surfaceHoldState.set(surfaceId, holdState)
			} else {
				const state = this.#surfaceHoldState.get(surfaceId)
				if (state) {
					pressedDuration = Date.now() - state.pressed
					pressedStep = state.step

					this.abortRunningHoldTimers(surfaceId)
				}
			}
		}

		const changed = this.setPushed(pressed, surfaceId)

		// if the state has changed, the choose the set to execute
		if (changed || force) {
			// progress to the next step, if there is one, and the step hasnt already been changed
			if (
				this_step_id !== null &&
				next_step_id !== null &&
				this.options.stepAutoProgress &&
				!pressed &&
				(pressedStep === undefined || this_step_id === pressedStep)
			) {
				// update what the new step will be
				this.#current_step_id = next_step_id

				this.sendRuntimePropsChange()
			}

			// Make sure to execute for the step that was active when the press started
			const step = pressedStep && this.steps[pressedStep]
			if (step) {
				let action_set_id: ActionSetId = pressed ? 'down' : 'up'

				const location = this.deps.page.getLocationOfControlId(this.controlId)

				if (!pressed && pressedDuration) {
					// find the correct set to execute on up

					const setIds = step
						.getActionSetIds()
						.map((id) => Number(id))
						.filter((id) => !isNaN(id) && id < pressedDuration)
					if (setIds.length) {
						action_set_id = Math.max(...setIds)
					}
				}

				const runActionSet = (set_id: ActionSetId): void => {
					const actions = step.getActionSet(set_id)
					if (actions) {
						this.logger.silly('found actions')

						this.actionRunner.runActions(actions.asActionInstances(), {
							surfaceId,
							location,
						})
					}
				}

				if (pressed && holdState && holdState.timers.length === 0) {
					// queue any 'runWhileHeld' timers
					const times = [...step.options.runWhileHeld].sort()

					for (const time of times) {
						holdState.timers.push(
							setTimeout(() => {
								try {
									runActionSet(time)
								} catch (e) {
									this.logger.warn(`hold actions execution failed: ${e}`)
								}
							}, time)
						)
					}
				}

				// Run the actions if it wasn't already run from being held
				if (typeof action_set_id !== 'number' || !step.options.runWhileHeld.includes(action_set_id)) {
					runActionSet(action_set_id)
				}
			}
		}
	}

	/**
	 * Execute a rotate of this control
	 * @param direction Whether the control was rotated to the right
	 * @param surfaceId The surface that initiated this rotate
	 */
	rotateControl(direction: boolean, surfaceId: string | undefined): void {
		const [this_step_id] = this.#validateCurrentStepId()

		const step = this_step_id && this.steps[this_step_id]
		if (step) {
			const action_set_id = direction ? 'rotate_right' : 'rotate_left'

			const actions = step.getActionSet(action_set_id)
			if (actions) {
				this.logger.silly('found actions')

				const location = this.deps.page.getLocationOfControlId(this.controlId)

				this.actionRunner.runActions(actions.asActionInstances(), {
					surfaceId,
					location,
				})
			}
		}
	}

	/**
	 * Add a step to this control
	 * @returns Id of new step
	 */
	stepAdd(): string {
		const existingKeys = GetStepIds(this.steps)
			.map((k) => Number(k))
			.filter((k) => !isNaN(k))
		if (existingKeys.length === 0) {
			// add the default '0' set
			this.steps['0'] = this.#getNewStepValue(null, null)

			this.commitChange(true)

			return '0'
		} else {
			// add one after the last
			const max = Math.max(...existingKeys)

			const stepId = `${max + 1}`
			this.steps[stepId] = this.#getNewStepValue(null, null)

			this.commitChange(true)

			return stepId
		}
	}

	/**
	 * Progress through the action-sets
	 * @param amount Number of steps to progress
	 */
	stepAdvanceDelta(amount: number): boolean {
		if (amount && typeof amount === 'number') {
			const all_steps = GetStepIds(this.steps)
			if (all_steps.length > 0) {
				const current = all_steps.indexOf(this.#current_step_id)

				let newIndex = (current === -1 ? 0 : current) + amount
				while (newIndex < 0) newIndex += all_steps.length
				newIndex = newIndex % all_steps.length

				const newStepId = all_steps[newIndex]
				return this.stepSelectCurrent(newStepId)
			}
		}

		return false
	}

	/**
	 * Duplicate a step on this control
	 * @param stepId the id of the step to duplicate
	 */
	stepDuplicate(stepId: string): boolean {
		const existingKeys = GetStepIds(this.steps)
			.map((k) => Number(k))
			.filter((k) => !isNaN(k))

		const stepToCopy = this.steps[stepId]
		if (!stepToCopy) return false

		const newStep = this.#getNewStepValue(cloneDeep(stepToCopy.asActionStepModel()), cloneDeep(stepToCopy.options))

		// add one after the last
		const max = Math.max(...existingKeys)

		const newStepId = `${max + 1}`
		this.steps[newStepId] = newStep

		// Treat it as an import, to make any ids unique
		newStep.postProcessImport().catch((e) => {
			this.logger.silly(`stepDuplicate failed postProcessImport for ${this.controlId} failed: ${e.message}`)
		})

		// Ensure the ui knows which step is current
		this.sendRuntimePropsChange()

		// Save the change, and perform a draw
		this.commitChange(true)

		return true
	}

	/**
	 * Set the current (next to execute) action-set by index
	 * @param index The step index to make the next
	 */
	stepMakeCurrent(index: number): boolean {
		if (typeof index === 'number') {
			const stepId = GetStepIds(this.steps)[index - 1]
			if (stepId !== undefined) {
				return this.stepSelectCurrent(stepId)
			}
		}

		return false
	}

	/**
	 * Remove an action-set from this control
	 * @param stepId the id of the action-set
	 */
	stepRemove(stepId: string): boolean {
		const oldKeys = GetStepIds(this.steps)

		if (oldKeys.length > 1) {
			if (this.steps[stepId]) {
				this.steps[stepId].destroy()
				delete this.steps[stepId]

				// Update the current step
				const oldIndex = oldKeys.indexOf(stepId)
				let newIndex = oldIndex + 1
				if (newIndex >= oldKeys.length) {
					newIndex = 0
				}
				if (newIndex !== oldIndex) {
					this.#current_step_id = oldKeys[newIndex]

					this.sendRuntimePropsChange()
				}

				// Save the change, and perform a draw
				this.commitChange(true)

				return true
			}
		}

		return false
	}

	/**
	 * Set the current (next to execute) action-set by id
	 * @param stepId The step id to make the next
	 */
	stepSelectCurrent(stepId: string): boolean {
		if (this.steps[stepId]) {
			// Ensure it isn't currently pressed
			// this.setPushed(false)

			this.#current_step_id = stepId

			this.sendRuntimePropsChange()

			this.triggerRedraw()

			return true
		}

		return false
	}

	/**
	 * Swap two action-sets
	 * @param stepId1 One of the action-sets
	 * @param stepId2 The other action-set
	 */
	stepSwap(stepId1: string, stepId2: string): boolean {
		if (this.steps[stepId1] && this.steps[stepId2]) {
			const tmp = this.steps[stepId1]
			this.steps[stepId1] = this.steps[stepId2]
			this.steps[stepId2] = tmp

			this.commitChange(false)

			return true
		}

		return false
	}

	/**
	 * Rename step
	 * @param stepId the id of the action-set
	 * @param newName the new name of the step
	 */
	stepRename(stepId: string, newName: string | undefined): boolean {
		if (this.steps[stepId]) {
			if (newName !== undefined) {
				this.steps[stepId].rename(newName)
			}
			this.commitChange(true)
			return true
		}

		return false
	}

	/**
	 * Convert this control to JSON
	 * To be sent to the client and written to the db
	 * @param clone - Whether to return a cloned object
	 */
	override toJSON(clone = true): NormalButtonModel {
		const stepsJson: NormalButtonSteps = {}
		for (const [id, step] of Object.entries(this.steps)) {
			stepsJson[id] = {
				action_sets: step.asActionStepModel(),
				options: step.options,
			}
		}

		const obj: NormalButtonModel = {
			type: this.type,
			style: this.feedbacks.baseStyle,
			options: this.options,
			feedbacks: this.feedbacks.getAllFeedbackInstances(),
			steps: stepsJson,
		}

		return clone ? cloneDeep(obj) : obj
	}

	/**
	 * Get any volatile properties for the control
	 */
	override toRuntimeJSON() {
		return {
			current_step_id: this.#current_step_id,
		}
	}

	#validateCurrentStepId(): [null, null] | [string, string] {
		const this_step_raw = this.#current_step_id
		const stepIds = GetStepIds(this.steps)
		if (stepIds.length > 0) {
			// verify 'this_step_raw' is valid
			const this_step_index = stepIds.findIndex((s) => s == this_step_raw) || 0
			const this_step_id = stepIds[this_step_index]

			// figure out the new step
			const next_index = this_step_index + 1 >= stepIds.length ? 0 : this_step_index + 1
			const next_step_id = stepIds[next_index]

			return [this_step_id, next_step_id]
		} else {
			return [null, null]
		}
	}
}

interface SurfaceHoldState {
	pressed: number
	step: string | null
	timers: NodeJS.Timeout[]
}

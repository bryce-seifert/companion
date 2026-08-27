import { useCallback, useId, useRef } from 'react'
import type { JsonValue } from 'type-fest'
import { EntityModelType, FeedbackEntitySubType } from '@companion-app/shared/Model/EntityModel.js'
import type { TriggerModel, TriggerOptions } from '@companion-app/shared/Model/TriggerModel.js'
import { StaticAlert } from '~/Components/Alert.js'
import { Form } from '~/Components/Form.js'
import { GenericConfirmModal, type GenericConfirmModalRef } from '~/Components/GenericConfirmModal.js'
import { TabArea } from '~/Components/TabArea.js'
import { TextInputFieldSimple } from '~/Components/TextInputField.js'
import { ControlNotesEditor } from '~/Controls/ControlNotesEditor.js'
import { ControlEntitiesEditor } from '~/Controls/EntitiesEditor.js'
import { LocalVariablesEditor } from '~/Controls/LocalVariablesEditor.js'
import { useControlConfig } from '~/Hooks/useControlConfig.js'
import { useLocalStorage } from '~/Hooks/useLocalStorage.js'
import { MyErrorBoundary } from '~/Resources/Error.js'
import { LoadingRetryOrError } from '~/Resources/Loading.js'
import { trpc, useMutationExt } from '~/Resources/TRPC.js'
import { PreventDefaultHandler } from '~/Resources/util.js'
import { useLocalVariablesStore } from '../Controls/LocalVariablesStore.js'
import { TriggerEventEditor } from './EventEditor.js'

interface EditTriggerPanelProps {
	controlId: string
}

export function EditTriggerPanel({ controlId }: EditTriggerPanelProps): React.JSX.Element {
	const resetModalRef = useRef<GenericConfirmModalRef>(null)

	const { controlConfig, error: configError, reloadConfig } = useControlConfig(controlId)

	const errors: string[] = []
	if (configError) errors.push(configError)
	const loadError = errors.length > 0 ? errors.join(', ') : null
	const dataReady = !loadError && !!controlConfig

	return (
		<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
			<GenericConfirmModal ref={resetModalRef} />

			<LoadingRetryOrError dataReady={dataReady} error={loadError} doRetry={reloadConfig} design="pulse" />
			{controlConfig ? (
				<div className="flex-1 min-h-0 flex flex-col overflow-hidden" style={{ display: dataReady ? '' : 'none' }}>
					{controlConfig.config.type === 'trigger' ? (
						<TriggerPanelContent config={controlConfig.config} controlId={controlId} />
					) : (
						<StaticAlert color="danger">
							Invalid control type: {controlConfig.config.type}. Expected 'trigger'.
						</StaticAlert>
					)}
				</div>
			) : (
				''
			)}
		</div>
	)
}

interface TriggerPanelContentProps {
	config: TriggerModel
	controlId: string
}

function TriggerPanelContent({ config, controlId }: TriggerPanelContentProps): React.ReactNode {
	const localVariablesStore = useLocalVariablesStore(controlId, config.localVariables)
	const [activeTab, setActiveTab] = useLocalStorage('triggerEditor.activeTab', 'events')

	return (
		<div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
			<MyErrorBoundary>
				<TriggerConfig options={config.options} controlId={controlId} />
			</MyErrorBoundary>

			<div className="sticky top-0 bg-surface z-10 border-b border-border py-1 -mx-2.5 px-2.5">
				<TabArea.Root value={activeTab} onValueChange={setActiveTab}>
					<TabArea.List>
						<TabArea.Tab value="events">Events ({config.events.length})</TabArea.Tab>
						<TabArea.Tab value="conditions">Conditions ({config.condition.length})</TabArea.Tab>
						<TabArea.Tab value="actions">Actions ({config.actions.length})</TabArea.Tab>
						<TabArea.Tab value="variables">Local Variables ({config.localVariables.length})</TabArea.Tab>
						<TabArea.Indicator />
					</TabArea.List>
				</TabArea.Root>
			</div>

			{activeTab === 'events' && (
				<MyErrorBoundary>
					<TriggerEventEditor
						heading=""
						controlId={controlId}
						events={config.events}
						localVariablesStore={localVariablesStore}
					/>
				</MyErrorBoundary>
			)}

			{activeTab === 'conditions' && (
				<MyErrorBoundary>
					<ControlEntitiesEditor
						heading=""
						controlId={controlId}
						entities={config.condition}
						listId="feedbacks"
						entityType={EntityModelType.Feedback}
						entityTypeLabel="condition"
						feedbackListType={FeedbackEntitySubType.Boolean}
						location={undefined}
						localVariablesStore={localVariablesStore}
						localVariablePrefix={null}
					/>
				</MyErrorBoundary>
			)}

			{activeTab === 'actions' && (
				<MyErrorBoundary>
					<ControlEntitiesEditor
						heading=""
						controlId={controlId}
						location={undefined}
						listId="trigger_actions"
						entities={config.actions}
						entityType={EntityModelType.Action}
						entityTypeLabel="action"
						feedbackListType={null}
						localVariablesStore={localVariablesStore}
						localVariablePrefix={null}
					/>
				</MyErrorBoundary>
			)}

			{activeTab === 'variables' && (
				<MyErrorBoundary>
					<LocalVariablesEditor
						className="mt-1"
						controlId={controlId}
						location={undefined}
						variables={config.localVariables}
						localVariablesStore={localVariablesStore}
					/>
				</MyErrorBoundary>
			)}
		</div>
	)
}

interface TriggerConfigProps {
	controlId: string
	options: TriggerOptions
}

function TriggerConfig({ controlId, options }: TriggerConfigProps) {
	const setOptionsFieldMutation = useMutationExt(trpc.controls.setOptionsField.mutationOptions())

	const setValueInner = useCallback(
		(key: string, value: JsonValue) => {
			setOptionsFieldMutation
				.mutateAsync({
					controlId,
					key,
					value,
				})
				.catch((e) => {
					console.error(`Set field failed: ${e}`)
				})
		},
		[setOptionsFieldMutation, controlId]
	)

	const setName = useCallback((val: string) => setValueInner('name', val), [setValueInner])

	const nameFieldId = useId()

	return (
		<Form onSubmit={PreventDefaultHandler} className="space-y-1.5">
			<TextInputFieldSimple
				id={nameFieldId}
				setValue={setName}
				value={options.name}
				placeholder="Trigger Name..."
				className="h-9 font-medium text-sm"
			/>
			<ControlNotesEditor controlId={controlId} notes={options.notes} multiline={true} />
		</Form>
	)
}

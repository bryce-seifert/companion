import { faCog } from '@fortawesome/free-solid-svg-icons'
import { observer } from 'mobx-react-lite'
import { memo } from 'react'
import { Table } from '~/Components/Table.js'
import { PageHeader } from '~/Layout/PageHeader.js'
import { useUserConfigProps } from './Context.js'
import { CompanionConfig } from './Sections/CompanionConfig.js'
import { DataCollectionConfig } from './Sections/DataCollection.js'
import { SettingsNav } from './SettingsNav.js'

export const SettingsGeneralPage = memo(function UserConfig() {
	return (
		<div className="page-shell">
			<PageHeader icon={faCog} title="Settings" helpAction="/user-guide/config/settings#general" />

			<div className="flex flex-col h-full min-h-0 flex-1 overflow-hidden">
				<SettingsNav activeTab="general" />

				<div className="flex-1 min-h-0 overflow-y-auto">
					<div className="primary-panel">
						<div className="bg-surface-muted/30 border border-border/70 rounded-lg p-3.5 mb-3">
							<h4 className="text-base font-bold text-body mb-1">General Settings</h4>
							<p className="text-xs text-muted mb-0">
								All setting modifications apply instantaneously across Companion.
							</p>
						</div>
						<UserConfigTable />
					</div>
				</div>
			</div>
		</div>
	)
})

const UserConfigTable = observer(function UserConfigTable() {
	const userConfigProps = useUserConfigProps()
	if (!userConfigProps) return null

	return (
		<div className="w-full rounded-lg border border-border/70 bg-surface overflow-hidden p-4 space-y-4">
			<Table className="table-settings mb-0">
				<tbody>
					<CompanionConfig {...userConfigProps} />
				</tbody>
			</Table>
			<Table className="table-settings mb-0">
				<tbody>
					<DataCollectionConfig {...userConfigProps} />
				</tbody>
			</Table>
		</div>
	)
})

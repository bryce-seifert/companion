import { faCog } from '@fortawesome/free-solid-svg-icons'
import { observer } from 'mobx-react-lite'
import { memo } from 'react'
import { Table } from '~/Components/Table.js'
import { PageHeader } from '~/Layout/PageHeader.js'
import { PageIntro } from '~/Layout/PageIntro'
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
						<PageIntro title="General Settings">Settings take effect automatically as you change them.</PageIntro>
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
		<div className="w-full space-y-4">
			<div className="rounded-xl border border-border/70 bg-surface shadow-xs overflow-hidden">
				<Table className="table-settings mb-0">
					<tbody>
						<CompanionConfig {...userConfigProps} />
					</tbody>
				</Table>
			</div>
			<div className="rounded-xl border border-border/70 bg-surface shadow-xs overflow-hidden">
				<Table className="table-settings mb-0">
					<tbody>
						<DataCollectionConfig {...userConfigProps} />
					</tbody>
				</Table>
			</div>
		</div>
	)
})

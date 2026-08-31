import { faCog } from '@fortawesome/free-solid-svg-icons'
import { observer } from 'mobx-react-lite'
import { memo } from 'react'
import { Table } from '~/Components/Table.js'
import { PageHeader } from '~/Layout/PageHeader.js'
import { PageIntro } from '~/Layout/PageIntro'
import { useUserConfigProps } from './Context.js'
import { ButtonsConfig } from './Sections/ButtonsConfig.js'
import { GridConfigRows } from './Sections/GridConfig.js'
import { SettingsNav } from './SettingsNav.js'

export const SettingsButtonsPage = memo(function UserConfig() {
	return (
		<div className="page-shell">
			<PageHeader icon={faCog} title="Settings" helpAction="/user-guide/config/settings#buttons" />

			<div className="flex flex-col h-full min-h-0 flex-1 overflow-hidden">
				<SettingsNav activeTab="buttons" />

				<div className="flex-1 min-h-0 overflow-y-auto">
					<div className="primary-panel">
						<PageIntro title="Button Settings">
							Configure button behavior, default press actions, grid dimensions, and surface controls.
						</PageIntro>
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
					<ButtonsConfig {...userConfigProps} />
					<GridConfigRows {...userConfigProps} />
				</tbody>
			</Table>
		</div>
	)
})

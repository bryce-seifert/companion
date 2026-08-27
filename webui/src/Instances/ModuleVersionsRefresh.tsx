import { faSync } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { observer } from 'mobx-react-lite'
import { useCallback, useContext } from 'react'
import type { ModuleInstanceType } from '@companion-app/shared/Model/Instance.js'
import { trpc, useMutationExt } from '~/Resources/TRPC'
import { RootAppStoreContext } from '~/Stores/RootAppStore.js'

interface ModuleVersionsRefreshProps {
	moduleType: ModuleInstanceType
	moduleId: string | null
}
export const ModuleVersionsRefresh = observer(function ModuleVersionsRefresh({
	moduleType,
	moduleId,
}: ModuleVersionsRefreshProps) {
	const { moduleStoreRefreshProgress } = useContext(RootAppStoreContext)

	const refreshProgress = (moduleId ? moduleStoreRefreshProgress.get(moduleId) : null) ?? 1

	const refreshInfoMutation = useMutationExt(trpc.instances.modulesStore.refreshModuleInfo.mutationOptions())
	const doRefreshModules = useCallback(() => {
		if (!moduleId) return
		refreshInfoMutation.mutateAsync({ moduleType, moduleId }).catch((err) => {
			console.error('Failed to refresh module versions', err)
		})
	}, [refreshInfoMutation, moduleType, moduleId])

	if (refreshProgress === 1) {
		return (
			<button
				type="button"
				onClick={doRefreshModules}
				className="w-6 h-6 inline-flex items-center justify-center rounded-lg text-muted hover:text-body hover:bg-surface-muted transition-colors cursor-pointer border-0 bg-transparent"
				title="Refresh module info & versions"
				aria-label="Refresh module info & versions"
			>
				<FontAwesomeIcon icon={faSync} className="text-xs" />
			</button>
		)
	} else {
		return (
			<button
				type="button"
				disabled
				className="w-6 h-6 inline-flex items-center justify-center rounded-lg text-muted transition-colors border-0 bg-transparent"
				title={`Refreshing module info ${Math.round(refreshProgress * 100)}%`}
				aria-label={`Refreshing module info ${Math.round(refreshProgress * 100)}%`}
			>
				<FontAwesomeIcon icon={faSync} spin={true} className="text-xs" />
			</button>
		)
	}
})

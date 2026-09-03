import { faRotateRight, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { PuffLoader } from 'react-spinners'
import { Button } from '~/Components/Button.js'
import { PRIMARY_COLOR } from '~/Resources/Constants.js'

export interface ConnectionLostOverlayProps {
	visible: boolean
}

export function ConnectionLostOverlay({ visible }: ConnectionLostOverlayProps): React.JSX.Element | null {
	if (!visible) return null

	const handleReload = () => {
		window.location.reload()
	}

	return (
		<div
			className="fixed inset-0 z-[15000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="connection-lost-title"
		>
			<div className="bg-surface text-body border border-border/80 rounded-2xl shadow-2xl p-6 sm:p-8 max-w-lg w-full text-center flex flex-col items-center">
				<div className="w-14 h-14 rounded-full bg-danger/10 text-danger flex items-center justify-center text-2xl mb-4 border border-danger/20 shadow-inner">
					<FontAwesomeIcon icon={faTriangleExclamation} />
				</div>

				<h3 id="connection-lost-title" className="text-xl font-bold text-body mb-2">
					Connection Lost
				</h3>

				<p className="text-sm text-muted mb-5 leading-relaxed">
					We have lost connection to the Companion server. We will continue trying to reconnect in the background.
				</p>

				<div className="w-full bg-surface-muted/60 border border-border/70 rounded-xl p-4 mb-5 text-start text-xs space-y-2 text-body">
					<div className="font-semibold text-muted text-2xs uppercase tracking-wider mb-2">Troubleshooting Steps</div>
					<div className="flex items-start gap-2">
						<span className="text-danger font-bold leading-tight">•</span>
						<span>Check that the Companion application is still running on the host machine.</span>
					</div>
					<div className="flex items-start gap-2">
						<span className="text-danger font-bold leading-tight">•</span>
						<span>If accessing over a local network, check your Wi-Fi or Ethernet connection.</span>
					</div>
					<div className="flex items-start gap-2">
						<span className="text-danger font-bold leading-tight">•</span>
						<span>Verify firewall and port settings if accessing Companion remotely.</span>
					</div>
				</div>

				<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border/70 text-xs text-muted mb-5 font-medium shadow-xs">
					<span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
					<span>Reconnecting automatically…</span>
				</div>

				<div className="flex items-center justify-center gap-3 w-full">
					<Button color="primary" onClick={handleReload} className="w-full">
						<FontAwesomeIcon icon={faRotateRight} className="me-2" />
						Reload Page
					</Button>
				</div>
			</div>
		</div>
	)
}

export interface ConfigImportingOverlayProps {
	visible: boolean
}

export function ConfigImportingOverlay({ visible }: ConfigImportingOverlayProps): React.JSX.Element | null {
	if (!visible) return null

	return (
		<div
			className="fixed inset-0 z-[15000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="config-importing-title"
		>
			<div className="bg-surface text-body border border-border/80 rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center flex flex-col items-center">
				<div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 border border-primary/20 shadow-inner">
					<PuffLoader loading={true} size={40} color={PRIMARY_COLOR} />
				</div>

				<h3 id="config-importing-title" className="text-xl font-bold text-body mb-2">
					Applying Configuration
				</h3>

				<p className="text-sm text-muted mb-5 leading-relaxed">
					Please stand by while the configuration is being updated. The application will refresh automatically when
					complete.
				</p>

				<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border/70 text-xs text-muted font-medium shadow-xs">
					<span className="w-2 h-2 rounded-full bg-info animate-pulse" />
					<span>Updating system…</span>
				</div>
			</div>
		</div>
	)
}

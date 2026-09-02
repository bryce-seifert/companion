import { faQuestionCircle, faTimes } from '@fortawesome/free-solid-svg-icons'
import './PanelIcons.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'
import { useCallback, useRef } from 'react'
import { Button, LinkButtonExternal } from '~/Components/Button'
import { InlineHelpCustom } from '~/Components/InlineHelp'
import { makeAbsolutePath } from '~/Resources/util'

interface CloseButtonProps {
	closeFn: () => void
	visibilityClass?: string
	className?: string
}

export interface ContextHelpButtonProps {
	children?: React.ReactNode
	action?: `/user-guide/${string}` | (() => void)
	className?: string
}

/*
 CloseButton - meant for panels that can be stacked, as in Connections and Surfaces
*/
export function CloseButton({ closeFn, visibilityClass, className }: CloseButtonProps): React.JSX.Element {
	return (
		<button
			type="button"
			className={classNames('panel-icon-button panel-close-button', visibilityClass, className)}
			onClick={closeFn}
			title="Close panel"
			aria-label="Close panel"
		>
			<FontAwesomeIcon icon={faTimes} className="text-sm" />
		</button>
	)
}

/*
 ContextHelpButton - a generic inline-help icon, 
 particularly handy for panels and other headers such as in Connections and Surfaces.
 - children: what to show on hover or focus. Can be plain-text or a React fragment.
 - action: optional, either a link to the user guide or a custom function (to open a modal dialog, for example).
*/
export function ContextHelpButton({ children, action, className }: ContextHelpButtonProps): React.JSX.Element {
	// First, a little trick to handle both keyboard navigation, in which the "hover help" should show up on focus,
	// and "click" (including "enter"), which will open a new tab and should close the hover-help.
	// Without removeFocus() the help icon will retain focus, and hover-help will still show when the user returns to this tab.
	// afterElementRef is a little trick to preserve tab focus order, so the next tab will go to the element after this one in the tab-order.
	const afterElementRef = useRef<HTMLDivElement>(null)
	const removeFocus = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
		event.currentTarget.blur()
		afterElementRef.current?.focus({ preventScroll: true })
	}, [])

	const onClickAction = useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			if (typeof action === 'function') action()

			removeFocus(event)
		},
		[removeFocus, action]
	)

	if (children && typeof children === 'string' && action && !/click/i.test(children)) {
		children += ' Click the icon for further help.'
	}

	// note some styling here needs to be on the FontAwesomeIcon, not .context-help-button or the Button,
	//  in order to get the shadowing right. However it will have to be hand-coded for different sizes even if using em units
	//  See _layout.scss for the context-help-button-2xl example (FontAwesomeIcons get class 'fa-<size>')
	// NOTE: removed the float_right class here -- we end up fighting against its margin and it doesn't seem to do much else...
	return (
		<>
			<HelpWrapper usePopover={!!children} help={children} className={className}>
				{typeof action === 'string' ? (
					// note: string is currently typed to link to /user-guide/, which is not a Tanstack route
					<LinkButtonExternal
						variant="ghost"
						className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-full text-muted hover:text-primary hover:bg-primary/10 transition-all hover:scale-105 align-middle p-0 shrink-0"
						href={makeAbsolutePath(action)}
						target="_blank"
						rel="noopener noreferrer"
						// onClick={removeFocus}
						title="Open help documentation in a new tab"
						aria-label="Open help documentation in a new tab"
					>
						<FontAwesomeIcon icon={faQuestionCircle} className="text-xs" aria-label="context help" />
					</LinkButtonExternal>
				) : (
					<Button
						variant="ghost"
						className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-full text-muted hover:text-primary hover:bg-primary/10 transition-all hover:scale-105 align-middle p-0 shrink-0"
						onClick={onClickAction}
					>
						<FontAwesomeIcon icon={faQuestionCircle} className="text-xs" aria-label="context help" />
					</Button>
				)}
			</HelpWrapper>
			<span ref={afterElementRef} tabIndex={-1} style={{ outline: 'none' }} aria-hidden="true" />
		</>
	)
}

interface HelpWrapperProps extends React.ComponentProps<typeof InlineHelpCustom> {
	usePopover: boolean
	children: React.ReactNode
}
function HelpWrapper({ usePopover, children, className, ...props }: HelpWrapperProps) {
	return usePopover ? (
		<InlineHelpCustom
			{...props}
			className={classNames('context-help-button inline-flex items-center self-center', className)}
		>
			{children}
		</InlineHelpCustom>
	) : (
		<span className={classNames('context-help-button inline-flex items-center self-center', className)}>
			{children}
		</span>
	)
}

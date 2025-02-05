import { DropdownChoice, DropdownChoiceId } from '@companion-module/base'
import { CFormLabel } from '@coreui/react'
import classNames from 'classnames'
import React, { createContext, useContext, useMemo, useEffect, useCallback, memo, useState } from 'react'
import Select, { createFilter, InputActionMeta } from 'react-select'
import CreatableSelect, { CreatableProps } from 'react-select/creatable'
import { InlineHelp } from './InlineHelp.js'
import { WindowedMenuList } from 'react-windowed-select'

export const MenuPortalContext = createContext<HTMLElement | null>(null)

interface DropdownInputFieldProps {
	htmlName?: string
	className?: string
	label?: React.ReactNode
	choices: DropdownChoice[] | Record<string, DropdownChoice>
	allowCustom?: boolean
	minChoicesForSearch?: number
	tooltip?: string
	regex?: string
	value: DropdownChoiceId
	setValue: (value: DropdownChoiceId) => void
	setValid?: (valid: boolean) => void
	disabled?: boolean
	helpText?: string
	onBlur?: () => void
}

interface DropdownChoiceInt {
	value: any
	label: DropdownChoiceId
}

export const DropdownInputField = memo(function DropdownInputField({
	htmlName,
	className,
	label,
	choices,
	allowCustom,
	minChoicesForSearch,
	tooltip,
	regex,
	value,
	setValue,
	setValid,
	disabled,
	helpText,
	onBlur,
}: DropdownInputFieldProps) {
	const menuPortal = useContext(MenuPortalContext)

	const options = useMemo(() => {
		let options: DropdownChoice[] = []
		if (options) {
			if (Array.isArray(choices)) {
				options = choices
			} else if (typeof choices === 'object') {
				options = Object.values(choices)
			}
		}

		return options.map((choice): DropdownChoiceInt => ({ value: choice.id, label: choice.label }))
	}, [choices])

	const currentValue = useMemo(() => {
		// eslint-disable-next-line eqeqeq
		const entry = options.find((o) => o.value == value) // Intentionally loose for compatibility
		if (entry) {
			return entry
		} else {
			return { value: value, label: allowCustom ? value : `?? (${value})` }
		}
	}, [value, options, allowCustom])

	// Compile the regex (and cache)
	const compiledRegex = useMemo(() => {
		if (regex) {
			// Compile the regex string
			const match = regex.match(/^\/(.*)\/(.*)$/)
			if (match) {
				return new RegExp(match[1], match[2])
			}
		}
		return null
	}, [regex])

	const isValueValid = useCallback(
		(newValue: DropdownChoiceId | DropdownChoiceId[]) => {
			// Require the selected choice to be valid
			if (
				allowCustom &&
				compiledRegex &&
				!options.find((c) => c.value === newValue) &&
				!compiledRegex.exec(String(newValue))
			) {
				return false
			}

			return true
		},
		[allowCustom, compiledRegex, options]
	)

	// If the value is undefined, populate with the default. Also inform the parent about the validity
	useEffect(() => {
		setValid?.(isValueValid(value))
	}, [value, setValid, isValueValid])

	const onChange = useCallback(
		(e: DropdownChoiceInt) => {
			const newValue = e?.value

			const isValid = isValueValid(newValue)

			setValue(newValue)
			setValid?.(isValid)
		},
		[setValue, setValid, isValueValid]
	)

	const minChoicesForSearch2 = typeof minChoicesForSearch === 'number' ? minChoicesForSearch : 10

	// const selectRef = useRef<any>(null)

	const selectProps: Partial<CreatableProps<any, any, any>> = {
		name: htmlName,
		isDisabled: disabled,
		classNamePrefix: 'select-control',
		className: 'select-control',
		menuPortalTarget: menuPortal || document.body,
		menuShouldBlockScroll: !!menuPortal, // The dropdown doesn't follow scroll when in a modal
		menuPosition: 'fixed',
		menuPlacement: 'auto',
		isClearable: false,
		isSearchable: minChoicesForSearch2 <= options.length,
		isMulti: false,
		options: options,
		value: currentValue,
		onChange: onChange,
		filterOption: createFilter({ ignoreAccents: false }),
		components: { MenuList: WindowedMenuList },
		onBlur: onBlur,
	}

	const isValidNewOption = useCallback(
		(newValue: string | number) => typeof newValue === 'string' && (!compiledRegex || !!newValue.match(compiledRegex)),
		[compiledRegex]
	)
	const noOptionsMessage = useCallback(
		({ inputValue }: { inputValue: string | number }) => {
			if (!isValidNewOption(inputValue)) {
				return 'Input is not a valid value'
			} else {
				return 'Begin typing to use a custom value'
			}
		},
		[isValidNewOption]
	)
	const formatCreateLabel = useCallback((v: string | number) => `Use "${v}"`, [])

	/**
	 * Do some mangling with the input value to make custom values flow a bit better
	 */
	const [inputValue, setInputValue] = useState<string | undefined>(undefined)
	const onFocus = () => setInputValue(value + '')
	const onBlur2 = useCallback(() => {
		setInputValue(undefined)

		onBlur?.()
	}, [onBlur])

	const onChange2 = useCallback(
		(e: DropdownChoiceInt) => {
			setInputValue(e.value)
			onChange(e)
		},
		[onChange]
	)
	const onInputChange = useCallback(
		(v: string, a: InputActionMeta) => {
			if (!allowCustom) return

			if (a.action === 'input-blur') {
				onChange({ value: a.prevInputValue, label: a.prevInputValue })
			} else if (a.action === 'input-change') {
				setInputValue(v)
			}
		},
		[onChange, allowCustom]
	)

	return (
		<div
			className={classNames(
				{
					'select-tooltip': true,
					'select-invalid': !isValueValid(currentValue?.value),
				},
				className
			)}
			title={tooltip}
		>
			{helpText ? (
				<InlineHelp help={helpText}>
					<>{label ? <CFormLabel>{label}</CFormLabel> : null}</>
				</InlineHelp>
			) : (
				<>{label ? <CFormLabel>{label}</CFormLabel> : null}</>
			)}
			{allowCustom ? (
				<CreatableSelect
					{...selectProps}
					className={`${selectProps.className} select-control-editable`}
					isSearchable={true}
					noOptionsMessage={noOptionsMessage}
					createOptionPosition="first"
					formatCreateLabel={formatCreateLabel}
					isValidNewOption={isValidNewOption}
					onFocus={onFocus}
					onBlur={onBlur2}
					inputValue={allowCustom ? inputValue : undefined}
					value={!allowCustom || inputValue === undefined || inputValue === currentValue?.value ? currentValue : ''}
					onInputChange={onInputChange}
					onChange={onChange2}
				/>
			) : (
				<Select {...selectProps} />
			)}
		</div>
	)
}) as (props: DropdownInputFieldProps) => JSX.Element

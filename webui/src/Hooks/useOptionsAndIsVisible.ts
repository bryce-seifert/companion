import type {
	ExtendedConfigField,
	ExtendedInputField,
	InternalInputField,
} from '@companion-app/shared/Model/Options.js'
import { assertNever, deepFreeze, useComputed } from '~/Resources/util.js'
import { sandbox } from '~/Resources/sandbox.js'
import type { CompanionOptionValues } from '@companion-module/base'
import { cloneDeep } from 'lodash-es'
import { toJS } from 'mobx'
import { ParseExpression } from '@companion-app/shared/Expression/ExpressionParse.js'
import { ResolveExpression } from '@companion-app/shared/Expression/ExpressionResolve.js'
import { ExpressionFunctions } from '@companion-app/shared/Expression/ExpressionFunctions.js'

export function useOptionsAndIsVisible<
	T extends ExtendedInputField | InternalInputField = ExtendedInputField | InternalInputField,
>(
	itemOptions: Array<T> | undefined | null,
	optionValues: CompanionOptionValues | undefined | null
): [options: Array<T>, optionVisibility: Record<string, boolean | undefined>] {
	const [options, isVisibleFns] = useOptionsAndIsVisibleFns(itemOptions)

	const optionVisibility = useComputed<Record<string, boolean | undefined>>(() => {
		const visibility: Record<string, boolean> = {}

		if (optionValues) {
			for (const [id, entry] of Object.entries(isVisibleFns)) {
				try {
					if (entry && typeof entry === 'function') {
						visibility[id] = entry(cloneDeep(toJS(optionValues)))
					}
				} catch (e) {
					console.error('Failed to check visibility', e)
				}
			}
		}

		return visibility
	}, [isVisibleFns, optionValues])

	return [options, optionVisibility]
}

export function useOptionsAndIsVisibleFns<
	T extends ExtendedInputField | InternalInputField | ExtendedConfigField = ExtendedInputField | InternalInputField,
>(
	itemOptions: Array<T> | undefined | null
): [options: Array<T>, isVisibleFns: Record<string, ((options: CompanionOptionValues) => boolean) | undefined>] {
	const [options, isVisibleFns] = useComputed(() => {
		const options = itemOptions ?? []
		const isVisibleFns: Record<string, (options: CompanionOptionValues) => boolean> = {}

		for (const option of options) {
			try {
				if (!option.isVisibleUi) continue

				switch (option.isVisibleUi.type) {
					case 'function': {
						const fn = sandbox(option.isVisibleUi.fn)
						const userData = deepFreeze(toJS(option.isVisibleUi.data))
						isVisibleFns[option.id] = (options) => fn(options, userData)

						break
					}
					case 'expression': {
						const expression = ParseExpression(option.isVisibleUi.fn)
						const userData = deepFreeze(toJS(option.isVisibleUi.data))
						isVisibleFns[option.id] = (options) => {
							try {
								const val = ResolveExpression(
									expression,
									(name) => {
										if (name.startsWith('this:')) {
											return options[name.slice(5)] as any
										} else if (name.startsWith('options:')) {
											return options[name.slice(8)] as any
										} else if (name.startsWith('data:')) {
											return userData[name.slice(5)]
										} else {
											return undefined
										}
									},
									ExpressionFunctions
								)
								return !!val && val !== 'false' && val !== '0'
							} catch (e) {
								console.error('Failed to resolve expression', e)
								return true
							}
						}
						break
					}
					default:
						assertNever(option.isVisibleUi.type)
						break
				}
			} catch (e) {
				console.error('Failed to process isVisibleFn', e)
			}
		}

		return [options, isVisibleFns]
	}, [itemOptions])

	return [options, isVisibleFns]
}

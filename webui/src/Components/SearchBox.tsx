import { Input } from '@base-ui/react'
import './text-field.css'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'
import { useCallback } from 'react'
import { Button } from '~/Components/Button'
import { InputGroup } from '~/Components/Form'

export interface SearchBoxProps {
	className?: string
	placeholder?: string
	filter: string
	setFilter: (filter: string) => void
}

export function SearchBox({ className, placeholder, filter, setFilter }: SearchBoxProps): React.JSX.Element {
	const updateFilter = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => setFilter(e.currentTarget.value),
		[setFilter]
	)
	const clearFilter = useCallback(() => setFilter(''), [setFilter])

	return (
		<InputGroup className={classNames('h-9', className)}>
			<Input
				type="text"
				className="form-input text-input-field h-full text-sm py-0"
				placeholder={placeholder || 'Search ...'}
				onChange={updateFilter}
				value={filter}
				aria-label="Search"
			/>
			<Button
				color="primary"
				onClick={clearFilter}
				aria-label="Clear search filter"
				title="Clear search filter"
				className="h-full flex items-center justify-center px-3"
			>
				<FontAwesomeIcon icon={faTimes} />
			</Button>
		</InputGroup>
	)
}

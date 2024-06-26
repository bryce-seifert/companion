import {
	CButton,
	CDropdown,
	CDropdownMenu,
	CDropdownToggle,
	CInput,
	CInputGroup,
	CInputGroupAppend,
	CInputGroupPrepend,
	CInputGroupText,
	CLink,
} from '@coreui/react'
import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faMinus, faPlus } from '@fortawesome/free-solid-svg-icons'
import { NumberInputField } from '../Components/NumberInputField.js'
import { GridZoomController, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from './GridZoom.js'

export interface ButtonGridZoomControlProps {
	useCompactButtons: boolean
	gridZoomValue: number
	gridZoomController: GridZoomController
	style?: React.CSSProperties
}
export function ButtonGridZoomControl({
	useCompactButtons,
	gridZoomValue,
	gridZoomController,
	style,
}: ButtonGridZoomControlProps) {
	return (
		<CDropdown className="dropdown-zoom" style={style}>
			<CDropdownToggle caret={!useCompactButtons} color="light">
				<span className="sr-only">Zoom</span>
				<FontAwesomeIcon icon={faMagnifyingGlass} /> {useCompactButtons ? '' : `${Math.round(gridZoomValue)}%`}
			</CDropdownToggle>
			<CDropdownMenu>
				<CInputGroup className={'fieldtype-range'}>
					<CInputGroupPrepend>
						<CButton onClick={gridZoomController.zoomOut}>
							<FontAwesomeIcon icon={faMinus} />
						</CButton>
					</CInputGroupPrepend>
					<CInput
						name="zoom"
						type="range"
						min={ZOOM_MIN}
						max={ZOOM_MAX}
						step={ZOOM_STEP}
						title="Zoom"
						value={gridZoomValue}
						onChange={(e) => gridZoomController.setZoom(parseInt(e.currentTarget.value))}
					/>
					<CInputGroupAppend>
						<CButton onClick={gridZoomController.zoomIn}>
							<FontAwesomeIcon icon={faPlus} />
						</CButton>
					</CInputGroupAppend>
				</CInputGroup>
				<CInputGroup className="dropdown-item-padding">
					<NumberInputField value={gridZoomValue} setValue={gridZoomController.setZoom} min={ZOOM_MIN} max={ZOOM_MAX} />
					<CInputGroupAppend>
						<CInputGroupText>%</CInputGroupText>
					</CInputGroupAppend>
				</CInputGroup>
				<CLink className="dropdown-item" onClick={gridZoomController.zoomReset}>
					Zoom to 100%
				</CLink>
			</CDropdownMenu>
		</CDropdown>
	)
}

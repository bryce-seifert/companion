import semver, { SemVer } from 'semver'

const range1_2_0OrLater = new semver.Range('>=1.2.0-0', { includePrerelease: true })
const range1_12_0OrLater = new semver.Range('>=1.12.0-0', { includePrerelease: true })

export function doesModuleExpectLabelUpdates(apiVersion: SemVer): boolean {
	return range1_2_0OrLater.test(apiVersion)
}

export function doesModuleSupportPermissionsModel(apiVersion: string): boolean {
	return range1_12_0OrLater.test(apiVersion)
}

function expandMissing(info) {
	return {
		// Allow some fields to be optional, if they are repeated
		sharpPlatform: info.nodePlatform,
		sharpArch: info.nodeArch,
		runtimePlatform: info.nodePlatform,
		runtimeArch: info.nodeArch,
		...info,
	}
}

export function determinePlatformInfo(platform) {
	if (!platform) {
		platform = `${process.platform}-${process.arch}`
		console.log(`No platform specified, assumed ${platform}`)
	}

	if (platform === 'mac-x64' || platform === 'darwin-x64') {
		return expandMissing({
			electronBuilderArgs: ['--x64', '--mac'],
			nodePlatform: 'darwin',
			nodeArch: 'x64',
		})
	} else if (platform === 'mac-arm64' || platform === 'darwin-arm' || platform === 'darwin-arm64') {
		return expandMissing({
			electronBuilderArgs: ['--arm64', '--mac'],
			nodePlatform: 'darwin',
			nodeArch: 'arm64',
		})
	} else if (platform === 'win-x64' || platform === 'win32-x64') {
		return expandMissing({
			electronBuilderArgs: ['--x64', '--win'],
			nodePlatform: 'win32',
			nodeArch: 'x64',
			runtimePlatform: 'win',
		})
	} else if (platform === 'linux-x64') {
		return expandMissing({
			electronBuilderArgs: ['--x64', '--linux'],
			nodePlatform: 'linux',
			nodeArch: 'x64',
		})
	} else if (platform === 'linux-arm7' || platform === 'linux-arm' || platform === 'linux-armv7l') {
		return expandMissing({
			electronBuilderArgs: ['--armv7l', '--linux'],
			nodePlatform: 'linux',
			nodeArch: 'armv7l',
			sharpArch: 'arm',
		})
	} else if (platform === 'linux-arm64') {
		return expandMissing({
			electronBuilderArgs: ['--arm64', '--linux'],
			nodePlatform: 'linux',
			nodeArch: 'arm64',
		})
	} else {
		throw new Error('Unknown platform')
	}
}

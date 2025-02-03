import LogController from '../Log/Controller.js'
import path from 'path'
import fs from 'fs-extra'
import type { InstanceModules } from './Modules.js'
import type { ClientSocket, UIHandler } from '../UI/Handler.js'
import zlib from 'node:zlib'
import * as ts from 'tar-stream'
import { Readable } from 'node:stream'
import { ModuleManifest } from '@companion-module/base'
import * as tarfs from 'tar-fs'
import type { ModuleStoreService } from './ModuleStore.js'
import type { AppInfo } from '../Registry.js'
import { promisify } from 'util'
import type { ModuleStoreModuleInfoVersion } from '@companion-app/shared/Model/ModulesStore.js'
import { MultipartUploader } from '../Resources/MultipartUploader.js'
import type { DataDatabase } from '../Data/Database.js'
import { ConnectionConfigStore } from './ConnectionConfigStore.js'
import crypto from 'node:crypto'

const gunzipP = promisify(zlib.gunzip)

const MAX_MODULE_TAR_SIZE = 1024 * 1024 * 10 // 50MB
const MAX_MODULE_BUNDLE_TAR_SIZE = 1024 * 1024 * 500 // 500MB. This is small enough that it can be kept in memory

/**
 * This class manages the installed modules for an instance
 * It handles installing and uninstalling modules
 */
export class InstanceInstalledModulesManager {
	readonly #logger = LogController.createLogger('Instance/UserModulesManager')

	readonly #appInfo: AppInfo

	// readonly #db: DataDatabase

	readonly #io: UIHandler

	/**
	 * The modules manager. To be notified when a module is installed or uninstalled
	 */
	readonly #modulesManager: InstanceModules

	/**
	 * The store service. To get information about modules when installing from the store
	 */
	readonly #modulesStore: ModuleStoreService

	/**
	 * The config store of the connections
	 */
	readonly #configStore: ConnectionConfigStore

	/**
	 * Absolute path for storing store modules on disk
	 */
	readonly #modulesDir: string

	readonly #multipartUploader = new MultipartUploader((sessionId) => {
		this.#logger.info(`Module upload session "${sessionId}" timed out`)
		this.#io.emitToAll('modules:bundle-import:progress', sessionId, null)
	})

	readonly #restartConnection: (connectionId: string) => void

	constructor(
		appInfo: AppInfo,
		_db: DataDatabase,
		io: UIHandler,
		modulesManager: InstanceModules,
		modulesStore: ModuleStoreService,
		configStore: ConnectionConfigStore,
		installedModulesDir: string,
		restartConnection: (connectionId: string) => void
	) {
		this.#appInfo = appInfo
		// this.#db = db
		this.#io = io
		this.#modulesManager = modulesManager
		this.#modulesStore = modulesStore
		this.#configStore = configStore
		this.#modulesDir = installedModulesDir
		this.#restartConnection = restartConnection
	}

	/**
	 * Initialise the user modules manager
	 */
	async init() {
		await fs.mkdirp(this.#modulesDir)
		await fs.writeFile(
			path.join(this.#modulesDir, 'README'),
			'This directory contains installed modules\r\nDo not modify unless you know what you are doing\n'
		)
	}

	#modulesBeingInstalled = new Set<string>()
	ensureModuleIsInstalled(moduleId: string, versionId: string | null) {
		this.#logger.debug(`Ensuring module "${moduleId}" is installed`)

		if (this.#modulesManager.getModuleManifest(moduleId, versionId)) {
			this.#logger.silly(`Module "${moduleId}" is already installed`)
			return
		}

		// Future: track as pending install in the db, and write some retry logic

		const installingModuleId = `${moduleId}-${versionId ?? 'latest'}`
		if (this.#modulesBeingInstalled.has(installingModuleId)) {
			this.#logger.info(`Module "${moduleId}" v${versionId ?? 'latest'} is already being installed`)
			return
		}
		this.#modulesBeingInstalled.add(installingModuleId)

		this.#logger.info(`Queuing install of module "${moduleId}" v${versionId ?? 'latest'}`)

		this.#modulesStore
			.fetchModuleVersionInfo(moduleId, versionId, true)
			.then(async (versionInfo) => {
				if (!versionInfo) {
					this.#logger.warn(`Module "${moduleId}" v${versionId ?? 'latest'} does not exist in the store`)
					return
				}

				await this.#installModuleVersionFromStore(moduleId, versionInfo)

				if (!versionId) {
					const changedConnectionIds: string[] = []
					for (const connectionId of this.#configStore.getAllInstanceIds()) {
						const config = this.#configStore.getConfigForId(connectionId)
						if (!config) continue

						if (config.instance_type !== moduleId) continue
						if (config.moduleVersionId !== null) continue

						config.moduleVersionId = versionInfo.id
						changedConnectionIds.push(connectionId)

						// If enabled, restart it
						if (config.enabled) this.#restartConnection(connectionId)
					}

					// Save the changes
					this.#configStore.commitChanges(changedConnectionIds)
				}
			})
			.catch((e) => {
				this.#logger.error(`Failed to install module "${moduleId}" v${versionId ?? 'latest'}`, e)
			})
			.finally(() => {
				// Mark as no longer being installed
				this.#modulesBeingInstalled.delete(installingModuleId)
			})
	}

	/**
	 * Setup a new socket client's events
	 */
	clientConnect(client: ClientSocket): void {
		client.onPromise('modules:install-all-missing', async () => {
			this.#logger.debug('modules:install-all-missing')

			for (const connectionId of this.#configStore.getAllInstanceIds()) {
				const config = this.#configStore.getConfigForId(connectionId)
				if (!config) continue

				this.ensureModuleIsInstalled(config.instance_type, config.moduleVersionId)
			}
		})

		client.onPromise('modules:install-module-tar', async (data) => {
			// this.#logger.debug('modules:install-module-tar', data)

			if (!(data instanceof Uint8Array)) return 'Invalid data. Expected UInt8Array'

			// TODO - error handling for this whole function

			const decompressedData = await gunzipP(data)
			if (!decompressedData) {
				this.#logger.warn(`Failed to decompress module data`)
				return 'Failed to decompress data'
			}

			const manifestJson = await extractManifestFromTar(decompressedData).catch((e) => {
				this.#logger.error(`Failed to extract manifest from module`, e)
			})
			if (!manifestJson) {
				this.#logger.warn(`Failed to find manifest in module archive`)
				return "Doesn't look like a valid module, missing manifest"
			}

			const moduleDir = path.join(this.#modulesDir, `${manifestJson.id}-${manifestJson.version}`)
			if (fs.existsSync(moduleDir)) {
				this.#logger.warn(`Module ${manifestJson.id} v${manifestJson.version} already exists on disk`)
				return `Module ${manifestJson.id} v${manifestJson.version} already exists`
			}

			return this.#installModuleFromTarBuffer(moduleDir, manifestJson, decompressedData, null)
		})

		client.onPromise('modules:install-store-module', async (moduleId, moduleVersion) => {
			this.#logger.info(`Installing ${moduleId} v${moduleVersion} from store`)

			const versionInfo = this.#modulesStore.getCachedModuleVersionInfo(moduleId, moduleVersion)
			if (!versionInfo) {
				this.#logger.warn(`Unable to install ${moduleId} v${moduleVersion}, it is not known in the store`)
				return `Module ${moduleId} v${moduleVersion} not found`
			}

			return this.#installModuleVersionFromStore(moduleId, versionInfo)
		})

		// client.onPromise('modules:install-store-module:latest', async (moduleId) => {
		// 	this.#logger.info(`Installing latest version of module ${moduleId}`)

		// 	const versionInfo = await this.#modulesStore.fetchModuleVersionInfo(moduleId, null, true)
		// 	if (!versionInfo) {
		// 		this.#logger.warn(`Unable to install latest version of ${moduleId}, it is not known in the store`)
		// 		return `Latest version of module "${moduleId}" not found`
		// 	}

		// 	this.#logger.info(`Installing ${moduleId} v${versionInfo} from store`)

		// 	return this.#installModuleVersionFromStore(moduleId, versionInfo)
		// })

		client.onPromise('modules:uninstall-store-module', async (moduleId, versionId) => {
			return this.#uninstallModule(moduleId, versionId)
		})

		client.onPromise('modules:bundle-import:start', async (name, size, checksum) => {
			this.#logger.info(`Starting upload of module bundle ${name} (${size} bytes)`)

			if (size > MAX_MODULE_BUNDLE_TAR_SIZE) throw new Error('Module bundle too large to upload')

			const sessionId = this.#multipartUploader.initSession(name, size, checksum)
			if (sessionId === null) return null

			this.#io.emitToAll('modules:bundle-import:progress', sessionId, 0)

			return sessionId
		})
		client.onPromise('modules:bundle-import:chunk', async (sessionId, offset, data) => {
			this.#logger.silly(`Upload module bundle chunk ${sessionId} (@${offset} = ${data.length} bytes)`)

			const progress = this.#multipartUploader.addChunk(sessionId, offset, data)
			if (progress === null) return false

			this.#io.emitToAll('modules:bundle-import:progress', sessionId, progress / 2)

			return true
		})
		client.onPromise('modules:bundle-import:cancel', async (sessionId) => {
			this.#logger.silly(`Canel module bundle upload ${sessionId}`)

			this.#multipartUploader.cancelSession(sessionId)
		})
		client.onPromise('modules:bundle-import:complete', async (sessionId) => {
			this.#logger.silly(`Attempt module bundle complete ${sessionId}`)

			const data = this.#multipartUploader.completeSession(sessionId)
			if (data === null) return false

			this.#logger.info(`Importing module bundle ${sessionId} (${data.length} bytes)`)

			this.#io.emitToAll('modules:bundle-import:progress', sessionId, 0.5)

			// Upload is complete, now load it
			Promise.resolve()
				.then(async () => {
					const decompressedData = await gunzipP(data)
					if (!decompressedData) {
						this.#logger.error(`Failed to decompress module data`)
						throw new Error('Failed to decompress data')
					}

					const moduleInfos = await listModuleDirsInTar(decompressedData)
					this.#logger.info(`Module bundle contains ${moduleInfos.length} modules`)
					if (moduleInfos.length === 0) {
						this.#logger.warn(`No modules found in bundle`)
						throw new Error('No modules found in bundle')
					}

					let completed = 0
					for (const moduleInfo of moduleInfos) {
						try {
							const moduleDir = path.join(
								this.#modulesDir,
								`${moduleInfo.manifestJson.id}-${moduleInfo.manifestJson.version}`
							)
							if (!fs.existsSync(moduleDir)) {
								await this.#installModuleFromTarBuffer(
									moduleDir,
									moduleInfo.manifestJson,
									decompressedData,
									moduleInfo.subDir
								)
							}
						} catch (e) {
							this.#logger.warn(`Failed to install module from bundle`, e)
						}

						completed++
						this.#io.emitToAll('modules:bundle-import:progress', sessionId, 0.5 + completed / moduleInfos.length / 2)

						if (completed % 10 === 0) await new Promise((resolve) => setTimeout(resolve, 10)) // Ensure cpu time is given to other tasks
					}

					this.#io.emitToAll('modules:bundle-import:progress', sessionId, null)
				})
				.catch((e) => {
					this.#logger.error(`Failed to import module bundle`, e)
					this.#io.emitToAll('modules:bundle-import:progress', sessionId, null) // TODO - report failure?
				})

			return true
		})
	}

	async #installModuleVersionFromStore(
		moduleId: string,
		versionInfo: ModuleStoreModuleInfoVersion
	): Promise<string | null> {
		const moduleVersion = versionInfo.id

		const moduleDir = path.join(this.#modulesDir, `${moduleId}-${moduleVersion}`)
		if (fs.existsSync(moduleDir)) {
			this.#logger.warn(`Module ${moduleId} v${moduleVersion} already exists on disk`)
			return `Module ${moduleId} v${moduleVersion} already exists`
		}

		if (!versionInfo.tarUrl) {
			this.#logger.error(`Module ${moduleId} v${moduleVersion} has no download URL`)
			return `Module ${moduleId} v${moduleVersion} has no download URL`
		}

		if (!versionInfo.tarSha) {
			this.#logger.error(`Module ${moduleId} v${moduleVersion} has no download checksum`)
			return `Module ${moduleId} v${moduleVersion} has no download checksum`
		}

		const timeBeforeDownload = Date.now()

		const abortControl = new AbortController()
		const response = await fetch(versionInfo.tarUrl, {
			headers: {
				'User-Agent': `Companion ${this.#appInfo.appVersion}`,
				'Companion-App-Build': this.#appInfo.appBuild,
				'Companion-App-Version': this.#appInfo.appVersion,
				'Companion-Machine-Id': this.#appInfo.machineId,
			},
			signal: abortControl.signal,
		})
		if (!response.body) throw new Error('Failed to fetch module, got no body')

		// Download into memory with a size limit
		const chunks: Uint8Array[] = []
		let bytesReceived = 0
		for await (const chunk of response.body as ReadableStream<Uint8Array>) {
			bytesReceived += chunk.byteLength
			if (bytesReceived > MAX_MODULE_TAR_SIZE) {
				abortControl.abort()
				this.#logger.error(`Module too large to download safely`)
				return 'Module is too large to download safely'
			}
			chunks.push(chunk)
		}

		this.#logger.info(
			`Downloaded ${moduleId} v${moduleVersion} in ${Date.now() - timeBeforeDownload}ms (${bytesReceived} bytes)`
		)

		const fullTarBuffer = Buffer.concat(chunks)

		const bufferChecksum = crypto.createHash('sha256').update(fullTarBuffer).digest('hex')
		if (bufferChecksum !== versionInfo.tarSha) {
			this.#logger.error(`Downlod did not match checksum`)
			return 'Download did not match checksum'
		}

		const decompressedData = await gunzipP(fullTarBuffer)
		if (!decompressedData) {
			this.#logger.error(`Failed to decompress module data`)
			return 'Failed to decompress data'
		}

		const manifestJson = await extractManifestFromTar(decompressedData).catch((e) => {
			this.#logger.error(`Failed to extract manifest from module`, e)
		})
		if (!manifestJson) {
			this.#logger.warn(`Failed to find manifest in module archive`)
			return "Doesn't look like a valid module, missing manifest"
		}

		if (manifestJson.id !== moduleId) {
			const msg = `Module manifest does not match requested module. Got ${manifestJson.id}@${manifestJson.version}, expected ${moduleId}@${moduleVersion}`
			this.#logger.warn(msg)
			return msg
		}

		return this.#installModuleFromTarBuffer(moduleDir, manifestJson, decompressedData, null, {
			forceVersion: moduleVersion,
		})
	}

	async #installModuleFromTarBuffer(
		moduleDir: string,
		manifestJson: ModuleManifest,
		uncompressedData: Buffer,
		subdirName: string | null,
		options?: { forceVersion?: string }
	): Promise<string | null> {
		try {
			await fs.mkdirp(moduleDir)

			await new Promise((resolve, reject) => {
				Readable.from(uncompressedData)
					.pipe(
						tarfs.extract(
							moduleDir,
							subdirName
								? {
										// Only extract files inside the subdir, without the prefix
										strip: 1,
										ignore: (_name, header) => !header || header.name === '',
										map: (header) => {
											if (header.name.startsWith(subdirName + '/')) {
												header.name = header.name.slice(subdirName.length + 1)
											} else {
												header.name = '' // Ignore
											}
											return header
										},
									}
								: { strip: 1 }
						)
					)
					.on('finish', resolve)
					.on('error', reject)
			})

			this.#logger.debug(`Extracted module to ${moduleDir}`)

			if (options?.forceVersion && options.forceVersion !== manifestJson.version) {
				this.#logger.warn(
					`Module ${manifestJson.id} v${manifestJson.version}, contained wrong version number. Fixing it!`
				)
				manifestJson.version = options.forceVersion
				await fs.writeFile(path.join(moduleDir, 'companion/manifest.json'), JSON.stringify(manifestJson))
			}
		} catch (e) {
			// cleanup the dir, just to be sure it doesn't get stranded
			await fs.rm(moduleDir, { recursive: true }).catch(() => null)
		}

		this.#logger.info(`Installed module ${manifestJson.id} v${manifestJson.version}`)

		// Let other interested parties know that a module has been installed
		await this.#modulesManager.loadInstalledModule(moduleDir, manifestJson)

		return null
	}

	async #uninstallModule(moduleId: string, versionId: string): Promise<string | null> {
		this.#logger.info(`Uninstalling ${moduleId} v${versionId}`)

		try {
			const moduleDir = path.join(this.#modulesDir, `${moduleId}-${versionId}`)
			if (!fs.existsSync(moduleDir)) return `Module ${moduleId} v${versionId} doesn't exist`

			// Stop any usages of the module
			await this.#modulesManager.uninstallModule(moduleId, versionId)

			// Delete the module code
			await fs.rm(moduleDir, { recursive: true }).catch(() => null)
		} catch (_e) {
			this.#logger.error(`Error uninstalling module`, _e)
			return 'Internal error uninstalling module'
		}

		return null
	}
}

async function extractManifestFromTar(tarData: Buffer): Promise<ModuleManifest | null> {
	return new Promise<ModuleManifest | null>((resolve, reject) => {
		const extract = ts.extract()

		let rootDir: string | undefined // Determine the root directory of the tarball

		extract.on('entry', (header, stream, next) => {
			if (rootDir === undefined) {
				// The first entry must be the root directory, we can use that to know what to trim off the other filenames
				// if (header.type !== 'directory') throw new Error('expected first entry to be a directory')
				// TODO: throwing here is BAD, and goes uncaught, we need to make sure that doesn't happen

				rootDir = header.type === 'directory' ? header.name : undefined
			}

			const filename = rootDir && header.name.startsWith(rootDir) ? header.name.slice(rootDir.length) : header.name

			if (filename === 'companion/manifest.json') {
				let dataBuffers: Buffer[] = []

				stream.on('end', () => {
					// The file we need has been found
					const manifestStr = Buffer.concat(dataBuffers).toString('utf8')

					try {
						resolve(JSON.parse(manifestStr))
					} catch (e) {
						reject(e)
					}

					extract.destroy()

					next() // ready for next entry
				})

				stream.on('data', (data) => {
					dataBuffers.push(data)
				})
			} else {
				// Skip the irrelevant files

				stream.on('end', () => {
					next() // ready for next entry
				})

				stream.resume() // just auto drain the stream
			}
		})

		extract.on('finish', () => {
			// all entries read, if a value hasn't been resolved then the manifest wasn't found
			resolve(null)
		})

		extract.on('error', (err) => {
			reject(err)

			extract.destroy()
		})

		Readable.from(tarData).pipe(extract)
	})
}

interface ListModuleDirsInfo {
	subDir: string
	manifestJson: ModuleManifest
}
async function listModuleDirsInTar(tarData: Buffer): Promise<ListModuleDirsInfo[]> {
	return new Promise<ListModuleDirsInfo[]>((resolve, reject) => {
		const extract = ts.extract()

		const moduleInfos: ListModuleDirsInfo[] = []

		let rootDir = '' // Determine the root directory of the tarball

		extract.on('entry', (header, stream, next) => {
			if (!rootDir) {
				// The first entry must be the root directory, we can use that to know what to trim off the other filenames
				// if (header.type !== 'directory') throw new Error('expected first entry to be a directory')
				// TODO: throwing here is BAD, and goes uncaught, we need to make sure that doesn't happen

				rootDir = header.type === 'directory' ? header.name : ''
			}

			const filename = rootDir && header.name.startsWith(rootDir) ? header.name.slice(rootDir.length) : header.name

			const suffix = '/companion/manifest.json'
			if (filename.endsWith(suffix)) {
				// collect the module names
				const moduleDirName = filename.slice(0, -suffix.length)
				if (!moduleDirName.includes('/')) {
					let dataBuffers: Buffer[] = []

					stream.on('end', () => {
						// The file we need has been found
						const manifestStr = Buffer.concat(dataBuffers).toString('utf8')

						try {
							moduleInfos.push({
								subDir: moduleDirName,
								manifestJson: JSON.parse(manifestStr),
							})
						} catch (e) {
							// Ignore
							// reject(e)
						}

						next() // ready for next entry
					})

					stream.on('data', (data) => {
						dataBuffers.push(data)
					})

					return
				}
			}

			// Skip the content
			stream.on('end', () => {
				next() // ready for next entry
			})

			stream.resume() // just auto drain the stream
		})

		extract.on('finish', () => {
			// all files read
			resolve(moduleInfos)

			extract.destroy()
		})

		extract.on('error', (err) => {
			reject(err)

			extract.destroy()
		})

		Readable.from(tarData).pipe(extract)
	})
}

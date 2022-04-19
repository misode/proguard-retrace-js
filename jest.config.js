/** @type {import('@jest/types').Config.InitialOptions} */
export default {
	extensionsToTreatAsEsm: ['.ts'],
	transform: {
		'^.+\\.tsx?$': [
			'esbuild-jest',
			{
				format: 'esm',
			},
		],
	},
}

import { defineConfig } from 'rollup'
import dts from 'rollup-plugin-dts'
import esbuild from 'rollup-plugin-esbuild'
import { terser } from 'rollup-plugin-terser'
import pkg from './package.json'

const dev = process.env.ROLLUP_WATCH === 'true'

export default defineConfig([
	{
		input: 'src/index.ts',
		output: [
			{ file: pkg.main, format: 'cjs', sourcemap: true },
			{ file: pkg.module, format: 'es', sourcemap: true },
		],
		plugins: [
			esbuild(),
			!dev && terser(),
		],
	},
	{
		input: 'src/index.ts',
		output: [{ file: pkg.types, format: 'es' }],
		plugins: [dts({ compilerOptions: { composite: false, incremental: false } })],
	},
])

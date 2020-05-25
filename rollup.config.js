import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'
import builtins from 'rollup-plugin-node-builtins'

export default {
	input: './index.js',
	external: ['@pelagiccreatures/sargasso'],

	output: [{
		format: 'iife',
		name: 'PelagicCreatures.Copepod',
		file: './dist/copepod.iife.js',
		globals: {
			'@pelagiccreatures/sargasso': 'PelagicCreatures.Sargasso'
		},
		sourcemap: true
	}],

	plugins: [
		builtins(),
		json(),
		nodeResolve(),
		commonjs()
	]
}

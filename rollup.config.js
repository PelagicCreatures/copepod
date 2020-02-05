import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'

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
		json(),
		nodeResolve(),
		commonjs()
	]
}

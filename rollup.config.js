import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'
import {
	terser
}
	from 'rollup-plugin-terser'

export default {
	input: './index.js',
	external: ['@pelagiccreatures/sargasso'],

	output: [{
		format: 'iife',
		name: 'CopepodModule',
		file: './dist/copepod.iife.js',
		globals: {
			'@pelagiccreatures/sargasso': 'SargassoModule'
		}
	}, {
		format: 'iife',
		name: 'CopepodModule',
		file: './dist/copepod.iife.min.js',
		globals: {
			'@pelagiccreatures/sargasso': 'SargassoModule'
		},
		plugins: [terser({
			output: {
				comments: false
			}
		})],
		sourcemap: true
	}],

	plugins: [
		json(),
		nodeResolve({
			preferBuiltins: false
		}),
		commonjs()
	]
}

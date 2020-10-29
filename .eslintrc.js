module.exports = {
	extends: [
		'@ghadyani-eslint/node',
		'@ghadyani-eslint/web',
	],
	plugins: [
		'react-hooks',
	],
	rules: {
		'@ghadyani-eslint/arrow-body-parens/parens': 'off', // TEMP. Remove 'off' when fixed in @ghadyani-eslint
		'import/no-unresolved': [
			'warn',
			{ ignore: ['\\$'] },
		],
		'indent': 'off', // TEMP. Remove 'off' when fixed in @ghadyani-eslint
		'no-unexpected-multiline': 'off',
		'react-hooks/exhaustive-deps': 'warn',
		'react-hooks/rules-of-hooks': 'error',
	},
	settings: {
		react: {
			version: 'detect',
		},
	},
}

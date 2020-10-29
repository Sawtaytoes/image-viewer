import PropTypes from 'prop-types'
import {
	memo,
	useMemo,
} from 'react'

const path = global.require('path')
const { css } = global.require('@emotion/core')

const imageStyles = css`
	width: 100%;
`

const propTypes = {
	children: PropTypes.string.isRequired,
}

const Image = ({
	children: filePath,
}) => {
	const webSafeFilePath = (
		useMemo(
			() => (
				filePath
				.replace(
					'#',
					'%23',
				)
			),
			[filePath],
		)
	)

	const fileName = (
		useMemo(
			() => (
				path
				.basename(
					filePath
				)
			),
			[filePath],
		)
	)

	return (
		<img
			alt={fileName}
			css={imageStyles}
			src={webSafeFilePath}
			title={fileName}
		/>
	)
}

Image.propTypes = propTypes

const MemoizedImage = memo(Image)

export default MemoizedImage

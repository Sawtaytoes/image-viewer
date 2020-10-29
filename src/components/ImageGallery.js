import useImageFilePaths from './hooks/useImageFilePaths'

const config = window.require('config')
const yargs = window.require('yargs')
const { remote } = window.require('electron')

const defaultFileList = (
	(
		yargs(
			remote
			.getGlobal('processArgs')
		)
		.argv
		.filePath
	)
	|| (
		config
		.get('filePath')
	)
	|| './'
)

const ImageGallery = () => {
	const imageFilePaths = (
		useImageFilePaths(
			defaultFileList
		)
	)

	return (
		<div>
			<pre>
				{
					JSON.stringify(
						imageFilePaths,
						null,
						2,
					)}
			</pre>
		</div>
	)
}

export default ImageGallery

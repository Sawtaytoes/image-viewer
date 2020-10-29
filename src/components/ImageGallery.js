import { useContext } from 'react'

import FileSystemContext from './FileSystemContext'

const ImageGallery = () => {
	const {
		directoryPaths,
		imageFilePaths,
	} = (
		useContext(
			FileSystemContext
		)
	)

	return (
		<pre>
			{
				JSON.stringify(
					directoryPaths,
					null,
					2,
				)
			}

			{
				JSON.stringify(
					imageFilePaths,
					null,
					2,
				)
			}
		</pre>
	)
}

export default ImageGallery

import { useContext } from 'react'

import FileSystemContext from './FileSystemContext'

const ImageGallery = () => {
	const {
		imageFilePaths,
	} = (
		useContext(
			FileSystemContext
		)
	)

	return (
		<div>
			{
				JSON.stringify(
					imageFilePaths,
					null,
					2,
				)
			}
		</div>
	)
}

export default ImageGallery

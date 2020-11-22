const createObservable = () => {
	const subscribers = []

	const subscribe = subscriber => {
		subscribers
		.push(
			subscriber
		)

		return {
			unsubscribe: () => {
				const callbackIndex = (
					subscribers
					.indexOf(
						subscriber
					)
				)

				subscribers
				.splice(
					callbackIndex,
					1,
				)
			},
		}
	}

	const publish = value => (
		subscribers
		.forEach(subscriber => {
			subscriber(value)
		})
	)

	return {
		publish,
		subscribe,
	}
}

export default createObservable

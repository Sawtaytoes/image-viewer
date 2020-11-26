class Config {
	constructor(config) {
		this.config = config
	}

	get(configKey) {
		return this.config[configKey]
	}

	has(configKey) {
		return this.get(configKey) !== undefined
	}

	toJSON() {
		return this.config
	}
}

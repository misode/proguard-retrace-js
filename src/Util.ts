export class DefaultMap<K, V> extends Map<K, V> {
	constructor(
		private readonly defaultValue: () => V,
		entries?: readonly (readonly [K, V])[] | null,
	) {
		super(entries)
	}

	get(key: K): V {
		let value = super.get(key)
		if (!value) {
			value = this.defaultValue()
			this.set(key, value)
		}
		return value
	}
}

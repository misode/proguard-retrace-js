import { DefaultMap } from './Util'

export interface FieldInfo {
	className: string
	type: string
	name: string
}

export interface MethodInfo {
	deobfFirstLine: number
	deobfLastLine: number
	firstLine: number
	lastLine: number
	className: string
	type: string
	name: string
	args: string
}

export interface Mappings {
	classMap: Map<string, string>
	fieldMap: Map<string, Map<string, FieldInfo[]>>
	methodMap: Map<string, Map<string, MethodInfo[]>>
}

export function parseMappings(source: string): Mappings {
	const classMap = new Map<string, string>()
	const fieldMap = new DefaultMap<string, DefaultMap<string, FieldInfo[]>>(() => new DefaultMap(() => []))
	const methodMap = new DefaultMap<string, DefaultMap<string, MethodInfo[]>>(() => new DefaultMap(() => []))
	let className: string | undefined = undefined

	for (let line of source.split('\n')) {
		line = line.trim()
		if (line.startsWith('#')) {
			continue
		}
		if (line.endsWith(':')) {
			const arrow =                  line.indexOf('->')
			const colon = arrow < 0 ? -1 : line.indexOf(':', arrow + 2)
			if (arrow < 0 || colon < 0) {
				continue
			}
			const name = line.substring(0, arrow).trim()
			const deobfName = line.substring(arrow + 2, colon).trim()
			classMap.set(deobfName, name)
			className = name
		} else {
			// See https://github.com/Guardsquare/proguard/blob/master/base/src/main/java/proguard/obfuscate/MappingReader.java#L149
			const colon1 =                   line.indexOf(':')
			const colon2 = colon1 < 0 ? -1 : line.indexOf(':', colon1 + 1)
			const space  =                   line.indexOf(' ', colon2 + 2)
			const arg1   =                   line.indexOf('(', space + 1)
			const arg2   = arg1   < 0 ? -1 : line.indexOf(')', arg1 + 1)
			const colon3 = arg2   < 0 ? -1 : line.indexOf(':', arg2 + 1)
			const colon4 = colon3 < 0 ? -1 : line.indexOf(':', colon3 + 1)
			const arrow  = line.indexOf('->', (colon4 >= 0 ? colon4 : colon3 >= 0 ? colon3 : arg2 >= 0 ? arg2 : space) + 1)

			if (space < 0 || arrow < 0) {
				continue
			}

			const type = line.substring(colon2 + 1, space).trim()
			let name = line.substring(space + 1, arg1 >= 0 ? arg1 : arrow).trim()
			const deobfName = line.substring(arrow + 2).trim()

			let deobfClassName = className
			const dot = name.lastIndexOf('.')
			if (dot >= 0) {
				deobfClassName = name.substring(0, dot)
				name = name.substring(dot + 1)
			}
			if (type.length === 0 || name.length === 0 || deobfName.length === 0) {
				continue
			}

			if (arg2 < 0) { // Field
				const fields = fieldMap.get(className!).get(deobfName)
				fields.push({ className: deobfClassName!, type, name })
			} else { // Method
				let firstLine = 0
				let lastLine = 0
				let deobfFirstLine = 0
				let deobfLastLine = 0
				if (colon2 >= 0) {
					firstLine = deobfFirstLine = Number(line.substring(0, colon1).trim())
					lastLine = deobfLastLine = Number(line.substring(colon1 + 1, colon2).trim())
				}
				if (colon3 >= 0) {
					firstLine = Number(line.substring(colon3 + 1, colon4 >= 0 ? colon4 : arrow).trim())
					lastLine = colon4 < 0 ? firstLine : Number(line.substring(colon4 + 1, arrow).trim())
				}
				const args = line.substring(arg1 + 1, arg2).trim()
				const methods = methodMap.get(className!).get(deobfName)
				methods.push({ className: deobfClassName!, type, name, args, firstLine, lastLine, deobfFirstLine, deobfLastLine })
			}
		}
	}

	return {
		classMap,
		fieldMap: fieldMap,
		methodMap: methodMap,
	}
}

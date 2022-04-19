import { FrameInfo, FramePattern } from './Frames'
import { Mappings, parseMappings } from './Mappings'
import { FrameRemapper } from './Remapper'

const RE_CLASS_METHOD = '%c\\.%m'
const RE_SOURCE_LINE = '(?:\\(\\))?(?:\\((?:%s)?(?::?%l)?(?::\\d+)?\\))?\\s*(?:~\\[.*\\])?'
const RE_OPTIONAL_SOURCE_LINE_INFO = '(?:\\+\\s+[0-9]+)?'
const RE_AT = `.*?\\bat\\s+${RE_CLASS_METHOD}\\s*${ RE_OPTIONAL_SOURCE_LINE_INFO}${RE_SOURCE_LINE}`
const RE_CAST1 = '.*?\\bjava\\.lang\\.ClassCastException: %c cannot be cast to .{5,}'
const RE_CAST2 = '.*?\\bjava\\.lang\\.ClassCastException: .* cannot be cast to %c'
const RE_NULL_FIELD_READ = '.*?\\bjava\\.lang\\.NullPointerException: Attempt to read from field \'%t %c\\.%f\' on a null object reference'
const RE_NULL_FIELD_WRITE = '.*?\\bjava\\.lang\\.NullPointerException: Attempt to write to field \'%t %c\\.%f\' on a null object reference'
const RE_NULL_METHOD = '.*?\\bjava\\.lang\\.NullPointerException: Attempt to invoke (?:virtual|interface) method \'%t %c\\.%m\\(%a\\)\' on a null object reference'
const RE_THROW = '(?:.*?[:"]\\s+)?%c(?::.*)?'
const RE_RETURN_VALUE_NULL1 = '.*?\\bjava\\.lang\\.NullPointerException: Cannot invoke \\".*\\" because the return value of \\"%c\\.%m\\(%a\\)\\" is null'
const RE_RETURN_VALUE_NULL2 = '.*?\\bjava\\.lang\\.NullPointerException: Cannot invoke \\"%c\\.%m\\(%a\\)\\" because the return value of \\".*\\" is null'
const RE_BECAUSE_IS_NULL = '.*?\\bbecause \\"%c\\.%f\\" is null'

const REGULAR_EXPRESSIONS = [
	`(?:${RE_AT})|(?:${RE_CAST1})|(?:${RE_CAST2})|(?:${RE_NULL_FIELD_READ})|(?:${RE_NULL_FIELD_WRITE})|(?:${RE_NULL_METHOD})|(?:${RE_RETURN_VALUE_NULL1})|(?:${RE_BECAUSE_IS_NULL})|(?:${RE_THROW})`,
	`(?:${RE_RETURN_VALUE_NULL2})`,
]

export class Retrace {
	private readonly mappings: Mappings
	private readonly remapper: FrameRemapper
	private readonly patterns: FramePattern[]

	constructor(mappingsSource: string) {
		this.mappings = parseMappings(mappingsSource)
		this.remapper = new FrameRemapper(this.mappings)
		this.patterns = REGULAR_EXPRESSIONS.map(re => new FramePattern(re))
	}

	retrace(stacktrace: string) {
		let deobfStacktrace = ''
		let index = 0
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const nextIndex = stacktrace.indexOf('\n', index)
			const line = stacktrace.substring(index, nextIndex < 0 ? undefined : nextIndex) + '\n'
			let deobfLine = line
			for (const pattern of this.patterns) {
				const frame = pattern.parse(line)
				deobfLine = this.handle(frame, pattern, deobfLine)
			}
			deobfStacktrace += deobfLine
			index = nextIndex + 1
			if (nextIndex < 0) {
				break
			}
		}
		return deobfStacktrace
	}

	private handle(frame: FrameInfo | undefined, pattern: FramePattern, line: string) {
		if (frame === undefined) {
			return line
		}
		const deobfFrames = this.remapper.transform(frame) ?? []
		let result = ''
		let prevLine: string | undefined = undefined
		for (const deobfFrame of deobfFrames) {
			const deobfLine = pattern.format(line, deobfFrame)
			// console.log('trim?', prevLine, frame.lineNumber, deobfLine)
			const trimmedLine = prevLine
				? Retrace.trim(deobfLine, prevLine)
				: deobfLine
			if (trimmedLine !== undefined) {
				result += trimmedLine
			}
			prevLine = deobfLine
		}
		return result
	}

	private static trim(a: string | undefined, b: string) {
		if (a === undefined) return undefined
		
		let trimEnd = 0
		while (trimEnd < a.length && trimEnd < b.length && a.charAt(trimEnd) === b.charAt(trimEnd)) {
			trimEnd += 1
		}
		if (trimEnd === a.length) return undefined

		while (trimEnd >= 0 && a.charAt(trimEnd).match(/[a-zA-Z0-9$_]/)) {
			trimEnd -= 1
		}

		trimEnd += 1

		let result = a
		for (let i = 0; i < trimEnd; i += 1) {
			if (!a.charAt(i).match(/\s/)) {
				result = result.substring(0, i) + ' ' + result.substring(i + 1)
			}
		}

		return result
	}
}

export function retrace(mappingSource: string, stacktrace: string) {
	const retrace = new Retrace(mappingSource)
	return retrace.retrace(stacktrace)
}

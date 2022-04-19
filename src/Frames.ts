
export interface FrameInfo {
	className?: string
	sourceFile?: string
	lineNumber?: number
	type?: string
	fieldName?: string
	methodName?: string
	args?: string
}

interface ExpressionType {
	pattern: string
	parse: (frame: FrameInfo, match: string) => FrameInfo
	format: (frame: FrameInfo, buffer: string) => string
}

const REGEX_CLASS = '(?:[^\\s":./()]+\\.)*[^\\s":./()]+'
const REGEX_CLASS_SLASH = '(?:[^\\s":./()]+/)*[^\\s":./()]+'
const REGEX_SOURCE_FILE = '(?:[^:()\\d][^:()]*)?'
const REGEX_LINE_NUMBER = '-?\\b\\d+\\b'
const REGEX_TYPE = REGEX_CLASS + '(?:\\[\\])*'
const REGEX_MEMBER = '<?[^\\s":./()]+>?'
const REGEX_ARGUMENTS = '(?:' + REGEX_TYPE + '(?:\\s*,\\s*' + REGEX_TYPE + ')*)?'

const EXPRESSION_TYPES: Record<string, ExpressionType> = {
	c: {
		pattern: REGEX_CLASS,
		parse: (frame, match) => ({ ...frame, className: match }),
		format: (frame) => frame.className ?? '',
	},
	C: {
		pattern: REGEX_CLASS_SLASH,
		parse: (frame, match) => ({ ...frame, className: match?.replaceAll('/', '.') }),
		format: (frame) => frame.className?.replaceAll('.', '/') ?? '',
	},
	s: {
		pattern: REGEX_SOURCE_FILE,
		parse: (frame, match) => ({ ...frame, sourceFile: match }),
		format: (frame) => frame.sourceFile ?? '',
	},
	l: {
		pattern: REGEX_LINE_NUMBER,
		parse: (frame, match) => ({ ...frame, lineNumber: parseInt(match) }),
		format: (frame, buffer) => (buffer.charAt(buffer.length - 1) != ':' ? ':' : '') + frame.lineNumber ?? 0,
	},
	t: {
		pattern: REGEX_TYPE,
		parse: (frame, match) => ({ ...frame, type: match }),
		format: (frame) => frame.type ?? '',
	},
	f: {
		pattern: REGEX_MEMBER,
		parse: (frame, match) => ({ ...frame, fieldName: match }),
		format: (frame) => frame.fieldName ?? '',
	},
	m: {
		pattern: REGEX_MEMBER,
		parse: (frame, match) => ({ ...frame, methodName: match }),
		format: (frame) => frame.methodName ?? '',
	},
	a: {
		pattern: REGEX_ARGUMENTS,
		parse: (frame, match) => ({ ...frame, args: match }),
		format: (frame) => frame.args ?? '',
	},
}

export class FramePattern {
	private expressionTypes: string[] = []
	private pattern: RegExp

	constructor(expression: string) {
		let pattern = ''
		let index = 0
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const nextIndex = expression.indexOf('%', index)
			if (nextIndex < 0) {
				break
			}
			pattern += expression.substring(index, nextIndex)
			const type = expression.charAt(nextIndex + 1)
			const expressionType = EXPRESSION_TYPES[type]
			if (!expressionType) {
				throw new Error(`Invalid expression type '${type}', expected one of [cCsltfma]`)
			}
			pattern += `(${expressionType.pattern})`
			this.expressionTypes.push(type)
			index = nextIndex + 2
		}
		pattern += expression.substring(index)
		this.pattern = new RegExp(pattern, 'd')
	}

	parse(line: string): FrameInfo | undefined {
		const match = line.match(this.pattern)
		if (match === null) {
			return undefined
		}
		let frame: FrameInfo = {}
		this.expressionTypes.forEach((type, i) => {
			const group = match[i + 1]
			if (group !== undefined) {
				frame = EXPRESSION_TYPES[type].parse(frame, group)
			}
		})
		return frame
	}

	format(line: string, frame: FrameInfo): string | undefined {
		const match = line.match(this.pattern)
		if (match === null) {
			return undefined
		}
		let formatted = ''
		let index = 0
		this.expressionTypes.forEach((type, i) => {
			const range = match.indices?.[i + 1]
			if (range === undefined) return
			const [start, end] = range
			formatted += line.substring(index, start)
			const result = EXPRESSION_TYPES[type].format(frame, formatted)
			// console.log('Format', type, i, start, end, frame, '|', line.substring(start, end), '->', result)
			formatted += result
			index = end
		})
		formatted += line.substring(index)
		return formatted
	}
}
